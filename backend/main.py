from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import asyncio
import time
from dotenv import load_dotenv
from database import init_db, get_db_connection
from groq import Groq
import json
import re
import datetime
from blockchain import (
    record_report_on_chain,
    verify_report_on_chain,
    get_blockchain_status,
    compute_report_hash,
)

# Robustly load backend/.env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=env_path, override=True)
load_dotenv(override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    GROQ_API_KEY = GROQ_API_KEY.strip().strip('"').strip("'")
    if GROQ_API_KEY in ("your_groq_api_key_here", ""):
        GROQ_API_KEY = None

PRIMARY_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def get_groq_client():
    global GROQ_API_KEY, groq_client
    if not GROQ_API_KEY:
        load_dotenv(dotenv_path=env_path, override=True)
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if GROQ_API_KEY:
            GROQ_API_KEY = GROQ_API_KEY.strip().strip('"').strip("'")
            if GROQ_API_KEY in ("your_groq_api_key_here", ""):
                GROQ_API_KEY = None
    if GROQ_API_KEY and (groq_client is None or getattr(groq_client, "api_key", None) != GROQ_API_KEY):
        groq_client = Groq(api_key=GROQ_API_KEY)
    return groq_client

def clean_ai_response(content: str) -> str:
    if not content:
        return ""
    # Remove standard and malformed think tags
    cleaned = re.sub(r'<\s*think\s*>.*?</\s*think\s*>', '', content, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r'think>.*?</\s*think\s*>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r'<\s*think\s*>.*', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r'think>.*', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r'<\s*/\s*think\s*>', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def call_groq_chat(messages, temperature=0.7, max_tokens=800, response_format=None, timeout=30):
    client = get_groq_client()
    if not client:
        raise HTTPException(status_code=500, detail="Groq API Key not configured in backend/.env")

    # Groq on-demand tier enforces a 1000 OTPM (output tokens per minute) limit
    safe_max_tokens = min(max_tokens or 800, 850)

    models_to_try = [PRIMARY_MODEL] + [m for m in FALLBACK_MODELS if m != PRIMARY_MODEL]
    last_err = None

    for model_name in models_to_try:
        for attempt_tokens in [safe_max_tokens, 500]:
            try:
                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": attempt_tokens,
                    "timeout": timeout,
                }
                if response_format:
                    kwargs["response_format"] = response_format
                return client.chat.completions.create(**kwargs)
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if "429" in err_str and "tokens" in err_str and attempt_tokens > 500:
                    continue
                if "not found" in err_str or "does not exist" in err_str or "404" in err_str or "429" in err_str:
                    break
                raise e
    raise last_err

app = FastAPI(title="EduFocus AI")

cors_origins_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "EduFocus AI Backend API",
        "status": "online",
        "environment": "production" if os.getenv("RENDER") else "development",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "database": "connected"
    }

# Initialize database and migrations on startup and module load
init_db()

@app.on_event("startup")
def startup():
    init_db()

class LoginRequest(BaseModel):
    username: str

class DistractionEvent(BaseModel):
    user_id: int
    app_name: str
    duration: int
    focus_score_drop: int

class ChatRequest(BaseModel):
    user_id: int
    role: str
    message: str

@app.websocket("/ws/focus/{user_id}")
async def websocket_focus_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    conn = get_db_connection()
    user = conn.execute("SELECT focus_score FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        await websocket.close()
        conn.close()
        return

    current_score = user['focus_score']
    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (user_id,)).fetchall()
    await websocket.send_json({
        "current_focus_score": current_score,
        "recent_events": [dict(e) for e in events]
    })
    conn.close()
    
    last_recovery_time = time.time()
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=2.0)
                msg_type = data.get("type")
                
                if msg_type == "distraction":
                    app_name = data.get("distraction_type", "Unknown")
                    severity = data.get("severity", 1)
                    duration = data.get("duration", 0)
                    focus_score_drop = severity * 2
                    
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO events (user_id, app_name, duration, focus_score_drop) VALUES (?, ?, ?, ?)",
                        (user_id, app_name, duration, focus_score_drop)
                    )
                    current_score = max(0, current_score - focus_score_drop)
                    cursor.execute("UPDATE users SET focus_score = ? WHERE id = ?", (current_score, user_id))
                    conn.commit()
                    
                    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (user_id,)).fetchall()
                    conn.close()
                    
                    await websocket.send_json({
                        "current_focus_score": current_score,
                        "recent_events": [dict(e) for e in events],
                        "distraction_alert": True
                    })
                    last_recovery_time = time.time()
                    
                elif msg_type == "focused":
                    now = time.time()
                    if now - last_recovery_time >= 3.0 and current_score < 100:
                        current_score = min(100, current_score + 1)
                        conn = get_db_connection()
                        conn.execute("UPDATE users SET focus_score = ? WHERE id = ?", (current_score, user_id))
                        conn.commit()
                        conn.close()
                        
                        await websocket.send_json({
                            "current_focus_score": current_score,
                            "recovery": True
                        })
                        last_recovery_time = now
                        
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass

import datetime

def check_and_reset_daily(user_id: int, conn):
    today_str = datetime.date.today().isoformat()
    user = conn.execute("SELECT focus_score, last_reset_date FROM users WHERE id = ?", (user_id,)).fetchone()
    if user and user['last_reset_date'] and user['last_reset_date'] < today_str:
        yesterday_str = user['last_reset_date']
        # sum of events for that date
        events = conn.execute("SELECT duration FROM events WHERE user_id = ? AND date(timestamp) = ?", (user_id, yesterday_str)).fetchall()
        total_distractions = len(events)
        total_distraction_time = sum(e['duration'] for e in events)
        
        # Save to daily_history
        conn.execute(
            "INSERT INTO daily_history (user_id, date, final_focus_score, total_distractions, total_distraction_time) VALUES (?, ?, ?, ?, ?)",
            (user_id, yesterday_str, user['focus_score'], total_distractions, total_distraction_time)
        )
        
        # Reset score
        conn.execute("UPDATE users SET focus_score = 100, last_reset_date = ? WHERE id = ?", (today_str, user_id))
        conn.commit()

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    conn.close()
    if user:
        return dict(user)
    raise HTTPException(status_code=401, detail="User not found")

@app.get("/api/dashboard/{user_id}")
def get_dashboard(user_id: int):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user_id = user_id
    if user['role'] == 'parent' and user['child_name']:
        child = conn.execute("SELECT id FROM users WHERE name = ?", (user['child_name'],)).fetchone()
        if child:
            target_user_id = child['id']

    check_and_reset_daily(target_user_id, conn)
    
    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (target_user_id,)).fetchall()
    
    today_str = datetime.date.today().isoformat()
    today_events = conn.execute("SELECT duration FROM events WHERE user_id = ? AND date(timestamp) = ?", (target_user_id, today_str)).fetchall()
    today_distractions = len(today_events)
    today_distraction_time = sum(e['duration'] for e in today_events)
    
    target_user = conn.execute("SELECT focus_score FROM users WHERE id = ?", (target_user_id,)).fetchone()
    current_focus_score = target_user['focus_score'] if target_user else user['focus_score']
    
    conn.close()
    
    return {
        "user": dict(user),
        "current_focus_score": current_focus_score,
        "recent_events": [dict(e) for e in events],
        "today_distractions": today_distractions,
        "today_distraction_time": today_distraction_time
    }

@app.post("/api/simulation/distraction")
def record_distraction(event: DistractionEvent):
    conn = get_db_connection()
    check_and_reset_daily(event.user_id, conn)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO events (user_id, app_name, duration, focus_score_drop) VALUES (?, ?, ?, ?)",
        (event.user_id, event.app_name, event.duration, event.focus_score_drop)
    )
    user = cursor.execute("SELECT focus_score FROM users WHERE id = ?", (event.user_id,)).fetchone()
    if user:
        new_score = max(0, min(100, user['focus_score'] - event.focus_score_drop))
        cursor.execute("UPDATE users SET focus_score = ? WHERE id = ?", (new_score, event.user_id))
    conn.commit()
    conn.close()
    return {"message": "Distraction event recorded"}

@app.post("/api/ai/chat")
def ai_chat(req: ChatRequest):
    client = get_groq_client()
    if not client:
        raise HTTPException(status_code=500, detail="Groq API Key not configured in backend/.env")
        
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (req.user_id,)).fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user_id = user['id']
    child_info = ""
    if user['role'] == 'parent' and user['child_name']:
        child = conn.execute("SELECT * FROM users WHERE name = ?", (user['child_name'],)).fetchone()
        if child:
            target_user_id = child['id']
            child_info = f"Child Name: {child['name']}, Current Focus Score: {child['focus_score']}/100. "
    elif user['role'] == 'teacher':
        students = conn.execute("SELECT name, focus_score FROM users WHERE role = 'student'").fetchall()
        if students:
            child_info = "Classroom Students: " + ", ".join([f"{s['name']} (Score: {s['focus_score']}/100)" for s in students]) + ". "
    elif user['role'] == 'student':
        child_info = f"Current Focus Score: {user['focus_score']}/100. "

    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (target_user_id,)).fetchall()
    history = conn.execute("SELECT * FROM daily_history WHERE user_id = ? ORDER BY date DESC LIMIT 5", (target_user_id,)).fetchall()
    conn.close()
    
    # Rich context generation
    context_str = f"User Role: {user['role']}, Name: {user['name']}. {child_info}"
    if events:
        context_str += "Recent Distractions: " + ", ".join([f"{e['app_name']} for {e['duration']}s (-{e['focus_score_drop']} pts)" for e in events]) + ". "
    else:
        context_str += "No recent distractions recorded. Excellent focus! "
        
    if history:
        context_str += "Past Days Focus Scores: " + ", ".join([f"{h['date']}: {h['final_focus_score']}/100 ({h['total_distractions']} distractions)" for h in history]) + ". "

    system_prompt = f"""You are EduFocus AI, an intelligent educational focus assistant for a classroom focus application.
Your goal is to help Parents, Teachers, and Students understand student focus metrics, minimize distractions, and cultivate better study habits.
Context about the current user and student data:
{context_str}

Guidelines:
- Provide helpful, friendly, and constructive responses tailored to the user's role ({user['role']}).
- Reference the student's actual focus score and distraction history when relevant to the question.
- Suggest actionable strategies for improvement (e.g., Pomodoro technique, digital well-being habits, structured study breaks).
- Keep answers concise, encouraging, and easy to read."""

    try:
        completion = call_groq_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message}
            ],
            temperature=0.7,
            max_tokens=800,
            timeout=25,
        )
        reply = clean_ai_response(completion.choices[0].message.content or "")
        if not reply:
            raise Exception("Empty response received from AI model.")
        return {"reply": reply}
    except Exception as e:
        print("AI CHAT EXCEPTION:", repr(e))
        err_str = str(e).lower()
        if "401" in err_str:
            detail = "AI authentication failed (401). Please check the GROQ_API_KEY in backend/.env."
        elif "429" in err_str:
            detail = "AI service is currently busy (Rate Limit). Please try again shortly."
        elif "timeout" in err_str:
            detail = "AI request timed out. Please try again."
        else:
            detail = f"AI service error: {str(e)}"
        raise HTTPException(status_code=500, detail=detail)

@app.get("/api/insights/{user_id}")
def get_insights(user_id: int):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    target_user_id = user_id
    target_user = user
    if user['role'] == 'parent' and user['child_name']:
        child = conn.execute("SELECT * FROM users WHERE name = ?", (user['child_name'],)).fetchone()
        if child:
            target_user_id = child['id']
            target_user = child
    elif user['role'] == 'teacher' and user_id == 1:
        student = conn.execute("SELECT * FROM users WHERE role = 'student' LIMIT 1").fetchone()
        if student:
            target_user_id = student['id']
            target_user = student

    insight = conn.execute("SELECT * FROM insights WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1", (target_user_id,)).fetchone()
    if insight:
        conn.close()
        return dict(insight)

    # fallback if AI is not available
    fallback = {
        "summary": "AI is analyzing student focus patterns.",
        "behaviour_analysis": "Initial analysis in progress.",
        "parent_recommendation": "Encourage a consistent schedule and structured study breaks.",
        "teacher_recommendation": "Monitor classroom participation.",
        "student_motivation": "You can do this! Stay focused and take steady breaks.",
        "risk_level": "Low"
    }

    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (target_user_id,)).fetchall()
    
    if not get_groq_client():
        conn.close()
        return fallback

    distractions_list = ", ".join([f"{e['app_name']} for {e['duration']}s" for e in events]) if events else "None"
    
    prompt = f"Student {target_user['name']} has these recent distractions: {distractions_list}. Generate an analysis with the following fields: 'summary' (1 sentence), 'behaviour_analysis' (1 sentence), 'parent_recommendation' (1 sentence), 'teacher_recommendation' (1 sentence), 'student_motivation' (1 sentence), and 'risk_level' (Low, Medium, or High). Format strictly as JSON with exactly these 6 keys."
    
    try:
        completion = call_groq_chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300,
            response_format={"type": "json_object"},
            timeout=15,
        )
        content = clean_ai_response(completion.choices[0].message.content or "")
        res = json.loads(content)
        required_keys = ["summary", "behaviour_analysis", "parent_recommendation", "teacher_recommendation", "student_motivation", "risk_level"]
        if all(k in res for k in required_keys):
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO insights (user_id, summary, behaviour_analysis, parent_recommendation, teacher_recommendation, student_motivation, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (target_user_id, res['summary'], res['behaviour_analysis'], res['parent_recommendation'], res['teacher_recommendation'], res['student_motivation'], res['risk_level'])
            )
            conn.commit()
            
            new_insight = cursor.execute("SELECT * FROM insights WHERE id = last_insert_rowid()").fetchone()
            conn.close()
            return dict(new_insight) if new_insight else res
        else:
            conn.close()
            return fallback
    except Exception as e:
        print("INSIGHT EXCEPTION:", repr(e))
        conn.close()
        return fallback

@app.get("/api/reports/history/{user_id}")
def get_report_history(user_id: int):
    """
    Returns list of finalized focus reports with blockchain audit trail metadata.
    Resolves student if user is parent.
    """
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    target_user_id = user_id
    if user["role"] == "parent" and user["child_name"]:
        child = conn.execute("SELECT id FROM users WHERE name = ?", (user["child_name"],)).fetchone()
        if child:
            target_user_id = child["id"]
    elif user["role"] == "teacher" and user_id == 1:
        student = conn.execute("SELECT id FROM users WHERE role = 'student' LIMIT 1").fetchone()
        if student:
            target_user_id = student["id"]

    reports = conn.execute(
        "SELECT * FROM reports WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20",
        (target_user_id,)
    ).fetchall()
    conn.close()

    result = []
    updates = []
    for r in reports:
        item = dict(r)
        # Ensure older reports have blockchain anchors
        if not item.get("report_hash") and item.get("content"):
            anchor_meta = record_report_on_chain(item["id"], item["content"])
            item["report_hash"] = anchor_meta["report_hash"]
            item["blockchain_tx_id"] = anchor_meta["tx_hash"]
            item["block_number"] = anchor_meta["block_number"]
            item["network"] = anchor_meta["network"]
            updates.append((anchor_meta["report_hash"], anchor_meta["tx_hash"], anchor_meta["block_number"], anchor_meta["network"], item["id"]))
        result.append(item)

    if updates:
        conn2 = get_db_connection()
        conn2.executemany(
            "UPDATE reports SET report_hash = ?, blockchain_tx_id = ?, block_number = ?, network = ? WHERE id = ?",
            updates
        )
        conn2.commit()
        conn2.close()

    return result

@app.get("/api/reports/{report_type}/{user_id}")
def generate_report(report_type: str, user_id: int):
    client = get_groq_client()
    if not client:
        return {"report": "AI is disabled. Groq API Key is not configured in backend/.env."}

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user = user
    if user['role'] == 'parent' and user['child_name']:
        child = conn.execute("SELECT * FROM users WHERE name = ?", (user['child_name'],)).fetchone()
        if child:
            target_user = child
    elif user['role'] == 'teacher' and user_id == 1:
        student = conn.execute("SELECT * FROM users WHERE role = 'student' LIMIT 1").fetchone()
        if student:
            target_user = student

    student_id = target_user['id']
    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50", (student_id,)).fetchall()
    history = conn.execute("SELECT * FROM daily_history WHERE user_id = ? ORDER BY date DESC LIMIT 14", (student_id,)).fetchall()
    latest_insight = conn.execute("SELECT * FROM insights WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1", (student_id,)).fetchone()

    total_distractions = len(events)
    total_distraction_seconds = sum(e['duration'] for e in events)
    total_score_drop = sum(e['focus_score_drop'] for e in events)
    
    app_summary = {}
    for e in events:
        app = e['app_name']
        app_summary[app] = app_summary.get(app, 0) + e['duration']
    
    app_breakdown_str = ", ".join([f"{app}: {sec}s" for app, sec in app_summary.items()]) if app_summary else "No distractions logged today"
    
    if history:
        history_points = [f"{h['date']}: Focus {h['final_focus_score']}/100, {h['total_distractions']} distractions ({h['total_distraction_time']}s)" for h in history]
        avg_hist_score = round(sum(h['final_focus_score'] for h in history) / len(history), 1)
        history_str = "; ".join(history_points) + f". Historical Average Focus Score: {avg_hist_score}/100"
    else:
        history_str = "No prior daily history records."

    insight_str = ""
    if latest_insight:
        insight_str = f"- Latest AI Assessment: {latest_insight['summary']} (Risk Level: {latest_insight['risk_level']})"

    prompt = f"""Generate a comprehensive, professional {report_type.capitalize()} Focus & Productivity Report for student {target_user['name']}.

Student Analytics & Metrics:
- Student Name: {target_user['name']}
- Current Focus Score: {target_user['focus_score']}/100
- Total Distraction Events Logged: {total_distractions}
- Total Distraction Duration: {total_distraction_seconds} seconds ({round(total_distraction_seconds / 60, 1)} minutes)
- Total Focus Points Dropped: -{total_score_drop} pts
- Distraction Apps Breakdown: {app_breakdown_str}
- Historical Focus Analytics: {history_str}
{insight_str}

Please generate the report formatted strictly in clean Markdown with the following sections:
# 📊 {report_type.capitalize()} Focus & Productivity Report: {target_user['name']}
- **Date**: {datetime.date.today().isoformat()}
- **Student Name**: {target_user['name']}
- **Current Focus Score**: {target_user['focus_score']}/100

## 1. Executive Summary
(Clear, insightful summary of overall attention and focus performance)

## 2. Key Metrics & Focus Analytics
(A clean Markdown table comparing Current Focus Score, Distractions Count, Total Distracted Time, and Historical Trend)

## 3. Distraction Breakdown & Digital Habits
(Detailed analysis of applications causing focus drops and patterns)

## 4. Academic Subject Impact
(Evaluate impact on key subjects such as Mathematics and Science)

## 5. Actionable Recommendations
- **For Parents**: (Practical guidance to help at home)
- **For Teachers**: (Classroom support strategies)
- **For {target_user['name']}**: (Direct, encouraging tips and goals)

Tone: Professional, educational, analytical, and encouraging. Do not include internal thinking tags."""

    try:
        completion = call_groq_chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=850,
            timeout=35,
        )
        report_content = clean_ai_response(completion.choices[0].message.content or "")
        if not report_content:
            raise Exception("AI generated an empty report.")

        cursor = conn.cursor()
        cursor.execute("INSERT INTO reports (user_id, report_type, content) VALUES (?, ?, ?)", (student_id, report_type, report_content))
        report_id = cursor.lastrowid
        conn.commit()

        # Cryptographically anchor finalized report to the blockchain
        anchor_meta = record_report_on_chain(report_id, report_content)

        cursor.execute(
            "UPDATE reports SET report_hash = ?, blockchain_tx_id = ?, block_number = ?, network = ? WHERE id = ?",
            (anchor_meta["report_hash"], anchor_meta["tx_hash"], anchor_meta["block_number"], anchor_meta["network"], report_id)
        )
        conn.commit()
        conn.close()

        return {
            "report_id": report_id,
            "report": report_content,
            "report_hash": anchor_meta["report_hash"],
            "blockchain_tx_id": anchor_meta["tx_hash"],
            "block_number": anchor_meta["block_number"],
            "network": anchor_meta["network"],
            "verified": True
        }
    except Exception as e:
        conn.close()
        print("REPORT GENERATION EXCEPTION:", repr(e))
        return {"report": f"Error generating report: {str(e)}"}


@app.post("/api/blockchain/verify-report/{report_id}")
def verify_report_integrity(report_id: int):
    """
    Cryptographically verifies a report's integrity by recomputing its SHA-256 hash
    from database content and checking against the immutable blockchain anchor.
    """
    conn = get_db_connection()
    report = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    content = report["content"] or ""
    verification_result = verify_report_on_chain(report_id, content)

    # Attach report basic info
    verification_result["report_id"] = report_id
    verification_result["report_type"] = report["report_type"]
    verification_result["db_stored_hash"] = report["report_hash"]

    return verification_result

# Temporary in-memory cache to support live demo tampering and clean restoration
TAMPER_BACKUPS = {}

@app.post("/api/blockchain/simulate-tamper/{report_id}")
def simulate_report_tamper(report_id: int):
    """
    Demonstration endpoint: alters report content in the database to showcase
    blockchain tamper-detection in real time during a college presentation.
    """
    conn = get_db_connection()
    report = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()

    if not report:
        conn.close()
        raise HTTPException(status_code=404, detail="Report not found")

    original_content = report["content"]
    TAMPER_BACKUPS[report_id] = original_content

    # Inject unauthorized modification (e.g., claiming 100/100 perfect focus)
    tampered_content = original_content.replace("85/100", "100/100 ⭐ (ALTERED)")
    if tampered_content == original_content:
        tampered_content = original_content + "\n\n> ⚠️ [UNAUTHORIZED DATABASE EDIT]: Grade elevated to Perfect Score."

    conn.execute("UPDATE reports SET content = ? WHERE id = ?", (tampered_content, report_id))
    conn.commit()
    conn.close()

    new_hash = compute_report_hash(tampered_content)

    return {
        "status": "tampered",
        "report_id": report_id,
        "message": "Report database record was altered! Click 'Verify Integrity' on the dashboard to see blockchain tamper detection in action.",
        "original_hash": report["report_hash"],
        "tampered_hash": new_hash
    }

@app.post("/api/blockchain/restore-report/{report_id}")
def restore_tampered_report(report_id: int):
    """
    Restores the original report content from before the tampering demonstration.
    """
    if report_id not in TAMPER_BACKUPS:
        raise HTTPException(status_code=400, detail="No backup found to restore")

    original_content = TAMPER_BACKUPS[report_id]
    conn = get_db_connection()
    conn.execute("UPDATE reports SET content = ? WHERE id = ?", (original_content, report_id))
    conn.commit()
    conn.close()

    del TAMPER_BACKUPS[report_id]
    return {"status": "restored", "report_id": report_id, "message": "Original report content successfully restored."}

@app.get("/api/blockchain/status")
def blockchain_status():
    """Returns current blockchain node connectivity and contract deployment status."""
    return get_blockchain_status()

class MessageRequest(BaseModel):
    sender_id: int
    recipient_id: int
    content: str

@app.post("/api/messages")
def send_message(req: MessageRequest):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)",
        (req.sender_id, req.recipient_id, req.content)
    )
    conn.commit()
    conn.close()
    return {"message": "Message sent"}

@app.get("/api/messages/{user_id}")
def get_messages(user_id: int):
    conn = get_db_connection()
    messages = conn.execute(
        "SELECT messages.*, users.name as sender_name FROM messages JOIN users ON messages.sender_id = users.id WHERE recipient_id = ? ORDER BY timestamp DESC",
        (user_id,)
    ).fetchall()
    
    conn.execute("UPDATE messages SET is_read = 1 WHERE recipient_id = ? AND is_read = 0", (user_id,))
    conn.commit()
    conn.close()
    
    return [dict(m) for m in messages]

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)


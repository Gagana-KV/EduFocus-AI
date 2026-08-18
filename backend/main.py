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

load_dotenv()

app = FastAPI(title="EduFocus AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY == "your_groq_api_key_here":
    GROQ_API_KEY = None
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API Key not configured")
        
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (req.user_id,)).fetchone()
    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (req.user_id,)).fetchall()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Context generation
    context_str = f"User Role: {user['role']}, Name: {user['name']}. "
    if events:
        context_str += "Recent Distractions: " + ", ".join([f"{e['app_name']} for {e['duration']}s" for e in events])
    else:
        context_str += "No recent distractions. Good focus."
        
    system_prompt = f"""You are EduFocus AI, an AI assistant for a classroom focus application. 
Your primary goal is to help Parents, Teachers, and Students improve student focus and study habits.
Use the following context to answer questions appropriately:
{context_str}

Respond strictly as a helpful, concise AI assistant."""

    try:
        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message}
            ],
            temperature=0.7,
            max_tokens=1024,
            timeout=20,
        )
        reply = completion.choices[0].message.content
        if reply:
            import re
            # Remove closed <think>...</think> and think>...</think>
            reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL)
            reply = re.sub(r'think>.*?</think>', '', reply, flags=re.DOTALL)
            # Remove unclosed <think> or think> just in case it's still truncated
            reply = re.sub(r'<think>.*', '', reply, flags=re.DOTALL)
            reply = re.sub(r'think>.*', '', reply, flags=re.DOTALL)
            reply = reply.strip()
            
        if not reply:
            raise Exception("Empty response from AI.")
        return {"reply": reply}
    except Exception as e:
        print("AI EXCEPTION:", repr(e))
        err_str = str(e).lower()
        if "401" in err_str:
            detail = "AI authentication failed (401). Please check the API key."
        elif "429" in err_str:
            detail = "AI is currently busy (Rate Limit). Please try again later."
        elif "timeout" in err_str:
            detail = "AI request timed out. Please try again."
        else:
            detail = f"AI service error: {str(e)}"
        raise HTTPException(status_code=500, detail=detail)

@app.get("/api/insights/{user_id}")
def get_insights(user_id: int):
    conn = get_db_connection()
    user = conn.execute("SELECT role, child_name FROM users WHERE id = ?", (user_id,)).fetchone()
    target_user_id = user_id
    if user and user['role'] == 'parent' and user['child_name']:
        child = conn.execute("SELECT id FROM users WHERE name = ?", (user['child_name'],)).fetchone()
        if child:
            target_user_id = child['id']

    insight = conn.execute("SELECT * FROM insights WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1", (target_user_id,)).fetchone()
    
    if insight:
        conn.close()
        return dict(insight)

    # fallback
    fallback = {
        "summary": "AI is analyzing the focus patterns.",
        "behaviour_analysis": "Initial analysis in progress.",
        "parent_recommendation": "Encourage a consistent schedule.",
        "teacher_recommendation": "Monitor participation.",
        "student_motivation": "You can do this! Stay focused.",
        "risk_level": "Low"
    }

    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (target_user_id,)).fetchall()
    
    if not groq_client:
        conn.close()
        return fallback

    distractions_list = ", ".join([f"{e['app_name']} for {e['duration']}s" for e in events]) if events else "None"
    
    prompt = f"Student {user['name']} has these recent distractions: {distractions_list}. Generate an analysis with the following fields: 'summary' (1 sentence), 'behaviour_analysis' (1 sentence), 'parent_recommendation' (1 sentence), 'teacher_recommendation' (1 sentence), 'student_motivation' (1 sentence), and 'risk_level' (Low, Medium, or High). Format strictly as JSON with exactly these 6 keys."
    
    try:
        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=250,
            response_format={"type": "json_object"},
            timeout=10,
        )
        res = json.loads(completion.choices[0].message.content)
        required_keys = ["summary", "behaviour_analysis", "parent_recommendation", "teacher_recommendation", "student_motivation", "risk_level"]
        if all(k in res for k in required_keys):
            conn = get_db_connection()
            conn.execute(
                "INSERT INTO insights (user_id, summary, behaviour_analysis, parent_recommendation, teacher_recommendation, student_motivation, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, res['summary'], res['behaviour_analysis'], res['parent_recommendation'], res['teacher_recommendation'], res['student_motivation'], res['risk_level'])
            )
            conn.commit()
            
            new_insight = conn.execute("SELECT * FROM insights WHERE id = last_insert_rowid()").fetchone()
            conn.close()
            return dict(new_insight) if new_insight else res
        else:
            conn.close()
            return fallback
    except Exception as e:
        conn.close()
        return fallback

@app.get("/api/reports/{report_type}/{user_id}")
def generate_report(report_type: str, user_id: int):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    events = conn.execute("SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50", (user_id,)).fetchall()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    if not groq_client:
        conn.close()
        return {"report": "AI is disabled. Cannot generate report."}

    distractions_list = ", ".join([f"{e['app_name']} ({e['duration']}s)" for e in events]) if events else "None"
    
    prompt = f"Generate a {report_type} focus report for student {user['name']}. Current Focus Score: {user['focus_score']}/100. Distractions count: {len(events)}. List: {distractions_list}. Include Focus Score, Distractions, Subjects (assume Math/Science), AI Summary, and Recommendations. Write encouraging but constructive feedback in Markdown."
    
    try:
        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1500,
            timeout=25,
        )
        report_content = completion.choices[0].message.content
        if report_content:
            import re
            
            # 1. Remove the entire <think>...</think> block including its content.
            report_content = re.sub(r'<\s*think\s*>.*?</\s*think\s*>', '', report_content, flags=re.DOTALL | re.IGNORECASE)
            
            # 2. In case there is an unclosed <think> tag, remove it and its content so it doesn't leak.
            report_content = re.sub(r'<\s*think\s*>.*', '', report_content, flags=re.DOTALL | re.IGNORECASE)
            report_content = re.sub(r'<\s*/\s*think\s*>', '', report_content, flags=re.IGNORECASE)
            
            # 3. Remove any remaining "Thinking Process:" or "Reasoning:" sections
            lower_content = report_content.lower()
            if 'thinking process:' in lower_content or 'reasoning:' in lower_content:
                match = re.search(r'(^#.*$|\*\*Focus Score\*\*|^Focus Score:)', report_content, flags=re.MULTILINE | re.IGNORECASE)
                if match:
                    report_content = report_content[match.start():]
            
            report_content = report_content.strip()

        conn.execute("INSERT INTO reports (user_id, report_type, content) VALUES (?, ?, ?)", (user_id, report_type, report_content))
        conn.commit()
        conn.close()
        return {"report": report_content}
    except Exception as e:
        conn.close()
        return {"report": f"Error generating report: {str(e)}"}

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

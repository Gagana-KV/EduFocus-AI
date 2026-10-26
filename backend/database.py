import os
import sqlite3
import json
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "edufocus.db"))
os.makedirs(os.path.dirname(os.path.abspath(DB_FILE)), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            child_name TEXT,
            photo_url TEXT,
            focus_score INTEGER DEFAULT 100,
            last_reset_date TEXT DEFAULT (date('now', 'localtime'))
        )
    """)

    # Migration: Ensure last_reset_date exists if users table was already created
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]
    if "last_reset_date" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN last_reset_date TEXT")
        cursor.execute("UPDATE users SET last_reset_date = date('now', 'localtime') WHERE last_reset_date IS NULL")

    # Daily History Table for historical focus tracking and daily reset
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            final_focus_score INTEGER NOT NULL,
            total_distractions INTEGER DEFAULT 0,
            total_distraction_time INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, date)
        )
    """)

    # Events Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            app_name TEXT,
            duration INTEGER,
            focus_score_drop INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Messages Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER,
            recipient_id INTEGER,
            content TEXT,
            is_read BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (recipient_id) REFERENCES users (id)
        )
    """)

    # Insights Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            summary TEXT,
            behaviour_analysis TEXT,
            parent_recommendation TEXT,
            teacher_recommendation TEXT,
            student_motivation TEXT,
            risk_level TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Reports Table (with Blockchain Verification fields)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            report_type TEXT,
            content TEXT,
            report_hash TEXT,
            blockchain_tx_id TEXT,
            block_number INTEGER,
            network TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Migration: Ensure blockchain columns exist in existing reports table
    cursor.execute("PRAGMA table_info(reports)")
    report_columns = [col[1] for col in cursor.fetchall()]
    if "report_hash" not in report_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN report_hash TEXT")
    if "blockchain_tx_id" not in report_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN blockchain_tx_id TEXT")
    if "block_number" not in report_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN block_number INTEGER")
    if "network" not in report_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN network TEXT")

    # Cryptographic Ledger Table for Local Blockchain Demonstration Fallback
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS blockchain_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER UNIQUE,
            report_hash TEXT NOT NULL,
            tx_hash TEXT NOT NULL,
            block_number INTEGER NOT NULL,
            network TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Initial Data
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, role, name, last_reset_date) VALUES (?, ?, ?, date('now', 'localtime'))", ("teacher1", "teacher", "Mr. Smith"))
        cursor.execute("INSERT INTO users (username, role, name, child_name, last_reset_date) VALUES (?, ?, ?, ?, date('now', 'localtime'))", ("parent1", "parent", "Alice Johnson", "Bobby Johnson"))
        cursor.execute("INSERT INTO users (username, role, name, last_reset_date) VALUES (?, ?, ?, date('now', 'localtime'))", ("student1", "student", "Bobby Johnson"))
        conn.commit()

    # Ensure last_reset_date is set for all users
    cursor.execute("UPDATE users SET last_reset_date = date('now', 'localtime') WHERE last_reset_date IS NULL")

    # Seed sample daily_history for Bobby Johnson (student ID 3) if empty
    cursor.execute("SELECT COUNT(*) FROM daily_history WHERE user_id = 3")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT OR IGNORE INTO daily_history (user_id, date, final_focus_score, total_distractions, total_distraction_time) VALUES 
            (3, date('now', '-4 days', 'localtime'), 92, 1, 300),
            (3, date('now', '-3 days', 'localtime'), 85, 3, 900),
            (3, date('now', '-2 days', 'localtime'), 78, 4, 1200),
            (3, date('now', '-1 day', 'localtime'), 88, 2, 600)
        """)
        conn.commit()

    # Seed sample events if empty (e.g. fresh cloud instance)
    cursor.execute("SELECT COUNT(*) FROM events WHERE user_id = 3")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO events (user_id, app_name, duration, focus_score_drop) VALUES (3, 'Instagram', 600, 10)")
        cursor.execute("INSERT INTO events (user_id, app_name, duration, focus_score_drop) VALUES (3, 'YouTube Shorts', 300, 5)")
        cursor.execute("UPDATE users SET focus_score = 85 WHERE id = 3")
        conn.commit()

    # Seed baseline report and blockchain ledger anchor if empty
    cursor.execute("SELECT COUNT(*) FROM reports WHERE user_id = 3")
    if cursor.fetchone()[0] == 0:
        sample_report = "# 📊 Baseline Focus & Productivity Report: Bobby Johnson\n\n- **Date**: Baseline Evaluation\n- **Student Name**: Bobby Johnson\n- **Current Focus Score**: 85/100\n\n## 1. Executive Summary\nBobby Johnson shows high academic engagement in Mathematics (92%) and Science (85%). Distraction events are largely confined to short social media breaks.\n\n## 2. Actionable Recommendations\n- **For Parents**: Structure 25-minute study intervals followed by 5-minute offline rest breaks.\n- **For Teachers**: Encourage interactive problem-solving during history and afternoon sessions.\n- **For Bobby**: Use airplane mode on mobile devices during focused study hours."
        sample_hash = "0x" + hashlib.sha256(sample_report.encode("utf-8")).hexdigest()
        cursor.execute(
            "INSERT INTO reports (user_id, report_type, content, report_hash, blockchain_tx_id, block_number, network) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (3, "daily", sample_report, sample_hash, "0x7e40ade8858865f92baced54b36d2d63c78406675d0489453efe93d077419b10", 1001, "Local Devnet Anchor")
        )
        rep_id = cursor.lastrowid
        cursor.execute(
            "INSERT OR IGNORE INTO blockchain_ledger (report_id, report_hash, tx_hash, block_number, network) VALUES (?, ?, ?, ?, ?)",
            (rep_id, sample_hash, "0x7e40ade8858865f92baced54b36d2d63c78406675d0489453efe93d077419b10", 1001, "Local Devnet Anchor")
        )
        conn.commit()

    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

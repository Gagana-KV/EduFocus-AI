import sqlite3

def migrate():
    conn = sqlite3.connect("edufocus.db")
    cursor = conn.cursor()
    
    # Try adding last_reset_date to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_reset_date DATE DEFAULT (date('now', 'localtime'))")
        print("Added last_reset_date to users.")
    except sqlite3.OperationalError as e:
        print(f"Column might already exist: {e}")
        
    # Create daily_history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date DATE,
            final_focus_score INTEGER,
            total_distractions INTEGER,
            total_distraction_time INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    print("Created daily_history table.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()

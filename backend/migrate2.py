import sqlite3

def migrate():
    conn = sqlite3.connect("edufocus.db")
    cursor = conn.cursor()
    
    # Try adding last_reset_date to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_reset_date DATE DEFAULT '2020-01-01'")
        print("Added last_reset_date to users.")
        
        # update all existing users to have current date
        import datetime
        today_str = datetime.date.today().isoformat()
        cursor.execute("UPDATE users SET last_reset_date = ?", (today_str,))
        
    except sqlite3.OperationalError as e:
        print(f"Column might already exist: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()

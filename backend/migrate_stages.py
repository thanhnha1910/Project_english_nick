import sqlite3

DB_PATH = "english_learning.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("Checking if 'type' column exists in 'stages' table...")
        cursor.execute("PRAGMA table_info(stages)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'type' not in columns:
            print("Adding 'type' column...")
            cursor.execute("ALTER TABLE stages ADD COLUMN type VARCHAR(50) DEFAULT 'mixed'")
            
            # Optional: Update existing listening stages to 'listening' based on heuristic?
            # For now, default is 'mixed', user can update manually or we can update all to 'listening' if appropriate?
            # Let's set 'Vocabulary' ones to 'vocabulary' if they have words? 
            # Actually, better to just default to 'mixed' to be safe.
            
            conn.commit()
            print("Migration successful: Added 'type' column.")
        else:
            print("Column 'type' already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

#!/usr/bin/env python3
"""
Migrate SQLite data → Render PostgreSQL.
Usage: 
  1. Get DATABASE_URL from Render dashboard (web service → Environment)
  2. Run: DATABASE_URL="postgres://..." python migrate_data.py
"""
import os
import sys
import sqlite3
import json

# Check DATABASE_URL
DB_URL = os.environ.get('DATABASE_URL', '')
if not DB_URL or 'sqlite' in DB_URL:
    print("❌ Set DATABASE_URL env var to your Render PostgreSQL URL")
    print('   Example: DATABASE_URL="postgres://user:pass@host/db" python migrate_data.py')
    sys.exit(1)

if DB_URL.startswith('postgres://'):
    DB_URL = DB_URL.replace('postgres://', 'postgresql://', 1)

# Connect SQLite (local)
SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'backend', 'english_learning.db')
if not os.path.exists(SQLITE_PATH):
    print(f"❌ SQLite DB not found: {SQLITE_PATH}")
    sys.exit(1)

print(f"📂 Reading from: {SQLITE_PATH}")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row

# Connect PostgreSQL (Render)
try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ Install psycopg2: pip install psycopg2-binary")
    sys.exit(1)

print(f"🔗 Connecting to PostgreSQL...")
pg_conn = psycopg2.connect(DB_URL)
pg_cursor = pg_conn.cursor()

def get_sqlite_tables():
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
    return [r[0] for r in cursor.fetchall()]

def get_table_data(table):
    cursor = sqlite_conn.cursor()
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    if not rows:
        return [], []
    columns = [desc[0] for desc in cursor.description]
    return columns, [tuple(row) for row in rows]

def migrate_table(table):
    columns, rows = get_table_data(table)
    if not rows:
        print(f"  ⏭  {table}: empty, skipping")
        return 0
    
    # Create INSERT query with ON CONFLICT DO NOTHING
    cols_str = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))
    
    # Clear existing data
    pg_cursor.execute(f"DELETE FROM {table}")
    
    # Insert rows
    query = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})"
    inserted = 0
    for row in rows:
        try:
            pg_cursor.execute(query, row)
            inserted += 1
        except Exception as e:
            print(f"  ⚠️  Skip row in {table}: {e}")
            pg_conn.rollback()
            continue
    
    pg_conn.commit()
    print(f"  ✅ {table}: {inserted}/{len(rows)} rows migrated")
    return inserted

# First, create tables on PostgreSQL (via SQLAlchemy)
print("🔨 Creating tables on PostgreSQL...")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ['DATABASE_URL'] = DB_URL

from sqlalchemy import create_engine
from models import Base
pg_engine = create_engine(DB_URL)
Base.metadata.create_all(pg_engine)
print("  ✅ Tables created")

# Migrate each table
print("\n📦 Migrating data...")
tables = get_sqlite_tables()
total = 0
for table in tables:
    count = migrate_table(table)
    total += count

# Reset sequences for auto-increment
print("\n🔧 Resetting sequences...")
for table in tables:
    try:
        pg_cursor.execute(f"SELECT MAX(id) FROM {table}")
        max_id = pg_cursor.fetchone()[0]
        if max_id:
            pg_cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), {max_id})")
            pg_conn.commit()
    except Exception:
        pg_conn.rollback()

print(f"\n🎉 Migration complete! {total} total rows migrated.")
print("   Your data is now on Render PostgreSQL.")

sqlite_conn.close()
pg_conn.close()

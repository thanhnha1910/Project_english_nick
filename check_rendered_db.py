from sqlalchemy import create_engine
import psycopg2

DATABASE_URL = "postgresql://nha:CcxpQEvuiJPPV1gFmUFxKTr9XziSehdR@dpg-d7d1ldv7f7vs73enoi6g-a.oregon-postgres.render.com/english_learning_we78"

# Connect directly to the Render Postgres DB
try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        from sqlalchemy import text
        stages_count = connection.execute(text("SELECT COUNT(*) FROM stages")).fetchone()[0]
        audios_count = connection.execute(text("SELECT COUNT(*) FROM audios")).fetchone()[0]
        
        print("✅ KẾT NỐI DATABASE RENDER THÀNH CÔNG!")
        print(f"📊 Số lượng bài học (stages) đang có: {stages_count}")
        print(f"🎵 Số lượng file âm thanh (audios) đang có: {audios_count}")
except Exception as e:
    print(f"❌ Lỗi: {e}")

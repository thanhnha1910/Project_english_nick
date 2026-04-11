import urllib.parse
from sqlalchemy import create_engine
DB_URL="postgresql://nha:CcxpQEvuiJPPV1gFmUFxKTr9XziSehdR@dpg-d7d1ldv7f7vs73enoi6g-a.oregon-postgres.render.com/english_learning_we78"
engine = create_engine(DB_URL)
with engine.connect() as conn:
    result = conn.execute("SELECT count(*) FROM stages")
    print(f"Prod Stages: {result.scalar()}")
    result = conn.execute("SELECT count(*) FROM audios")
    print(f"Prod Audios: {result.scalar()}")

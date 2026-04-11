from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Audio, Word, Stage

SQLALCHEMY_DATABASE_URL = "sqlite:///./english_learning.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

stage_id = 2 # Tiếng anh 41-70
stage = db.query(Stage).filter(Stage.id == stage_id).first()
if stage:
    print(f"Stage: {stage.name}")
    audio_count = db.query(Audio).filter(Audio.stage_id == stage_id).count()
    word_count = db.query(Word).filter(Word.stage_id == stage_id).count()
    print(f"- Audios: {audio_count}")
    print(f"- Words: {word_count}")
    
    # List a few examples
    audios = db.query(Audio).filter(Audio.stage_id == stage_id).limit(3).all()
    for a in audios:
        print(f"  Audio: {a.title} - {a.transcript}")
        
    words = db.query(Word).filter(Word.stage_id == stage_id).limit(3).all()
    for w in words:
        print(f"  Word: {w.text} - {w.meaning}")
else:
    print(f"Stage {stage_id} not found")

db.close()

from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database: PostgreSQL on Render, SQLite locally
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./english_learning.db')
# Render uses postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency để lấy DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Stage(Base):
    """Giai đoạn học - ví dụ: Beginner, Intermediate, Advanced"""
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    order = Column(Integer, default=0)
    # vocabulary, listening, mixed, speaking
    type = Column(String(50), default="mixed")
    created_at = Column(DateTime, default=datetime.utcnow)

    audios = relationship("Audio", back_populates="stage")
    questions = relationship("Question", back_populates="stage")
    words = relationship("Word", back_populates="stage")


class Audio(Base):
    """File audio với transcript"""
    __tablename__ = "audios"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=False)
    transcript = Column(Text)  # Nội dung text của audio
    duration = Column(Integer)  # Thời lượng (giây)
    stage_id = Column(Integer, ForeignKey("stages.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    stage = relationship("Stage", back_populates="audios")


class Question(Base):
    """Câu hỏi speaking practice"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    sample_answer = Column(Text)
    stage_id = Column(Integer, ForeignKey("stages.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    stage = relationship("Stage", back_populates="questions")


class Word(Base):
    """Từ vựng để học - với FSRS spaced repetition"""
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(200), nullable=False)
    meaning = Column(String(500), nullable=False)
    example = Column(Text)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # FSRS Spaced Repetition fields
    fsrs_state = Column(Integer, default=0)          # 0=New, 1=Learning, 2=Review, 3=Relearning
    fsrs_step = Column(Integer, default=0)            # Current learning/relearning step index
    fsrs_stability = Column(Float, default=0.0)       # Memory stability (higher = more stable)
    fsrs_difficulty = Column(Float, default=0.0)       # Card difficulty (higher = harder)
    fsrs_due = Column(DateTime, nullable=True)         # When next review is due
    fsrs_last_review = Column(DateTime, nullable=True) # When last reviewed
    fsrs_reps = Column(Integer, default=0)             # Total review count
    fsrs_lapses = Column(Integer, default=0)           # Times forgotten (leech detection at 8+)

    stage = relationship("Stage", back_populates="words")


class SpeakingRecord(Base):
    """Bản ghi âm của người dùng"""
    __tablename__ = "speaking_records"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    audio_path = Column(String(500))
    transcript = Column(Text)  # Kết quả speech-to-text
    score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


# Tạo tất cả tables
def init_db():
    Base.metadata.create_all(bind=engine)

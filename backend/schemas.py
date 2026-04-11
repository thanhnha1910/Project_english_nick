from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ============ Stage Schemas ============
class StageBase(BaseModel):
    name: str
    description: Optional[str] = None
    order: Optional[int] = 0
    type: Optional[str] = "mixed"


class StageCreate(StageBase):
    pass


class StageResponse(StageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Audio Schemas ============
class AudioBase(BaseModel):
    title: str
    transcript: Optional[str] = None
    duration: Optional[int] = None
    stage_id: Optional[int] = None


class AudioCreate(AudioBase):
    file_path: str


class AudioResponse(AudioBase):
    id: int
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class AudioWithStage(AudioResponse):
    stage: Optional[StageResponse] = None


# ============ Transcript Shuffle ============
class TranscriptLine(BaseModel):
    index: int
    text: str
    original_index: int  # Vị trí gốc trước khi shuffle


class ShuffledTranscript(BaseModel):
    audio_id: int
    audio_title: str
    lines: List[TranscriptLine]
    total_lines: int


# ============ Question Schemas ============
class QuestionBase(BaseModel):
    question_text: str
    sample_answer: Optional[str] = None
    stage_id: Optional[int] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionResponse(QuestionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Bulk Import ============
class BulkImportResult(BaseModel):
    total_files: int
    imported: int
    failed: int
    errors: List[str]
    imported_ids: List[int] = []  # Trả về danh sách ID đã import


# ============ N8N Webhook ============
class TranscriptUpdate(BaseModel):
    """Schema cho n8n gửi transcript"""
    audio_id: int
    transcript: str

# ============ Word Schemas ============
class WordBase(BaseModel):
    text: str
    meaning: str
    example: Optional[str] = None
    stage_id: Optional[int] = None


class WordCreate(WordBase):
    pass


class WordResponse(WordBase):
    id: int
    created_at: datetime
    # FSRS fields
    fsrs_state: int = 0
    fsrs_stability: float = 0.0
    fsrs_difficulty: float = 0.0
    fsrs_due: Optional[datetime] = None
    fsrs_last_review: Optional[datetime] = None
    fsrs_reps: int = 0
    fsrs_lapses: int = 0

    class Config:
        from_attributes = True


class WordImport(BaseModel):
    words: List[WordCreate]


# ============ FSRS Review Schemas ============
class WordReviewItem(BaseModel):
    word_id: int
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy

class BatchReviewRequest(BaseModel):
    reviews: List[WordReviewItem]

class ReviewResultItem(BaseModel):
    word_id: int
    text: str
    new_state: int
    next_due: Optional[datetime] = None
    interval_days: float

class BatchReviewResponse(BaseModel):
    results: List[ReviewResultItem]
    summary: dict

class VocabStatsResponse(BaseModel):
    total: int
    new: int
    learning: int
    review: int
    relearning: int
    due_today: int
    mature: int  # interval > 21 days
    leeches: int  # lapses >= 8

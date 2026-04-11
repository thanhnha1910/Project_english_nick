from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import aiofiles

from models import get_db, Question, SpeakingRecord, Audio
from schemas import QuestionCreate, QuestionResponse
from datetime import datetime

router = APIRouter(prefix="/api/speaking", tags=["speaking"])

RECORDINGS_DIR = "static/recordings"


@router.get("/questions", response_model=List[QuestionResponse])
def get_all_questions(
    stage_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách câu hỏi"""
    query = db.query(Question)
    if stage_id:
        query = query.filter(Question.stage_id == stage_id)
    return query.all()


@router.get("/questions/random", response_model=QuestionResponse)
def get_random_question(
    stage_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lấy câu hỏi ngẫu nhiên. Nếu không có câu hỏi ở mục Luyện Nói, sẽ tự lấy các câu trong Audio Transcript làm câu hỏi thay thế."""
    import random
    query = db.query(Question)
    if stage_id:
        query = query.filter(Question.stage_id == stage_id)
    
    questions = query.all()
    if not questions:
        # Fallback: Find audios for the stage and extract transcript sentences
        audio_query = db.query(Audio)
        if stage_id:
            audio_query = audio_query.filter(Audio.stage_id == stage_id)
        audios = audio_query.all()
        
        sentences = []
        for audio in audios:
            if audio.transcript:
                # Split by dot, newline, or multiple spaces to get sentences
                import re
                parts = re.split(r'[.\n]', audio.transcript)
                for part in parts:
                    part = part.strip()
                    # Filter out short or completely digit strings (e.g., sequence numbers)
                    if len(part) > 5 and not bool(re.match(r'^[\d\W]+$', part)):
                        sentences.append(part)
        
        if sentences:
            random_sentence = random.choice(sentences)
            return QuestionResponse(
                id=999999, # Dummy ID for fallback
                question_text=random_sentence,
                sample_answer=None,
                created_at=datetime.utcnow()
            )
            
        raise HTTPException(status_code=404, detail="Không có câu hỏi nào và cũng không có audio transcript để luyện tập.")
    
    return random.choice(questions)


@router.post("/questions", response_model=QuestionResponse)
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """Tạo câu hỏi mới"""
    db_question = Question(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.post("/submit")
async def submit_recording(
    question_id: int = Form(...),
    file: UploadFile = File(...)
):
    """Submit bản ghi âm của người dùng"""
    db = next(get_db())
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    
    # Lưu file recording
    file_path = os.path.join(RECORDINGS_DIR, f"recording_{question_id}_{file.filename}")
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Tạo record
    record = SpeakingRecord(
        question_id=question_id,
        audio_path=file_path
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return {
        "id": record.id,
        "question_id": question_id,
        "audio_path": file_path,
        "message": "Recording submitted successfully"
    }


@router.get("/records")
def get_all_records(db: Session = Depends(get_db)):
    """Lấy tất cả bản ghi âm"""
    records = db.query(SpeakingRecord).all()
    return records


# ============ N8N SPEAKING ANALYSIS ============
import httpx
import base64

N8N_BASE_URL = "https://n8n-nick.abapi.dev/webhook"  # URL n8n của bạn


@router.post("/analyze")
async def analyze_speaking(
    file: UploadFile = File(...),
    reference_text: str = Form(None),
    language: str = Form("en")
):
    """
    Gửi audio lên n8n workflow để phân tích speaking
    Trả về jobId để frontend polling
    """
    try:
        # Đọc audio và convert sang base64
        audio_content = await file.read()
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        
        # Gọi n8n webhook
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{N8N_BASE_URL}/speaking-start",
                json={
                    "audio": audio_base64,
                    "referenceText": reference_text or "",
                    "language": language
                }
            )
            response.raise_for_status()
            data = response.json()
            
        return {
            "success": True,
            "jobId": data.get("jobId"),
            "message": "Analysis started"
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error calling n8n: {str(e)}")


@router.get("/analyze/status/{job_id}")
async def get_analysis_status(job_id: str):
    """
    Polling endpoint - kiểm tra status của analysis job
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{N8N_BASE_URL}/speaking-status",
                params={"jobId": job_id}
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")

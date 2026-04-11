from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import random
import shutil
import aiofiles

from models import get_db, Audio, Stage
from schemas import (
    AudioResponse, AudioCreate, AudioWithStage,
    ShuffledTranscript, TranscriptLine, BulkImportResult,
    TranscriptUpdate
)

router = APIRouter(prefix="/api/audios", tags=["audios"])

AUDIO_DIR = "static/audio"


@router.get("/", response_model=List[AudioResponse])
def get_all_audios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lấy tất cả audio"""
    audios = db.query(Audio).offset(skip).limit(limit).all()
    return audios


@router.get("/stage/{stage_id}", response_model=List[AudioResponse])
def get_audios_by_stage(stage_id: int, db: Session = Depends(get_db)):
    """Lấy audio theo giai đoạn"""
    audios = db.query(Audio).filter(Audio.stage_id == stage_id).all()
    return audios


@router.get("/random", response_model=List[AudioResponse])
def get_random_audios(
    count: int = 10,
    stage_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db)
):
    """Lấy audio ngẫu nhiên"""
    query = db.query(Audio)
    if stage_ids:
        query = query.filter(Audio.stage_id.in_(stage_ids))
    
    audios = query.all()
    random.shuffle(audios)
    return audios[:count]


@router.get("/{audio_id}", response_model=AudioWithStage)
def get_audio(audio_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết audio"""
    audio = db.query(Audio).filter(Audio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    return audio


@router.get("/{audio_id}/transcript")
def get_transcript(audio_id: int, db: Session = Depends(get_db)):
    """Lấy transcript của audio"""
    audio = db.query(Audio).filter(Audio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"audio_id": audio_id, "title": audio.title, "transcript": audio.transcript}


@router.get("/{audio_id}/transcript/shuffle", response_model=ShuffledTranscript)
def get_shuffled_transcript(audio_id: int, db: Session = Depends(get_db)):
    """Trộn câu trong transcript để ôn tập"""
    audio = db.query(Audio).filter(Audio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    if not audio.transcript:
        raise HTTPException(status_code=400, detail="Audio không có transcript")
    
    # Tách transcript thành các câu
    sentences = [s.strip() for s in audio.transcript.split('.') if s.strip()]
    
    # Tạo list với index gốc
    indexed_sentences = [(i, s) for i, s in enumerate(sentences)]
    random.shuffle(indexed_sentences)
    
    lines = [
        TranscriptLine(index=new_idx, text=text, original_index=orig_idx)
        for new_idx, (orig_idx, text) in enumerate(indexed_sentences)
    ]
    
    return ShuffledTranscript(
        audio_id=audio_id,
        audio_title=audio.title,
        lines=lines,
        total_lines=len(lines)
    )


@router.post("/", response_model=AudioResponse)
async def upload_audio(
    title: str = Form(...),
    transcript: Optional[str] = Form(None),
    stage_id: Optional[int] = Form(None),
    file: UploadFile = File(...)
):
    """Upload một audio file"""
    db = next(get_db())
    
    # Tạo folder nếu chưa có
    os.makedirs(AUDIO_DIR, exist_ok=True)
    
    # Lưu file
    file_path = os.path.join(AUDIO_DIR, file.filename)
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Tạo record trong DB
    audio = Audio(
        title=title,
        file_path=file_path,
        transcript=transcript,
        stage_id=stage_id
    )
    db.add(audio)
    db.commit()
    db.refresh(audio)
    
    return audio


@router.post("/bulk-import", response_model=BulkImportResult)
async def bulk_import_audios(
    stage_id: Optional[int] = Form(None),
    transcripts: Optional[str] = Form(None),
    files: List[UploadFile] = File(...)
):
    """Import nhiều audio files cùng lúc - SẮP XẾP THEO THỨ TỰ TÊN FILE, kèm transcript"""
    import re
    import json
    
    db = next(get_db())
    os.makedirs(AUDIO_DIR, exist_ok=True)
    
    imported = 0
    failed = 0
    errors = []
    imported_ids = []
    
    # Parse transcripts
    transcript_list = []
    if transcripts:
        try:
            transcript_list = json.loads(transcripts)
        except Exception as e:
            print(f"Error parsing transcripts JSON: {e}")
    
    # Natural sort function (1, 2, 10 thay vì 1, 10, 2)
    def natural_sort_key(file):
        return [int(c) if c.isdigit() else c.lower() 
                for c in re.split(r'(\d+)', file.filename)]
    
    # Sort files theo thứ tự tự nhiên
    sorted_files = sorted(files, key=natural_sort_key)
    
    for idx, file in enumerate(sorted_files):
        try:
            # Chỉ chấp nhận audio files
            if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.ogg', '.webm')):
                errors.append(f"{file.filename}: Không phải file audio")
                failed += 1
                continue
            
            file_path = os.path.join(AUDIO_DIR, file.filename)
            
            async with aiofiles.open(file_path, 'wb') as out_file:
                content = await file.read()
                await out_file.write(content)
            
            # Tự động lấy title từ tên file
            title = os.path.splitext(file.filename)[0]
            
            # Khớp transcript theo index
            transcript_text = None
            if idx < len(transcript_list):
                transcript_text = transcript_list[idx]
            
            audio = Audio(
                title=title,
                file_path=file_path,
                transcript=transcript_text,
                stage_id=stage_id
            )
            db.add(audio)
            db.flush()  # Để lấy ID
            imported_ids.append(audio.id)
            imported += 1
            
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
            failed += 1
    
    db.commit()
    
    return BulkImportResult(
        total_files=len(files),
        imported=imported,
        failed=failed,
        errors=errors,
        imported_ids=imported_ids
    )


class BulkUpdateTranscriptsRequest(BaseModel):
    stage_id: int
    transcripts: List[str]

@router.post("/bulk-update-transcripts")
def bulk_update_transcripts(
    request: BulkUpdateTranscriptsRequest,
    db: Session = Depends(get_db)
):
    """
    Cập nhật transcript hàng loạt cho các audio trong một giai đoạn
    Thứ tự transcript sẽ được map với thứ tự audio (được sort theo tên file tự nhiên)
    """
    import re
    
    # Lấy tất cả audio của stage này
    audios = db.query(Audio).filter(Audio.stage_id == request.stage_id).all()
    
    if not audios:
        raise HTTPException(status_code=404, detail="Không tìm thấy audio nào trong giai đoạn này")
    
    # Sort audios theo thứ tự tự nhiên của title/filename giống lúc import
    def natural_sort_key(audio):
        return [int(c) if c.isdigit() else c.lower() 
                for c in re.split(r'(\d+)', audio.title)]
    
    sorted_audios = sorted(audios, key=natural_sort_key)
    
    updated_count = 0
    
    # Cập nhật transcript theo index
    for idx, audio in enumerate(sorted_audios):
        if idx < len(request.transcripts):
            audio.transcript = request.transcripts[idx]
            updated_count += 1
            
    db.commit()
    
    return {
        "message": f"Đã cập nhật thành công {updated_count} transcript",
        "total_audios": len(sorted_audios),
        "updated_count": updated_count
    }


# ============ N8N WEBHOOK ENDPOINTS ============

@router.put("/{audio_id}/transcript")
def update_transcript(
    audio_id: int,
    transcript: str,
    db: Session = Depends(get_db)
):
    """
    Cập nhật transcript cho audio - dùng cho n8n webhook
    
    n8n workflow:
    1. Gọi GET /api/audios để lấy danh sách audio chưa có transcript
    2. Với mỗi audio, gọi OpenAI Whisper hoặc GPT để tạo transcript
    3. Gọi PUT /api/audios/{id}/transcript để cập nhật
    """
    audio = db.query(Audio).filter(Audio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    audio.transcript = transcript
    db.commit()
    db.refresh(audio)
    
    return {
        "id": audio_id,
        "title": audio.title,
        "transcript": transcript,
        "message": "Transcript updated successfully"
    }


@router.get("/without-transcript", response_model=List[AudioResponse])
def get_audios_without_transcript(db: Session = Depends(get_db)):
    """
    Lấy danh sách audio chưa có transcript - để n8n xử lý
    
    n8n có thể poll endpoint này để tìm audio mới cần gen transcript
    """
    audios = db.query(Audio).filter(
        (Audio.transcript == None) | (Audio.transcript == "")
    ).all()
    return audios


@router.post("/webhook/generate-transcript")
async def webhook_generate_transcript(
    data: TranscriptUpdate,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint cho n8n gửi transcript sau khi gen bằng AI
    
    Request body từ n8n:
    {
        "audio_id": 123,
        "transcript": "Hello, this is the generated transcript..."
    }
    """
    audio = db.query(Audio).filter(Audio.id == data.audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    audio.transcript = data.transcript
    db.commit()
    
    return {
        "success": True,
        "audio_id": data.audio_id,
        "message": "Transcript saved from n8n"
    }


@router.delete("/{audio_id}")
def delete_audio(audio_id: int, db: Session = Depends(get_db)):
    """Xóa audio"""
    audio = db.query(Audio).filter(Audio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    # Xóa file
    if os.path.exists(audio.file_path):
        os.remove(audio.file_path)
    
    db.delete(audio)
    db.commit()
    return {"message": "Deleted successfully"}

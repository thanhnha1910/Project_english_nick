from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import models
import schemas
from models import get_db
from pydantic import BaseModel

# FSRS imports
from fsrs import Scheduler, Card, Rating, State

router = APIRouter(
    prefix="/api/vocabulary",
    tags=["vocabulary"],
    responses={404: {"description": "Not found"}},
)

# ============ FSRS Scheduler (Anki-style config) ============
fsrs_scheduler = Scheduler(
    desired_retention=0.9,          # 90% target recall rate
    learning_steps=(
        timedelta(minutes=1),       # Step 1: 1 minute
        timedelta(minutes=10),      # Step 2: 10 minutes
    ),
    relearning_steps=(
        timedelta(minutes=10),      # Failed cards: 10 minutes
    ),
)


def _word_to_fsrs_card(word: models.Word) -> Card:
    """Reconstruct a py-fsrs Card from DB fields."""
    card = Card()
    card.state = State(word.fsrs_state)
    card.step = word.fsrs_step
    card.stability = word.fsrs_stability
    card.difficulty = word.fsrs_difficulty
    if word.fsrs_due:
        card.due = word.fsrs_due.replace(tzinfo=timezone.utc) if word.fsrs_due.tzinfo is None else word.fsrs_due
    else:
        card.due = datetime.now(timezone.utc)
    if word.fsrs_last_review:
        card.last_review = word.fsrs_last_review.replace(tzinfo=timezone.utc) if word.fsrs_last_review.tzinfo is None else word.fsrs_last_review
    else:
        card.last_review = None
    card.reps = word.fsrs_reps
    card.lapses = word.fsrs_lapses
    return card


def _save_fsrs_card(word: models.Word, card: Card):
    """Save py-fsrs Card state back to DB."""
    word.fsrs_state = card.state.value
    word.fsrs_step = card.step
    word.fsrs_stability = card.stability
    word.fsrs_difficulty = card.difficulty
    word.fsrs_due = card.due.replace(tzinfo=None) if card.due else None
    word.fsrs_last_review = card.last_review.replace(tzinfo=None) if card.last_review else None
    word.fsrs_reps = card.reps
    word.fsrs_lapses = card.lapses


# ============ Translation ============
class TranslateRequest(BaseModel):
    text: str
    dest: str = "vi"

@router.post("/translate")
def translate_text(request: TranslateRequest):
    """Translate text using deep-translator (GoogleTranslator)"""
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='auto', target=request.dest)
        translated_text = translator.translate(request.text)
        return {"translated": translated_text, "src": "auto"}
    except ImportError:
        print("Error: deep-translator not installed")
        raise HTTPException(status_code=500, detail="deep-translator library not installed")
    except Exception as e:
        print(f"Translation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# ============ Import ============
@router.post("/import", response_model=schemas.BulkImportResult)
def import_vocabulary(
    import_data: schemas.WordImport,
    db: Session = Depends(get_db)
):
    imported_count = 0
    failed_count = 0
    errors = []
    imported_ids = []

    for word_data in import_data.words:
        try:
            new_word = models.Word(
                text=word_data.text,
                meaning=word_data.meaning,
                example=word_data.example,
                stage_id=word_data.stage_id,
                # FSRS defaults
                fsrs_state=0,  # New
                fsrs_step=0,
                fsrs_stability=0.0,
                fsrs_difficulty=0.0,
                fsrs_due=None,
                fsrs_last_review=None,
                fsrs_reps=0,
                fsrs_lapses=0,
            )
            db.add(new_word)
            db.commit()
            db.refresh(new_word)
            imported_count += 1
            imported_ids.append(new_word.id)
        except Exception as e:
            db.rollback()
            failed_count += 1
            errors.append(f"Failed to import '{word_data.text}': {str(e)}")

    return {
        "total_files": len(import_data.words),
        "imported": imported_count,
        "failed": failed_count,
        "errors": errors,
        "imported_ids": imported_ids
    }


# ============ CRUD ============
@router.get("", response_model=List[schemas.WordResponse])
def get_words(
    stage_id: Optional[int] = None,
    limit: int = 500,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(models.Word)
    if stage_id:
        query = query.filter(models.Word.stage_id == stage_id)
    return query.order_by(models.Word.created_at.desc()).offset(skip).limit(limit).all()


class WordUpdate(BaseModel):
    text: str = None
    meaning: str = None
    example: str = None

@router.put("/{word_id}", response_model=schemas.WordResponse)
def update_word(word_id: int, update_data: WordUpdate, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    if update_data.text is not None:
        word.text = update_data.text
    if update_data.meaning is not None:
        word.meaning = update_data.meaning
    if update_data.example is not None:
        word.example = update_data.example
    
    db.commit()
    db.refresh(word)
    return word

@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    db.delete(word)
    db.commit()
    return None


# ============ FSRS Review ============
@router.post("/review", response_model=schemas.BatchReviewResponse)
def batch_review(
    request: schemas.BatchReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Submit batch reviews after a learning session.
    Each review has word_id and rating (1=Again, 2=Hard, 3=Good, 4=Easy).
    Runs FSRS algorithm to calculate next review intervals.
    """
    results = []
    now = datetime.now(timezone.utc)

    for item in request.reviews:
        word = db.query(models.Word).filter(models.Word.id == item.word_id).first()
        if not word:
            continue

        # Reconstruct FSRS card
        card = _word_to_fsrs_card(word)

        # Map rating (1-4) to FSRS Rating enum
        try:
            rating = Rating(item.rating)
        except ValueError:
            rating = Rating.Good  # Default fallback

        # Run FSRS scheduling
        updated_card, review_log = fsrs_scheduler.review_card(card, rating, now)

        # Save back to DB
        _save_fsrs_card(word, updated_card)

        # Calculate interval in days for display
        if updated_card.due:
            delta = updated_card.due.replace(tzinfo=timezone.utc) if updated_card.due.tzinfo is None else updated_card.due
            interval_seconds = (delta - now).total_seconds()
            interval_days = max(0, interval_seconds / 86400)
        else:
            interval_days = 0

        results.append(schemas.ReviewResultItem(
            word_id=word.id,
            text=word.text,
            new_state=updated_card.state.value,
            next_due=word.fsrs_due,
            interval_days=round(interval_days, 2)
        ))

    db.commit()

    # Build summary
    summary = {
        "mastered": sum(1 for r in results if r.new_state == 2 and r.interval_days > 21),
        "review": sum(1 for r in results if r.new_state == 2 and r.interval_days <= 21),
        "learning": sum(1 for r in results if r.new_state in [0, 1]),
        "relearning": sum(1 for r in results if r.new_state == 3),
        "total": len(results),
    }

    return schemas.BatchReviewResponse(results=results, summary=summary)


# ============ Due Words ============
@router.get("/due", response_model=List[schemas.WordResponse])
def get_due_words(
    stage_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get words that are due for review (fsrs_due <= now)."""
    now = datetime.utcnow()
    query = db.query(models.Word).filter(
        models.Word.fsrs_due != None,
        models.Word.fsrs_due <= now
    )
    if stage_id:
        query = query.filter(models.Word.stage_id == stage_id)
    return query.order_by(models.Word.fsrs_due.asc()).all()


# ============ Stats ============
@router.get("/stats", response_model=schemas.VocabStatsResponse)
def get_vocab_stats(
    stage_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get vocabulary learning statistics."""
    now = datetime.utcnow()
    query = db.query(models.Word)
    if stage_id:
        query = query.filter(models.Word.stage_id == stage_id)

    words = query.all()
    total = len(words)

    new_count = sum(1 for w in words if w.fsrs_state == 0)
    learning_count = sum(1 for w in words if w.fsrs_state == 1)
    review_count = sum(1 for w in words if w.fsrs_state == 2)
    relearning_count = sum(1 for w in words if w.fsrs_state == 3)

    due_today = sum(1 for w in words if w.fsrs_due and w.fsrs_due <= now)

    # Mature = review state + interval > 21 days
    mature_count = 0
    for w in words:
        if w.fsrs_state == 2 and w.fsrs_due and w.fsrs_last_review:
            interval = (w.fsrs_due - w.fsrs_last_review).days
            if interval > 21:
                mature_count += 1

    leeches = sum(1 for w in words if w.fsrs_lapses >= 8)

    return schemas.VocabStatsResponse(
        total=total,
        new=new_count,
        learning=learning_count,
        review=review_count,
        relearning=relearning_count,
        due_today=due_today,
        mature=mature_count,
        leeches=leeches
    )

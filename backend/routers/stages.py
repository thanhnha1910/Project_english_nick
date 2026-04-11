from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from models import get_db, Stage
from schemas import StageCreate, StageResponse

router = APIRouter(prefix="/api/stages", tags=["stages"])


@router.get("", response_model=List[StageResponse])
def get_all_stages(type: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy tất cả giai đoạn học, có thể lọc theo type"""
    query = db.query(Stage)
    if type:
        query = query.filter(Stage.type == type)
    
    stages = query.order_by(Stage.order).all()
    return stages


@router.get("/{stage_id}", response_model=StageResponse)
def get_stage(stage_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết giai đoạn"""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


@router.post("", response_model=StageResponse)
def create_stage(stage: StageCreate, db: Session = Depends(get_db)):
    """Tạo giai đoạn mới"""
    db_stage = Stage(**stage.model_dump())
    db.add(db_stage)
    db.commit()
    db.refresh(db_stage)
    return db_stage


@router.put("/{stage_id}", response_model=StageResponse)
def update_stage(stage_id: int, stage: StageCreate, db: Session = Depends(get_db)):
    """Cập nhật giai đoạn"""
    db_stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not db_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    for key, value in stage.model_dump().items():
        setattr(db_stage, key, value)
    
    db.commit()
    db.refresh(db_stage)
    return db_stage


@router.delete("/{stage_id}")
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    """Xóa giai đoạn"""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    db.delete(stage)
    db.commit()
    return {"message": "Deleted successfully"}


@router.put("/reorder")
def reorder_stages(stage_ids: List[int], db: Session = Depends(get_db)):
    """
    Sắp xếp lại thứ tự stages
    Nhận danh sách stage_ids theo thứ tự mới
    """
    for index, stage_id in enumerate(stage_ids):
        stage = db.query(Stage).filter(Stage.id == stage_id).first()
        if stage:
            stage.order = index
    
    db.commit()
    return {"message": "Reordered successfully", "order": stage_ids}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models import User, Block, Report
from app.schemas import BlockCreate, ReportCreate, ReportResponse
from app.auth import get_current_user

router = APIRouter(prefix="/moderation", tags=["moderation"])


@router.post("/block")
def block_user(
    block_data: BlockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id == block_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself"
        )
    
    # Check if already blocked
    existing_block = db.query(Block).filter(
        and_(
            Block.user_id == current_user.id,
            Block.blocked_user_id == block_data.user_id
        )
    ).first()
    
    if existing_block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already blocked"
        )
    
    block = Block(
        user_id=current_user.id,
        blocked_user_id=block_data.user_id
    )
    db.add(block)
    db.commit()
    
    return {"message": "User blocked successfully"}


@router.post("/report", response_model=ReportResponse)
def report_user(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id == report_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot report yourself"
        )
    
    report = Report(
        reporter_id=current_user.id,
        reported_user_id=report_data.user_id,
        reason=report_data.reason,
        details=report_data.details
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return ReportResponse.model_validate(report)


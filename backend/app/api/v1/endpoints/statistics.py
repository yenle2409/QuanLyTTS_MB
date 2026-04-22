from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.intern_batch import InternBatch
from app.models.intern_profile import InternProfile
from app.models.task import Task
from app.models.evaluation import Evaluation
from app.core.deps import get_current_hr

router = APIRouter()


@router.get("/overview")
def get_statistics_overview(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Thống kê tổng quan cho HR"""

    # Tổng số TTS
    total_interns = db.query(InternProfile).count()

    # Số đợt thực tập
    total_batches = db.query(InternBatch).count()
    open_batches = db.query(InternBatch).filter(InternBatch.status == "open").count()

    # Thống kê nhiệm vụ
    total_tasks = db.query(Task).count()
    task_status_counts = {}
    for status in ["new", "submitted", "request_change", "approved", "overdue"]:
        count = db.query(Task).filter(Task.status == status).count()
        task_status_counts[status] = count

    # Tỷ lệ hoàn thành nhiệm vụ
    completion_rate = round(
        (task_status_counts.get("approved", 0) / total_tasks * 100) if total_tasks > 0 else 0, 1
    )

    # Thống kê đánh giá
    total_evaluations = db.query(Evaluation).count()
    ranking_counts = {}
    for ranking in ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu"]:
        count = db.query(Evaluation).filter(Evaluation.ranking == ranking).count()
        if count > 0:
            ranking_counts[ranking] = count

    # Điểm trung bình
    evaluations = db.query(Evaluation).filter(Evaluation.total_score.isnot(None)).all()
    avg_score = round(
        sum(e.total_score for e in evaluations) / len(evaluations), 1
    ) if evaluations else 0

    return {
        "total_interns": total_interns,
        "total_batches": total_batches,
        "open_batches": open_batches,
        "total_tasks": total_tasks,
        "task_status_counts": task_status_counts,
        "completion_rate": completion_rate,
        "total_evaluations": total_evaluations,
        "ranking_counts": ranking_counts,
        "avg_score": avg_score,
    }


@router.get("/by-batch")
def get_statistics_by_batch(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Thống kê chi tiết theo từng đợt thực tập"""
    batches = db.query(InternBatch).all()
    result = []

    for batch in batches:
        # Số TTS trong đợt
        interns = db.query(InternProfile).filter(InternProfile.batch_id == batch.id).all()
        intern_ids = [p.user_id for p in interns]
        intern_count = len(intern_ids)

        # Nhiệm vụ trong đợt
        tasks = db.query(Task).filter(Task.batch_id == batch.id).all()
        total_tasks = len(tasks)
        approved_tasks = len([t for t in tasks if t.status == "approved"])
        task_completion = round((approved_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

        # Đánh giá trong đợt
        evaluations = db.query(Evaluation).filter(
            Evaluation.intern_id.in_(intern_ids)
        ).all() if intern_ids else []

        evaluated_count = len(evaluations)
        avg_score = round(
            sum(e.total_score for e in evaluations if e.total_score) / evaluated_count, 1
        ) if evaluated_count > 0 else None

        result.append({
            "batch_id": batch.id,
            "batch_name": batch.batch_name,
            "status": batch.status,
            "start_date": batch.start_date.isoformat() if batch.start_date else None,
            "end_date": batch.end_date.isoformat() if batch.end_date else None,
            "intern_count": intern_count,
            "total_tasks": total_tasks,
            "approved_tasks": approved_tasks,
            "task_completion_rate": task_completion,
            "evaluated_count": evaluated_count,
            "avg_score": avg_score,
        })

    return result


@router.get("/task-completion")
def get_task_completion_stats(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Thống kê tỷ lệ hoàn thành nhiệm vụ theo TTS (top performers)"""
    profiles = db.query(InternProfile).all()
    result = []

    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if not user:
            continue

        tasks = db.query(Task).filter(Task.intern_id == profile.user_id).all()
        total = len(tasks)
        if total == 0:
            continue

        approved = len([t for t in tasks if t.status == "approved"])
        submitted = len([t for t in tasks if t.status == "submitted"])
        overdue = len([t for t in tasks if t.status == "overdue"])

        result.append({
            "intern_id": profile.user_id,
            "intern_name": user.full_name,
            "batch_id": profile.batch_id,
            "total_tasks": total,
            "approved": approved,
            "submitted": submitted,
            "overdue": overdue,
            "completion_rate": round(approved / total * 100, 1),
        })

    # Sort by completion rate desc
    result.sort(key=lambda x: x["completion_rate"], reverse=True)
    return result


@router.get("/rankings")
def get_ranking_distribution(
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Phân bố xếp loại đánh giá"""
    rankings = ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu"]
    result = []
    for r in rankings:
        count = db.query(Evaluation).filter(Evaluation.ranking == r).count()
        result.append({"ranking": r, "count": count})
    return result
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, batches, profiles, tasks, evaluations, statistics
from app.api.v1.endpoints import task_messages
from app.api.v1.endpoints import training_documents, logbook
from app.api.v1.endpoints import weekly_feedbacks  # ← THÊM DÒNG NÀY
from app.api.v1.endpoints import schedule
from app.api.v1.endpoints import leave_request
from app.api.v1.endpoints import export_reports
from app.api.v1.endpoints import attendance
api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])
api_router.include_router(task_messages.router, prefix="/tasks", tags=["task-messages"])
api_router.include_router(training_documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(logbook.router, prefix="/logbook", tags=["logbook"])
api_router.include_router(weekly_feedbacks.router, prefix="/weekly-feedbacks", tags=["weekly-feedbacks"])  # ← THÊM DÒNG NÀY
api_router.include_router(schedule.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(leave_request.router, prefix="/leave-requests", tags=["leave-requests"])
api_router.include_router(export_reports.router, prefix="/statistics", tags=["export"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
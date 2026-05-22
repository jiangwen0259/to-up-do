from fastapi import APIRouter

from app.logger import logger
from app.schemas.reminder import ReminderCheckRequest, ReminderCheckResponse, ReminderDailySummary, ReminderTodoItem
from app.services.reminder import check_reminders, daily_summary

router = APIRouter()


@router.post("/check", response_model=ReminderCheckResponse)
async def check(body: ReminderCheckRequest):
    return await check_reminders(body.todos, body.deadline_advance)


@router.post("/daily", response_model=ReminderDailySummary)
async def daily(todos: list[ReminderTodoItem]):
    return await daily_summary(todos)

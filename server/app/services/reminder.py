import re
from datetime import datetime, timezone
from typing import Optional

from app.logger import logger
from app.schemas.reminder import ReminderTodoItem, ReminderItem, ReminderCheckResponse, ReminderDailySummary


async def check_reminders(
    todos: list[ReminderTodoItem],
    deadline_advance: int = 30,
) -> ReminderCheckResponse:
    reminders: list[ReminderItem] = []
    now = datetime.now(timezone.utc)

    for todo in todos:
        if todo.status == "done" or not todo.due_date:
            continue

        try:
            due = datetime.fromisoformat(todo.due_date.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            logger.warning("Invalid due_date for todo %s: %s", todo.id, todo.due_date)
            continue

        delta = due - now
        minutes_left = round(delta.total_seconds() / 60)

        if minutes_left <= 0:
            reminders.append(ReminderItem(
                todo_id=todo.id,
                title=todo.title,
                message=f"「{todo.title}」已超过截止时间！",
                minutes_left=minutes_left,
                level="error",
            ))
        elif minutes_left <= deadline_advance:
            hours = minutes_left // 60
            mins = minutes_left % 60
            time_str = f"{hours}小时{mins}分钟" if hours > 0 else f"{mins}分钟"
            reminders.append(ReminderItem(
                todo_id=todo.id,
                title=todo.title,
                message=f"「{todo.title}」{time_str}后到期",
                minutes_left=minutes_left,
                level="warning",
            ))

    logger.info("Reminder check: %d todos, %d reminders", len(todos), len(reminders))
    return ReminderCheckResponse(reminders=reminders)


async def daily_summary(todos: list[ReminderTodoItem]) -> ReminderDailySummary:
    active = [t for t in todos if t.status != "done"]
    overdue = [t for t in active if t.due_date and _is_overdue(t.due_date)]

    summary = ReminderDailySummary(
        total=len(todos),
        todo_count=len([t for t in active if t.status == "todo"]),
        in_progress_count=len([t for t in active if t.status == "in_progress"]),
        overdue_count=len(overdue),
        items=overdue[:10],
    )

    logger.info("Daily summary: %d total, %d overdue", summary.total, summary.overdue_count)
    return summary


def _is_overdue(due_date: str) -> bool:
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        return due < datetime.now(timezone.utc)
    except (ValueError, AttributeError):
        return False

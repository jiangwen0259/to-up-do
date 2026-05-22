from typing import Optional
from pydantic import BaseModel


class ReminderTodoItem(BaseModel):
    id: str
    title: str
    due_date: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"


class ReminderCheckRequest(BaseModel):
    todos: list[ReminderTodoItem]
    deadline_advance: int = 30


class ReminderItem(BaseModel):
    todo_id: str
    title: str
    message: str
    minutes_left: Optional[int] = None
    level: str = "warning"


class ReminderCheckResponse(BaseModel):
    reminders: list[ReminderItem]


class ReminderDailySummary(BaseModel):
    total: int
    todo_count: int
    in_progress_count: int
    overdue_count: int
    items: list[ReminderTodoItem]

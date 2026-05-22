from typing import Optional
from pydantic import BaseModel


class TapdTaskQuery(BaseModel):
    workspace_id: str
    workitem_types: list[str] = ["story", "bug", "task"]
    status_filter: list[str] = ["open", "progressing"]
    limit: int = 200


class TapdStatusUpdate(BaseModel):
    workspace_id: str
    workitem_type: str
    status: str


class TapdTaskItem(BaseModel):
    id: str
    name: str
    description: str
    status: str
    priority: str
    owner: str
    begin: Optional[str] = None
    due: Optional[str] = None
    created: Optional[str] = None
    modified: Optional[str] = None
    workitem_type: str = "task"


class TapdSyncResult(BaseModel):
    synced: int
    created: int
    updated: int
    errors: int


class TapdTestResult(BaseModel):
    ok: bool
    message: str
    task_count: int = 0

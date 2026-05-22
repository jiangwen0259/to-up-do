from fastapi import APIRouter

from app.config import config
from app.logger import logger
from app.schemas.tapd import TapdTaskQuery, TapdStatusUpdate, TapdTaskItem, TapdTestResult
from app.services.tapd_client import fetch_tasks, update_task_status, test_connection

router = APIRouter()


@router.get("/tasks", response_model=list[TapdTaskItem])
async def get_tasks(workspace_id: str = "", workitem_types: str = "story,bug,task"):
    types = [t.strip() for t in workitem_types.split(",")]
    tasks = await fetch_tasks(config.tapd, workspace_id or None)
    if types:
        tasks = [t for t in tasks if t.workitem_type in types]
    return tasks


@router.post("/tasks/{task_id}/status")
async def update_status(task_id: str, body: TapdStatusUpdate):
    ok = await update_task_status(
        config.tapd, task_id, body.workspace_id, body.workitem_type, body.status
    )
    return {"ok": ok}


@router.post("/test", response_model=TapdTestResult)
async def test_tapd():
    ok, message, count = await test_connection(config.tapd)
    return TapdTestResult(ok=ok, message=message, task_count=count)

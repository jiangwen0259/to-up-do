from typing import Optional

import httpx

from app.logger import logger
from app.schemas.tapd import TapdTaskItem

TAPD_API = "https://api.tapd.cn"

_STATUS_MAP = {
    "open": "todo",
    "progressing": "in_progress",
    "resolved": "done",
    "closed": "done",
}

_PRIORITY_MAP = {
    "1": "urgent",
    "2": "high",
    "3": "medium",
    "4": "low",
}

_ENDPOINT_MAP = {
    "story": "stories",
    "bug": "bugs",
    "task": "tasks",
}


def _auth_header(config: dict) -> dict:
    token = config.get("personal_token")
    if token:
        return {"Authorization": f"Bearer {token}"}

    oauth = config.get("oauth", {})
    cid = oauth.get("client_id", "")
    csec = oauth.get("client_secret", "")
    if cid and csec:
        import base64
        encoded = base64.b64encode(f"{cid}:{csec}".encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

    return {}


async def fetch_tasks(tapd_config: dict, workspace_id: Optional[str] = None) -> list[TapdTaskItem]:
    ws_id = workspace_id or tapd_config.get("default_workspace_id", "")
    if not ws_id:
        logger.warning("No workspace_id configured")
        return []

    headers = {**_auth_header(tapd_config), "Content-Type": "application/json"}
    tasks: list[TapdTaskItem] = []

    async with httpx.AsyncClient(timeout=30) as client:
        for wtype, endpoint in _ENDPOINT_MAP.items():
            url = f"{TAPD_API}/{endpoint}"
            params = {"workspace_id": ws_id, "limit": 200}

            try:
                logger.info("Fetching %s from workspace %s", wtype, ws_id)
                resp = await client.get(url, headers=headers, params=params)
                if resp.status_code != 200:
                    logger.warning("TAPD API returned %s for %s", resp.status_code, wtype)
                    continue

                data = resp.json()
                if data.get("status") != 1 or not isinstance(data.get("data"), list):
                    logger.warning("TAPD unexpected response for %s: %s", wtype, data.get("info", ""))
                    continue

                for item in data["data"]:
                    work_item = item[list(item.keys())[0]]
                    tasks.append(TapdTaskItem(
                        id=work_item.get("id", ""),
                        name=work_item.get("name", ""),
                        description=work_item.get("description", ""),
                        status=work_item.get("status", ""),
                        priority=work_item.get("priority", ""),
                        owner=work_item.get("owner", ""),
                        begin=work_item.get("begin"),
                        due=work_item.get("due"),
                        created=work_item.get("created"),
                        modified=work_item.get("modified"),
                        workitem_type=wtype,
                    ))

                logger.info("Fetched %d %s items", len(data["data"]), wtype)

            except httpx.HTTPError as e:
                logger.error("HTTP error fetching %s: %s", wtype, e)
            except Exception as e:
                logger.error("Error fetching %s: %s", wtype, e)

    return tasks


async def update_task_status(
    tapd_config: dict,
    task_id: str,
    workspace_id: str,
    workitem_type: str,
    status: str,
) -> bool:
    endpoint = _ENDPOINT_MAP.get(workitem_type)
    if not endpoint:
        logger.error("Unknown workitem type: %s", workitem_type)
        return False

    headers = {**_auth_header(tapd_config), "Content-Type": "application/json"}
    url = f"{TAPD_API}/{endpoint}/{task_id}"
    body = {workitem_type: {"status": status}}

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            logger.info("Updating %s %s status to %s", workitem_type, task_id, status)
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code == 200:
                logger.info("Status updated successfully")
                return True
            logger.error("Failed to update status: %s %s", resp.status_code, resp.text)
            return False
        except httpx.HTTPError as e:
            logger.error("HTTP error updating task: %s", e)
            return False


async def test_connection(tapd_config: dict) -> tuple[bool, str, int]:
    ws_id = tapd_config.get("default_workspace_id", "")
    if not ws_id:
        return False, "workspace_id 未配置", 0

    try:
        tasks = await fetch_tasks(tapd_config, ws_id)
        return True, f"连接成功，获取到 {len(tasks)} 条任务", len(tasks)
    except Exception as e:
        logger.error("TAPD connection test failed: %s", e)
        return False, f"连接失败: {e}", 0

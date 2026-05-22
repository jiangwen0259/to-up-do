from fastapi import APIRouter, HTTPException

from app.config import config
from app.logger import logger
from app.schemas.settings import (
    SettingsResponse, SettingsUpdateRequest, TestResult,
)
from app.services.tapd_client import test_connection as test_tapd_conn
from app.services.ai_client import call_ai

router = APIRouter()


@router.get("", response_model=SettingsResponse)
async def get_settings():
    tapd = config.tapd
    ai = config.ai
    return SettingsResponse(
        tapd_configured=bool(tapd.get("personal_token") or tapd.get("oauth", {}).get("client_id")),
        ai_configured=bool(ai.get("api_key")),
        tapd_workspace_id=tapd.get("default_workspace_id"),
        ai_provider=ai.get("provider"),
        ai_model=ai.get("model"),
    )


@router.put("")
async def update_settings(body: SettingsUpdateRequest):
    if body.tapd:
        config.update_tapd(body.tapd.model_dump(exclude_none=True))
    if body.ai:
        config.update_ai(body.ai.model_dump(exclude_none=True))
    if body.reminder:
        config.update_reminder(body.reminder.model_dump(exclude_none=True))
    return {"ok": True}


@router.post("/test-tapd", response_model=TestResult)
async def test_tapd_settings():
    ok, message, _ = await test_tapd_conn(config.tapd)
    return TestResult(ok=ok, message=message)


@router.post("/test-ai", response_model=TestResult)
async def test_ai_settings():
    try:
        await call_ai(
            config.ai,
            messages=[{"role": "user", "content": "Hi"}],
            system_prompt="Reply with just 'ok'.",
        )
        return TestResult(ok=True, message="AI 连接成功")
    except Exception as e:
        logger.error("AI test failed: %s", e)
        return TestResult(ok=False, message=f"AI 连接失败: {e}")

from typing import Optional
from pydantic import BaseModel


class TapdSettings(BaseModel):
    personal_token: Optional[str] = None
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None
    default_workspace_id: Optional[str] = None
    sync_interval: Optional[int] = None


class AiSettings(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


class ReminderSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    deadline_advance: Optional[int] = None


class SettingsResponse(BaseModel):
    tapd_configured: bool
    ai_configured: bool
    tapd_workspace_id: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None


class SettingsUpdateRequest(BaseModel):
    tapd: Optional[TapdSettings] = None
    ai: Optional[AiSettings] = None
    reminder: Optional[ReminderSettingsUpdate] = None


class TestResult(BaseModel):
    ok: bool
    message: str

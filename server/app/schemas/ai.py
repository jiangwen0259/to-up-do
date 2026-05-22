from typing import Optional
from pydantic import BaseModel


class AiBreakdownRequest(BaseModel):
    title: str
    description: str = ""


class AiBreakdownResponse(BaseModel):
    subtasks: list[str]


class AiPriorityRequest(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[str] = None


class AiPriorityResponse(BaseModel):
    priority: str
    reason: str = ""


class AiEstimateRequest(BaseModel):
    title: str
    description: str = ""


class AiEstimateResponse(BaseModel):
    hours: float
    reason: str = ""


class AiReportRequest(BaseModel):
    tasks: list[str]
    report_type: str = "weekly"


class AiReportResponse(BaseModel):
    report: str


class AiChatRequest(BaseModel):
    messages: list[dict]
    system_prompt: Optional[str] = None


class AiChatResponse(BaseModel):
    reply: str

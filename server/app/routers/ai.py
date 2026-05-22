from fastapi import APIRouter, HTTPException

from app.config import config
from app.logger import logger
from app.schemas.ai import (
    AiBreakdownRequest, AiBreakdownResponse,
    AiPriorityRequest, AiPriorityResponse,
    AiEstimateRequest, AiEstimateResponse,
    AiReportRequest, AiReportResponse,
    AiChatRequest, AiChatResponse,
)
from app.services.ai_client import call_ai, breakdown_task

router = APIRouter()


@router.post("/breakdown", response_model=AiBreakdownResponse)
async def ai_breakdown(body: AiBreakdownRequest):
    try:
        items = await breakdown_task(config.ai, body.title, body.description)
        return AiBreakdownResponse(subtasks=items)
    except Exception as e:
        logger.error("AI breakdown failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/priority", response_model=AiPriorityResponse)
async def ai_priority(body: AiPriorityRequest):
    messages = [
        {"role": "user", "content": f"根据以下任务信息建议优先级，只返回一个词：low、medium、high 或 urgent。\n\n任务：{body.title}\n描述：{body.description or '无'}\n截止时间：{body.due_date or '未设置'}"},
    ]
    try:
        result = await call_ai(config.ai, messages, system_prompt="你是一个项目管理助手，擅长评估任务优先级。只返回一个优先级词。")
        priority = result.strip().lower()
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        return AiPriorityResponse(priority=priority)
    except Exception as e:
        logger.error("AI priority failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/estimate", response_model=AiEstimateResponse)
async def ai_estimate(body: AiEstimateRequest):
    messages = [
        {"role": "user", "content": f"预估以下任务的完成时间，只返回数字（小时），不要多余解释。\n\n任务：{body.title}\n描述：{body.description or '无'}"},
    ]
    try:
        result = await call_ai(config.ai, messages, system_prompt="你是一个项目管理助手，擅长根据任务描述预估工时。只返回数字。")
        import re
        numbers = re.findall(r"[\d.]+", result)
        hours = float(numbers[0]) if numbers else 0
        return AiEstimateResponse(hours=hours)
    except Exception as e:
        logger.error("AI estimate failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/report", response_model=AiReportResponse)
async def ai_report(body: AiReportRequest):
    task_list = "\n".join(f"{i+1}. {t}" for i, t in enumerate(body.tasks))
    messages = [
        {"role": "user", "content": f"根据以下{'本周' if body.report_type == 'weekly' else '今日'}完成的任务列表，生成一份简洁的{'周报' if body.report_type == 'weekly' else '日报'}摘要：\n\n{task_list}"},
    ]
    try:
        result = await call_ai(config.ai, messages, system_prompt="你是一个项目管理助手，擅长将任务列表整理为结构清晰的报告。")
        return AiReportResponse(report=result)
    except Exception as e:
        logger.error("AI report failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/chat", response_model=AiChatResponse)
async def ai_chat(body: AiChatRequest):
    try:
        result = await call_ai(config.ai, body.messages, system_prompt=body.system_prompt)
        return AiChatResponse(reply=result)
    except Exception as e:
        logger.error("AI chat failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

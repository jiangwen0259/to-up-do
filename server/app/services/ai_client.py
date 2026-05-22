import httpx
from typing import Optional

from app.logger import logger


async def call_ai(ai_config: dict, messages: list[dict], system_prompt: Optional[str] = None) -> str:
    provider = ai_config.get("provider", "openai")
    api_key = ai_config.get("api_key", "")
    base_url = ai_config.get("base_url", "https://api.openai.com/v1")
    model = ai_config.get("model", "gpt-4o")

    if not api_key:
        raise ValueError("AI API key not configured")

    if provider == "anthropic":
        return await _call_anthropic(base_url, api_key, model, messages, system_prompt)
    else:
        return await _call_openai(base_url, api_key, model, messages, system_prompt)


async def _call_openai(
    base_url: str, api_key: str, model: str,
    messages: list[dict], system_prompt: Optional[str],
) -> str:
    all_messages = []
    if system_prompt:
        all_messages.append({"role": "system", "content": system_prompt})
    all_messages.extend(messages)

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {"model": model, "messages": all_messages, "temperature": 0.7}

    logger.info("Calling OpenAI API, model=%s, messages=%d", model, len(all_messages))

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code != 200:
            error_text = resp.text
            logger.error("OpenAI API error: %s %s", resp.status_code, error_text)
            raise RuntimeError(f"AI API error: {resp.status_code} {error_text}")

        data = resp.json()
        result = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        logger.info("OpenAI response received, length=%d", len(result))
        return result


async def _call_anthropic(
    base_url: str, api_key: str, model: str,
    messages: list[dict], system_prompt: Optional[str],
) -> str:
    url = f"{base_url.rstrip('/')}/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    filtered = [m for m in messages if m["role"] != "system"]
    body = {
        "model": model,
        "max_tokens": 2048,
        "messages": filtered,
    }
    if system_prompt:
        body["system"] = system_prompt

    logger.info("Calling Anthropic API, model=%s", model)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code != 200:
            error_text = resp.text
            logger.error("Anthropic API error: %s %s", resp.status_code, error_text)
            raise RuntimeError(f"AI API error: {resp.status_code} {error_text}")

        data = resp.json()
        result = data.get("content", [{}])[0].get("text", "")
        logger.info("Anthropic response received, length=%d", len(result))
        return result


async def breakdown_task(ai_config: dict, title: str, description: str) -> list[str]:
    messages = [
        {"role": "user", "content": f"将以下任务拆解为具体的、可执行的子任务列表。每行一个子任务，不要编号，不要多余解释。\n\n任务：{title}\n描述：{description or '无'}"},
    ]
    result = await call_ai(ai_config, messages, system_prompt="你是一个项目管理助手，擅长将模糊的任务拆解为清晰的执行步骤。")
    import re
    items = [re.sub(r"^[\d\-*.\s]+", "", line).strip() for line in result.split("\n") if line.strip()]
    return items

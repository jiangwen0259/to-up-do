import type { AiConfig } from "@/types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAi(config: AiConfig, messages: ChatMessage[]): Promise<string> {
  if (!config.enabled || !config.apiKey) {
    throw new Error("AI service is not configured");
  }

  const url = config.provider === "anthropic"
    ? `${config.baseUrl}/messages`
    : `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: string;

  if (config.provider === "anthropic") {
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      messages: messages.filter((m) => m.role !== "system"),
      system: messages.find((m) => m.role === "system")?.content,
    });
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    body = JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    });
  }

  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (config.provider === "anthropic") {
    return data.content?.[0]?.text ?? "";
  }
  return data.choices?.[0]?.message?.content ?? "";
}

export async function aiBreakdownTask(config: AiConfig, taskTitle: string, taskDescription: string): Promise<string[]> {
  const prompt = `将以下任务拆解为具体的、可执行的子任务列表。每行一个子任务，不要编号，不要多余解释。

任务：${taskTitle}
描述：${taskDescription || "无"}`;

  const result = await callAi(config, [
    { role: "system", content: "你是一个项目管理助手，擅长将模糊的任务拆解为清晰的执行步骤。" },
    { role: "user", content: prompt },
  ]);

  return result
    .split("\n")
    .map((line) => line.replace(/^[\d\-*.]+\s*/, "").trim())
    .filter(Boolean);
}

export async function aiEstimateHours(config: AiConfig, taskTitle: string, taskDescription: string): Promise<string> {
  const prompt = `预估以下任务的完成时间，只返回数字（小时），不要多余解释。

任务：${taskTitle}
描述：${taskDescription || "无"}`;

  const result = await callAi(config, [
    { role: "system", content: "你是一个项目管理助手，擅长根据任务描述预估工时。" },
    { role: "user", content: prompt },
  ]);
  return result.trim();
}

export async function aiSuggestPriority(config: AiConfig, taskTitle: string, dueDate: string | null): Promise<string> {
  const prompt = `根据以下任务信息建议优先级，只返回一个词：low、medium、high 或 urgent。

任务：${taskTitle}
截止时间：${dueDate || "未设置"}`;

  const result = await callAi(config, [
    { role: "system", content: "你是一个项目管理助手，擅长评估任务优先级。" },
    { role: "user", content: prompt },
  ]);
  return result.trim().toLowerCase();
}

export async function aiGenerateWeeklyReport(config: AiConfig, completedTasks: string[]): Promise<string> {
  const taskList = completedTasks.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const prompt = `根据以下本周完成的任务列表，生成一份简洁的周报摘要：

${taskList}`;

  return callAi(config, [
    { role: "system", content: "你是一个项目管理助手，擅长将任务列表整理为结构清晰的周报。" },
    { role: "user", content: prompt },
  ]);
}

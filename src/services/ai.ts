import { getSettings } from "@/db";
import { AI_BASE_URL, type AiConfig } from "@/types";

// ─── 通用对话消息（OpenAI 协议） ───
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** 调用结果：拆出推理过程 + 最终答复 */
export interface ChatResult {
  /** 模型最终给用户看的答复（content 字段） */
  content: string;
  /** 思维链 / 推理过程（reasoning_content 字段，没有时为空） */
  reasoning: string;
}

interface OpenAIChatChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    /** DeepSeek / MiniMax-M 系列等推理模型返回的 CoT 字段 */
    reasoning_content?: string | null;
    /** 部分网关用 reasoning 替代 reasoning_content */
    reasoning?: string | null;
    /** 兼容 thinking 字段 */
    thinking?: string | null;
  };
  finish_reason: string;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function getAi(): Promise<AiConfig> {
  const s = await getSettings();
  if (!s.ai.enabled) throw new Error("AI 未启用,请在设置中开启");
  if (!s.ai.apiKey) throw new Error("请在设置中配置 API Key");
  return s.ai;
}

/**
 * 调用 OpenAI 兼容协议 /v1/chat/completions
 * @returns { content, reasoning } —— content 是最终答复，reasoning 是模型的思维链
 */
async function callChat(
  messages: ChatMessage[],
  systemPrompt?: string,
): Promise<ChatResult> {
  const ai = await getAi();

  // 合并 system：systemPrompt 参数 + messages 中的 system 项
  const systemFromMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const finalSystem = [systemPrompt, systemFromMessages].filter(Boolean).join("\n\n");

  const finalMessages: ChatMessage[] = [];
  if (finalSystem) finalMessages.push({ role: "system", content: finalSystem });
  for (const m of messages) {
    if (m.role === "system") continue;
    finalMessages.push(m);
  }

  const body = {
    model: ai.model,
    messages: finalMessages,
    temperature: 0.6,
    max_tokens: 4096,
  };

  const res = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI 调用失败 ${res.status}: ${text || res.statusText}`);
  }

  const data: OpenAIChatResponse = await res.json();
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error("AI 返回结构异常：缺少 choices[0].message");

  const reasoning = (msg.reasoning_content || msg.reasoning || msg.thinking || "").trim();
  const content = (msg.content || "").trim();

  return { content, reasoning };
}

// ─── 高层接口 ───

/**
 * 聊天接口（保留向后兼容：默认返回 content 字符串）。
 * 需要拿到推理过程时使用 aiChatFull。
 */
export async function aiChat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  const r = await callChat(messages, systemPrompt);
  return r.content;
}

/**
 * 聊天接口（完整版）：同时返回 content 与 reasoning_content。
 */
export async function aiChatFull(
  messages: ChatMessage[],
  systemPrompt?: string,
): Promise<ChatResult> {
  return callChat(messages, systemPrompt);
}

export async function aiBreakdownTask(title: string, description: string): Promise<string[]> {
  const sys =
    "你是一个任务拆解助手。把用户给出的任务拆解成 3-6 个可执行的子任务。\n" +
    "严格只返回 JSON 数组,如:[\"子任务1\",\"子任务2\"],不要任何额外文字。";
  const userMsg = `任务标题: ${title}\n描述: ${description || "(无)"}`;
  const { content: reply } = await callChat([{ role: "user", content: userMsg }], sys);

  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function aiSuggestPriority(
  title: string,
  description: string,
  dueDate: string | null,
): Promise<string> {
  const sys =
    "你是一个任务优先级分析助手。根据任务内容和截止日期推荐优先级。\n" +
    "只返回单个词,可选值: low / medium / high / urgent";
  const userMsg = `标题: ${title}\n描述: ${description || "(无)"}\n截止: ${dueDate || "未设定"}`;
  const { content: reply } = await callChat([{ role: "user", content: userMsg }], sys);
  const m = reply.toLowerCase().match(/\b(urgent|high|medium|low)\b/);
  return m ? m[1] : "medium";
}

export async function aiEstimateHours(title: string, description: string): Promise<number> {
  const sys =
    "你是一个任务工时估算助手。根据任务复杂度估算所需小时数(0.5 - 40 之间)。\n" +
    "只返回数字,不要任何额外文字。";
  const userMsg = `标题: ${title}\n描述: ${description || "(无)"}`;
  const { content: reply } = await callChat([{ role: "user", content: userMsg }], sys);
  const m = reply.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 2;
}

export async function aiGenerateWeeklyReport(
  tasks: string[],
  reportType: "weekly" | "daily" = "weekly",
): Promise<string> {
  const sys =
    reportType === "weekly"
      ? "你是一个周报撰写助手。基于已完成任务列表生成结构清晰的周报(包含本周完成、亮点、下周计划)。"
      : "你是一个日报撰写助手。基于已完成任务列表生成简洁的日报。";
  const userMsg = `任务列表:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  const { content } = await callChat([{ role: "user", content: userMsg }], sys);
  return content;
}

/**
 * 测试当前配置(发一条 ping 消息)
 */
export async function aiPing(): Promise<{ ok: boolean; message: string }> {
  try {
    const { content } = await callChat(
      [{ role: "user", content: "ping,请回复 pong" }],
      "你是测试助手,简短回复即可。",
    );
    return { ok: true, message: `连接成功: ${content.slice(0, 60)}` };
  } catch (e: any) {
    return { ok: false, message: e.message || "未知错误" };
  }
}

import { useState, useRef, useEffect } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiChatFull, type ChatMessage } from "@/services/ai";
import type { Todo } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  ts: number;
  pending?: boolean;
  createdTodo?: { id: number; title: string };
}

// Strip <think>/<thinking>/<reasoning> blocks (and common CoT preambles) from the model output.
// Returns { thinking, answer } so the UI can show the thinking collapsibly.
function splitThinking(raw: string): { thinking: string; answer: string } {
  if (!raw) return { thinking: "", answer: "" };
  let text = raw.trim();
  const thinkingChunks: string[] = [];

  // 1) Tagged blocks: <think>...</think>, <thinking>...</thinking>, <reasoning>...</reasoning>
  const tagRe = /<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi;
  text = text.replace(tagRe, (_, _tag, body) => {
    thinkingChunks.push(body.trim());
    return "";
  });

  // 2) Unclosed opening tag: "<think> ..." with no closing -> everything from the tag to end is thinking.
  const openRe = /<(think|thinking|reasoning)>([\s\S]*)$/i;
  const openMatch = text.match(openRe);
  if (openMatch) {
    thinkingChunks.push(openMatch[2].trim());
    text = text.replace(openRe, "").trim();
  }

  // 3) Explicit "最终回复：/ 回复：/ 答复：" delimiter
  const finalMarkerRe = /(?:^|\n)\s*(?:最终回复|最终回答|回复|答复)\s*[:：]\s*([\s\S]+)$/;
  const fm = text.match(finalMarkerRe);
  if (fm) {
    const before = text.slice(0, fm.index).trim();
    if (before) thinkingChunks.push(before);
    text = fm[1].trim();
  }

  // 4) Heuristic CoT: model wrote a long internal monologue without any tags.
  //    Detect when the text contains telltale "thinking phrases" AND is suspiciously long.
  //    Strategy: split into paragraphs (by blank lines) and find the LAST paragraph that
  //    starts with a bullet/short final-answer pattern. Treat everything before as thinking.
  const COT_SIGNALS = [
    "用户问", "用户的", "用户可能", "用户希望", "看看上下文", "先看", "我看",
    "按优先级", "按截止", "所以", "因此", "综上",
    "好的，", "好的用户", "嗯，", "让我", "我需要", "我应该",
    "深层需求", "作为助手", "结合之前", "用户在测试",
  ];
  const hasCotSignal = COT_SIGNALS.some((s) => text.includes(s));
  // Long = > 80 chars (one paragraph of independent monologue) AND has a CoT signal.
  if (hasCotSignal && text.length > 80) {
    // Split into paragraphs (blank-line separated). If only one paragraph, split by sentence.
    let paragraphs = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length === 1) {
      // Try to split a single paragraph into sentences using Chinese punctuation as boundaries.
      paragraphs = text
        .split(/(?<=[。！？!?])\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
    }

    // Walk from the end. The "answer" should be the tail that does NOT contain CoT signals
    // and is short (≤ 120 chars). Everything before is thinking.
    let cutIndex = paragraphs.length;
    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const p = paragraphs[i];
      const pHasSignal = COT_SIGNALS.some((s) => p.includes(s));
      if (!pHasSignal && p.length <= 200) {
        cutIndex = i;
      } else {
        break;
      }
    }

    if (cutIndex < paragraphs.length && cutIndex > 0) {
      const thinking = paragraphs.slice(0, cutIndex).join("\n\n").trim();
      const answer = paragraphs.slice(cutIndex).join("\n\n").trim();
      if (thinking) thinkingChunks.push(thinking);
      text = answer;
    } else if (cutIndex === 0) {
      // No clear final answer — keep everything but strip the most obvious CoT lines.
      const lines = text.split("\n");
      const cleaned: string[] = [];
      const dropped: string[] = [];
      for (const line of lines) {
        const lineHasSignal = COT_SIGNALS.some((s) => line.includes(s));
        if (lineHasSignal) dropped.push(line);
        else cleaned.push(line);
      }
      if (dropped.length) {
        thinkingChunks.push(dropped.join("\n").trim());
        text = cleaned.join("\n").trim();
      }
    }
  }

  return { thinking: thinkingChunks.join("\n\n").trim(), answer: text.trim() };
}

const SYSTEM_PROMPT = `你是 To-Up-Do 的待办小助手 ✨ —— 贴心、活泼、靠谱的工作伙伴。

═══════════════════════════════════
【输出格式 · 铁律】
═══════════════════════════════════

你的每条回复必须是以下三种格式**之一**，没有第四种可能：

格式 A：纯思考 + 极简答复
<think>
（在这里写所有推理、分析、看上下文、揣摩用户意图的内容）
</think>
（这里写最终给用户看的话——必须 ≤ 2 句话，或一个 ≤ 4 行的列表，不要任何复述）

格式 B：零思考 + 一句话
（直接一句话，不超过 30 字。用于打招呼、简单确认）

格式 C：纯 JSON（用于登记待办）
{"action":"create_todo", ...}
（这种情况下整条回复就是这一个 JSON，绝对不能有 <think>、不能有任何其它字符）

═══════════════════════════════════
【绝对禁止】
═══════════════════════════════════

🚫 这些句子在 </think> 之外**永远不能出现**：
- "用户问..."、"用户的..."、"用户可能..."
- "看看..."、"先看..."、"我看..."
- "按优先级..."、"按截止..."、"既要...又要..."
- "所以..."、"因此..."、"综上..."
- "好的"、"嗯"、"让我..."、"我需要..."
- 任何"X 是 Y 个、Y 是 Z 个"的统计陈列
- 任何带"，但..."、"，不过..."这种内心权衡

如果你发现自己写出了上面任何一种，**立即把它整段移到 <think> 里**。

🚫 最终答复**禁止罗列上下文数据**。
   错误示范："今天没有紧急任务，但有两个中等任务今天截止（程序开发 10:00、开周会 15:00），高优的调试网络还有5天，建议先把今明两天的优先排好。"
   ↑ 这是把推理过程当答复了，又长又乱。

   正确示范："最该先做：📌 调试网络（高优）。今天还有两件 medium 别忘 ⏰"
   ↑ 一个明确推荐 + 一句提醒，结束。

═══════════════════════════════════
【答复风格 · 必须遵守的句法】
═══════════════════════════════════

✅ 用「短结论 + 短补充」的两段式：
   "最该先做：XX。" + "（可选的 ≤ 15 字补充）"

✅ 多条信息用 markdown 列表（≤ 4 项），每项 ≤ 20 字：
   - 📌 调试网络（高优 · 6/19）
   - ⏰ 程序开发（今天 10:00）
   - ⏰ 周会（今天 15:00）

✅ 中文，活泼但简洁。可用 1 个表情（✅ 📌 ⏰ ☕️ 🌿 🔥），不堆砌。
✅ 当用户问"最紧急/最重要"时——直接给出 1 个明确推荐，不要陈列所有任务。

═══════════════════════════════════
【范例 · 严格按这个模式回答】
═══════════════════════════════════

例 1（打招呼）：
用户：你好
助手：你好呀 ☕️ 要不要看看今天最该先做的 3 件事？

例 2（询问紧急任务）：
用户：哪些任务最紧急？
助手：
<think>
没有 urgent 任务。高优 1 件：调试网络（6/19）。今天截止 2 件 medium：程序开发 10:00、周会 15:00。最该先做的是今天 10:00 那件，时间最紧迫。
</think>
最该先做：⏰ 「程序开发」今天 10:00 截止。
做完再排「周会」(15:00) 和高优的「调试网络」📌

例 3（询问今日忙碌度）：
用户：我今天忙不忙？
助手：
<think>
今天 2 件截止。算中等忙。
</think>
还行～🌿 今天 2 件要交，挤出 3 小时基本能收。

例 4（登记待办，纯 JSON）：
用户：明天下午 3 点和小王对需求，重要
助手：{"action":"create_todo","title":"和小王对接需求","priority":"high","dueDate":"2026-06-14T15:00","remindAt":null}

═══════════════════════════════════
【提取待办字段规则】
═══════════════════════════════════
触发词："登记/添加/记下/提醒我/帮我记一笔/别忘了/安排一下"等。
- title：6~20 字清晰标题，去口语词。
- priority：urgent(紧急/立刻/ASAP) / high(重要/尽快/这两天) / medium(默认) / low(有空/不急)
- dueDate：ISO "YYYY-MM-DDTHH:mm"。相对时间自己解析。上午→10:00 中午→12:00 下午→15:00 晚上→20:00。无则 null。
- remindAt：用户明确说"提醒我"才填。
- notes：补充信息（地点/参与人）。

═══════════════════════════════════
最后一句：思考全进 <think>，答复极简两段式。违反就是 bug。
`;

const SUGGESTIONS = [
  "帮我整理今天的待办",
  "哪些任务最紧急？",
  "本周完成了哪些事？",
  "记一笔：明天下午开周会",
];

function formatStats(todos: Todo[]): string {
  const total = todos.length;
  const todo = todos.filter((t) => t.status === "todo").length;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const done = todos.filter((t) => t.status === "done").length;
  const urgent = todos.filter((t) => t.priority === "urgent" && t.status !== "done").length;
  const high = todos.filter((t) => t.priority === "high" && t.status !== "done").length;
  const overdue = todos.filter((t) => {
    if (t.status === "done" || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  return `当前待办统计：总计 ${total}（待办 ${todo} / 进行中 ${inProgress} / 已完成 ${done}），紧急 ${urgent}，高优 ${high}，已过期 ${overdue}。`;
}

function formatTodoList(todos: Todo[], limit = 30): string {
  const active = todos.filter((t) => t.status !== "done").slice(0, limit);
  if (active.length === 0) return "当前没有未完成的待办。";
  return active
    .map((t, i) => {
      const due = t.dueDate ? ` [截止 ${t.dueDate.slice(0, 16).replace("T", " ")}]` : "";
      const src = t.source === "tapd" ? " [TAPD]" : "";
      return `${i + 1}. (${t.priority}/${t.status}) ${t.title}${due}${src}`;
    })
    .join("\n");
}

export default function AiChat() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 你好！我是你的待办小助手，可以帮你整理、分析任务，或快速登记新待办。",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      ts: Date.now(),
    };
    const pendingId = crypto.randomUUID();
    const pendingMsg: Message = {
      id: pendingId,
      role: "assistant",
      content: "",
      ts: Date.now(),
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput("");
    setSending(true);

    try {
      // Build context: stats + brief task list
      const contextHeader = `${formatStats(state.todos)}\n\n用户待办列表（前30条未完成）：\n${formatTodoList(state.todos)}`;

      // history (excluding pending + welcome)
      const history: ChatMessage[] = messages
        .filter((m) => !m.pending && m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessages: ChatMessage[] = [
        { role: "user", content: `（上下文）${contextHeader}` },
        { role: "assistant", content: "好的，我已了解你的待办情况。" },
        ...history,
        { role: "user", content },
      ];

      // OpenAI 协议：原生分离 reasoning_content 与 content
      const { content: rawContent, reasoning } = await aiChatFull(apiMessages, SYSTEM_PROMPT);

      // 双保险：即使部分模型把思考也塞进了 content（裹在 <think> 里或夹在前面），
      // 用 splitThinking 兜底再切一次。最终展示的 thinking = 网关返回的 reasoning_content
      // ⊕ content 内残留的思考块。
      const { thinking: leakedThinking, answer } = splitThinking(rawContent);
      const thinking = [reasoning, leakedThinking].filter(Boolean).join("\n\n").trim();

      // 用清洗后的 answer 去识别 create_todo JSON
      const createdTodo = await maybeCreateTodo(answer || rawContent, dispatch);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: createdTodo
                  ? `✓ 已为你登记待办：「${createdTodo.title}」`
                  : answer || rawContent || "（无内容）",
                thinking: createdTodo ? undefined : thinking || undefined,
                pending: false,
                createdTodo: createdTodo || undefined,
              }
            : m
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, content: `❌ 出错了：${msg}\n\n请在「设置 → 模型」中检查 API Key 与模型配置。`, pending: false }
            : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "👋 新会话开始啦，有什么我可以帮你的？",
        ts: Date.now(),
      },
    ]);
  }

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[10.5px] text-slate-400">AI 助手 · 在线</span>
        </div>
        <button
          onClick={clearChat}
          className="text-[10.5px] text-slate-500 hover:text-teal-300 transition-colors flex items-center gap-1"
          title="清空对话"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          清空
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {showSuggestions && (
          <div className="pt-1">
            <p className="text-[10px] text-slate-500 mb-1.5 pl-1">💡 试试这样问：</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending}
                  className="text-left text-[11.5px] px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-teal-300 transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pt-2 pb-3 border-t border-slate-800/80 bg-slate-950">
        <div className="relative rounded-xl border border-slate-700/60 bg-slate-900/60 focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/15 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="问我任何问题，或让我帮你登记待办..."
            rows={2}
            className="w-full resize-none bg-transparent px-3 pt-2 pb-8 text-[12px] text-slate-200 placeholder:text-slate-500 outline-none"
          />
          <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className="text-[9.5px] text-slate-500">Enter 发送 · Shift+Enter 换行</span>
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="h-6 px-2.5 rounded-md bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[10.5px] font-medium flex items-center gap-1 transition-colors"
            >
              {sending ? (
                <>
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  思考中
                </>
              ) : (
                <>
                  发送
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [showThinking, setShowThinking] = useState(false);
  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[78%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm bg-teal-500/90 text-white text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1.5 animate-fade-up">
      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" opacity="0.9" />
        </svg>
      </div>
      <div className="max-w-[82%] flex flex-col gap-1">
        {message.thinking && !message.pending && (
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 text-[10.5px] text-slate-400">
            <button
              onClick={() => setShowThinking((v) => !v)}
              className="w-full flex items-center gap-1 px-2 py-1 hover:text-teal-300 transition-colors"
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: showThinking ? "rotate(90deg)" : "none", transition: "transform .15s" }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span>💭 思考过程</span>
              <span className="text-slate-600">（已折叠）</span>
            </button>
            {showThinking && (
              <div className="px-2.5 pb-2 pt-0.5 text-slate-400/90 whitespace-pre-wrap break-words border-t border-slate-800/80 leading-relaxed">
                {message.thinking}
              </div>
            )}
          </div>
        )}
        <div className="px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-slate-800/80 text-slate-200 text-[12px] leading-relaxed border border-slate-700/60 whitespace-pre-wrap break-words">
          {message.pending ? (
            <span className="inline-flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
            </span>
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}

// Detect a JSON create action in the reply; if found, persist to db
async function maybeCreateTodo(
  reply: string,
  dispatch: ReturnType<typeof useAppDispatch>
): Promise<{ id: number; title: string } | null> {
  try {
    const m = reply.match(/\{[\s\S]*?"action"\s*:\s*"create_todo"[\s\S]*?\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as {
      action: string;
      title: string;
      priority?: "low" | "medium" | "high" | "urgent";
      dueDate?: string | null;
      remindAt?: string | null;
      notes?: string | null;
    };
    if (parsed.action !== "create_todo" || !parsed.title) return null;
    const now = new Date().toISOString();
    const descParts: string[] = [];
    if (parsed.notes) descParts.push(parsed.notes);
    if (parsed.remindAt) descParts.push(`⏰ 提醒：${parsed.remindAt.replace("T", " ")}`);
    const todo: Todo = {
      title: parsed.title,
      description: descParts.join("\n"),
      priority: parsed.priority || "medium",
      status: "todo",
      source: "manual",
      tags: [],
      dueDate: parsed.dueDate || null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
      parentId: null,
      tapdId: null,
      tapdWorkItemType: null,
      estimatedHours: null,
      subTasks: [],
    };
    const id = await db.todos.add(todo);
    const created = await db.todos.get(id);
    if (created) dispatch({ type: "ADD_TODO", payload: created });
    return { id: id as number, title: parsed.title };
  } catch {
    return null;
  }
}

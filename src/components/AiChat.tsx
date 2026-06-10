import { useState, useRef, useEffect } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiChat, type ChatMessage } from "@/services/ai";
import type { Todo } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  pending?: boolean;
  createdTodo?: { id: number; title: string };
}

const SYSTEM_PROMPT = `你是 To-Up-Do 待办管理工具的智能助手。回答简洁、实用，用中文。

你的能力：
1. 分析、整理用户的待办任务
2. 帮用户快速登记新待办
3. 解读统计数据，给优先级和时间管理建议

【重要】当用户希望登记新待办时（如"帮我记一笔..."、"加一个待办..."、"提醒我..."、"记一下..."），必须只返回严格的 JSON（不要 markdown、不要任何额外文字），格式：
{"action":"create_todo","title":"任务标题","priority":"low|medium|high|urgent","dueDate":null}

其他情况正常用自然语言回复，分析待办时可用简短的 markdown 列表。`;

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

      const reply = await aiChat(apiMessages, SYSTEM_PROMPT);

      // Try to detect a create_todo JSON action
      const createdTodo = await maybeCreateTodo(reply, dispatch);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: createdTodo ? `✓ 已为你登记待办：「${createdTodo.title}」` : reply,
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
            ? { ...m, content: `❌ 出错了：${msg}\n\n请确认后端服务已启动 (http://localhost:8787) 并已配置 AI。`, pending: false }
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
      <div className="max-w-[82%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm bg-slate-800/80 text-slate-200 text-[12px] leading-relaxed border border-slate-700/60 whitespace-pre-wrap break-words">
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
    };
    if (parsed.action !== "create_todo" || !parsed.title) return null;
    const now = new Date().toISOString();
    const todo: Todo = {
      title: parsed.title,
      description: "",
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

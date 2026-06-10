import { useState, useEffect, useRef } from "react";
import type { Todo, Priority, SubTask } from "@/types";

interface Props {
  todo: Todo | null;
  onSave: (todo: Omit<Todo, "id"> & { id?: number }) => void;
  onCancel: () => void;
  onAiBreakdown?: (title: string, description: string) => Promise<string[]>;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low", label: "低", color: "bg-slate-700/80 text-slate-300 ring-slate-600" },
  { value: "medium", label: "中", color: "bg-blue-500/20 text-blue-400 ring-blue-500/30" },
  { value: "high", label: "高", color: "bg-amber-500/20 text-amber-400 ring-amber-500/30" },
  { value: "urgent", label: "紧急", color: "bg-red-500/20 text-red-400 ring-red-500/30" },
];

const QUICK_DATES: { label: string; offset: number | "nextMon" | "nextSun"; hours?: number }[] = [
  { label: "今天", offset: 0, hours: 18 },
  { label: "明天", offset: 1, hours: 10 },
  { label: "后天", offset: 2, hours: 10 },
  { label: "下周", offset: "nextMon" as const, hours: 9 },
  { label: "下周末", offset: "nextSun" as const, hours: 10 },
  { label: "30分钟后", offset: 0.02 },
  { label: "1小时后", offset: 0.042 },
  { label: "明天早", offset: 1, hours: 9 },
];

function getDateForOffset(offset: number | "nextMon" | "nextSun", hours?: number): string {
  const d = new Date();
  if (offset === "nextMon") {
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(hours ?? 9, 0, 0, 0);
  } else if (offset === "nextSun") {
    const day = d.getDay();
    const diff = day === 0 ? 7 : 7 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(hours ?? 10, 0, 0, 0);
  } else if (offset < 1) {
    d.setTime(d.getTime() + offset * 24 * 60 * 60 * 1000);
  } else {
    d.setDate(d.getDate() + offset);
    d.setHours(hours ?? 18, 0, 0, 0);
  }
  return d.toISOString().slice(0, 16);
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (isToday) return `今天 ${time}`;
  if (isTomorrow) return `明天 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

const inputBase = "px-3 py-2 border border-slate-600 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder:text-slate-500 bg-slate-800 text-slate-200";

export default function TodoForm({ todo, onSave, onCancel, onAiBreakdown }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTask, setNewSubTask] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showQuickMore, setShowQuickMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!todo;

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description);
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.slice(0, 16) : "");
      setTags(todo.tags.join(", "));
      setSubTasks(todo.subTasks);
      if (todo.description || todo.subTasks.length > 0) setShowMore(true);
    }
    inputRef.current?.focus();
  }, [todo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(todo?.id ? { id: todo.id } : {}),
      title: title.trim(),
      description: description.trim(),
      priority,
      status: todo?.status || "todo",
      source: todo?.source || "manual",
      tags: tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean),
      dueDate: dueDate || null,
      completedAt: null,
      createdAt: todo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: todo?.order ?? Date.now(),
      parentId: todo?.parentId ?? null,
      tapdId: todo?.tapdId ?? null,
      tapdWorkItemType: todo?.tapdWorkItemType ?? null,
      estimatedHours: todo?.estimatedHours ?? null,
      subTasks,
    });
  }

  function addSubTask() {
    if (!newSubTask.trim()) return;
    setSubTasks([...subTasks, { id: crypto.randomUUID(), title: newSubTask.trim(), done: false }]);
    setNewSubTask("");
  }

  async function handleAiBreakdown() {
    if (!onAiBreakdown || !title.trim()) return;
    setAiLoading(true);
    try {
      const items = await onAiBreakdown(title, description);
      setSubTasks([...subTasks, ...items.map((item) => ({ id: crypto.randomUUID(), title: item, done: false }))]);
    } catch {}
    setAiLoading(false);
  }

  function clearDate() {
    setDueDate("");
    setShowQuickMore(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* Title row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`flex-1 ${inputBase}`}
          placeholder="记一笔，回车保存..."
          required
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <button type="submit" className="px-5 py-2 bg-teal-600 text-white text-[13px] font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shadow-sm">
          {isEdit ? "保存" : "添加"}
        </button>
      </div>

      {/* Priority + Date section */}
      <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-2.5 border border-slate-700/60">
        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">优先级</span>
          <div className="flex gap-1">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all ring-1 ${
                  priority === p.value ? p.color + " shadow-sm" : "bg-slate-800/80 text-slate-400 ring-slate-600 hover:ring-slate-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date quick picks */}
        <div className="flex items-start gap-1.5">
          <span className="text-[10px] text-slate-400 w-8 flex-shrink-0 mt-1">截止</span>
          <div className="flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              {QUICK_DATES.slice(0, 4).map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => setDueDate(getDateForOffset(qd.offset, qd.hours))}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                    dueDate && formatDateDisplay(dueDate).includes(qd.label.slice(0, 2))
                      ? "bg-teal-500/20 text-teal-400 font-medium"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-teal-400"
                  }`}
                >
                  {qd.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowQuickMore(!showQuickMore)}
                className="text-[11px] px-1.5 py-1 text-slate-500 hover:text-teal-400 transition-colors"
              >
                {showQuickMore ? "收起" : "更多"}
              </button>
              {dueDate && (
                <button type="button" onClick={clearDate} className="text-[11px] px-1.5 py-1 text-slate-500 hover:text-red-400 transition-colors">
                  清除
                </button>
              )}
            </div>

            {showQuickMore && (
              <div className="flex items-center gap-1 flex-wrap mt-1.5">
                {QUICK_DATES.slice(4).map((qd) => (
                  <button
                    key={qd.label}
                    type="button"
                    onClick={() => { setDueDate(getDateForOffset(qd.offset, qd.hours)); setShowQuickMore(false); }}
                    className="text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-teal-400 transition-colors"
                  >
                    {qd.label}
                  </button>
                ))}
                <input
                  ref={dateInputRef}
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); setShowQuickMore(false); }}
                  className="px-2 py-1 border border-slate-600 rounded-md text-[11px] outline-none focus:border-teal-400 text-slate-300 w-[135px] bg-slate-800"
                />
              </div>
            )}

            {dueDate && !showQuickMore && (
              <p className="text-[11px] text-teal-400 font-medium mt-1">{formatDateDisplay(dueDate)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Expand more */}
      {!showMore ? (
        <button type="button" onClick={() => setShowMore(true)} className="text-[12px] text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          描述 / 标签 / 子任务
        </button>
      ) : (
        <div className="space-y-3 bg-slate-800/60 rounded-lg p-3 border border-slate-700/60">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full ${inputBase} resize-none`}
            rows={2}
            placeholder="备注（可选）"
          />

          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={`w-full ${inputBase}`}
            placeholder="标签，逗号分隔"
          />

          {/* Sub tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400">子任务</span>
              {onAiBreakdown && (
                <button type="button" onClick={handleAiBreakdown} disabled={aiLoading || !title.trim()} className="text-[11px] text-teal-400 hover:text-teal-300 disabled:opacity-40 transition-colors font-medium">
                  {aiLoading ? "拆解中..." : "AI 拆解"}
                </button>
              )}
            </div>
            {subTasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2 py-1">
                <button type="button" onClick={() => setSubTasks(subTasks.map((s) => s.id === st.id ? { ...s, done: !s.done } : s))} className="text-[13px] flex-shrink-0 text-slate-400">
                  {st.done ? "☑" : "☐"}
                </button>
                <span className={`text-[12px] flex-1 truncate ${st.done ? "line-through text-slate-600" : "text-slate-300"}`}>{st.title}</span>
                <button type="button" onClick={() => setSubTasks(subTasks.filter((s) => s.id !== st.id))} className="text-[11px] text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubTask())}
                className={`flex-1 py-1.5 ${inputBase}`}
                placeholder="添加子任务"
              />
              <button type="button" onClick={addSubTask} className="px-3 py-1.5 text-[12px] font-medium bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors">+</button>
            </div>
          </div>
        </div>
      )}

      {isEdit && (
        <button type="button" onClick={onCancel} className="w-full py-2 text-[13px] text-slate-400 hover:text-slate-200 transition-colors">
          取消
        </button>
      )}
    </form>
  );
}

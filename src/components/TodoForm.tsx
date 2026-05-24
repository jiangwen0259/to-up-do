import { useState, useEffect, useRef } from "react";
import type { Todo, Priority, SubTask } from "@/types";

interface Props {
  todo: Todo | null;
  onSave: (todo: Omit<Todo, "id"> & { id?: number }) => void;
  onCancel: () => void;
  onAiBreakdown?: (title: string, description: string) => Promise<string[]>;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low", label: "低", color: "bg-slate-100 text-slate-500 ring-slate-200" },
  { value: "medium", label: "中", color: "bg-blue-50 text-blue-600 ring-blue-200" },
  { value: "high", label: "高", color: "bg-amber-50 text-amber-600 ring-amber-200" },
  { value: "urgent", label: "紧急", color: "bg-red-50 text-red-600 ring-red-200" },
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
    // fractional = hours from now
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-shadow"
          placeholder="记一笔，回车保存..."
          required
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <button type="submit" className="px-4 py-2 bg-indigo-500 text-white text-[12px] font-medium rounded-lg hover:bg-indigo-600 transition-colors whitespace-nowrap shadow-sm">
          {isEdit ? "保存" : "添加"}
        </button>
      </div>

      {/* Priority + Date row */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`text-[11px] px-2 py-1 rounded-md transition-all ring-1 ${
                priority === p.value ? p.color : "bg-white text-slate-400 ring-slate-100 hover:ring-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date quick picks */}
        <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
          {QUICK_DATES.slice(0, 4).map((qd) => (
            <button
              key={qd.label}
              type="button"
              onClick={() => setDueDate(getDateForOffset(qd.offset, qd.hours))}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                dueDate && formatDateDisplay(dueDate).includes(qd.label.slice(0, 2))
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500"
              }`}
            >
              {qd.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowQuickMore(!showQuickMore)}
            className="text-[10px] px-1 py-0.5 text-slate-400 hover:text-indigo-500"
          >
            {showQuickMore ? "收起" : "更多"}
          </button>
        </div>

        {showQuickMore && (
          <div className="flex items-center gap-1 flex-wrap">
            {QUICK_DATES.slice(4).map((qd) => (
              <button
                key={qd.label}
                type="button"
                onClick={() => { setDueDate(getDateForOffset(qd.offset, qd.hours)); setShowQuickMore(false); }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors"
              >
                {qd.label}
              </button>
            ))}
            {/* Custom datetime */}
            <div className="flex items-center gap-1">
              <input
                ref={dateInputRef}
                type="datetime-local"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setShowQuickMore(false); }}
                className="px-1.5 py-0.5 border border-slate-200 rounded text-[10px] outline-none focus:border-indigo-400 text-slate-500 w-[140px]"
              />
            </div>
          </div>
        )}

        {/* Selected date display + clear */}
        {dueDate && !showQuickMore && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-indigo-500 font-medium">{formatDateDisplay(dueDate)}</span>
            <button type="button" onClick={clearDate} className="text-[10px] text-slate-300 hover:text-red-400 transition-colors">清除</button>
          </div>
        )}
      </div>

      {/* Expand more */}
      {!showMore ? (
        <button type="button" onClick={() => setShowMore(true)} className="text-[11px] text-slate-400 hover:text-indigo-500 transition-colors">
          + 描述 / 标签 / 子任务
        </button>
      ) : (
        <>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] outline-none focus:border-indigo-400 resize-none transition-colors"
            rows={2}
            placeholder="备注（可选）"
          />

          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[12px] outline-none focus:border-indigo-400 transition-colors"
            placeholder="标签，逗号分隔"
          />

          {/* Sub tasks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">子任务</span>
              {onAiBreakdown && (
                <button type="button" onClick={handleAiBreakdown} disabled={aiLoading || !title.trim()} className="text-[11px] text-indigo-500 hover:text-indigo-600 disabled:opacity-50">
                  {aiLoading ? "拆解中..." : "AI 拆解 ✨"}
                </button>
              )}
            </div>
            {subTasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2 py-0.5">
                <button type="button" onClick={() => setSubTasks(subTasks.map((s) => s.id === st.id ? { ...s, done: !s.done } : s))} className="text-[13px]">
                  {st.done ? "☑" : "☐"}
                </button>
                <span className={`text-[12px] flex-1 ${st.done ? "line-through text-slate-400" : ""}`}>{st.title}</span>
                <button type="button" onClick={() => setSubTasks(subTasks.filter((s) => s.id !== st.id))} className="text-[11px] text-slate-400 hover:text-red-500">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubTask())}
                className="flex-1 px-2 py-1 border border-slate-200 rounded text-[12px] outline-none focus:border-indigo-400"
                placeholder="添加子任务"
              />
              <button type="button" onClick={addSubTask} className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 rounded ring-1 ring-slate-200">+</button>
            </div>
          </div>
        </>
      )}

      {isEdit && (
        <button type="button" onClick={onCancel} className="w-full py-1.5 text-[12px] text-slate-400 hover:text-slate-600">
          取消
        </button>
      )}
    </form>
  );
}

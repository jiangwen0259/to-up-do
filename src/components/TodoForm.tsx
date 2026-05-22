import { useState, useEffect, useRef } from "react";
import type { Todo, Priority, SubTask } from "@/types";

interface Props {
  todo: Todo | null;
  onSave: (todo: Omit<Todo, "id"> & { id?: number }) => void;
  onCancel: () => void;
  onAiBreakdown?: (title: string, description: string) => Promise<string[]>;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low", label: "低", color: "bg-gray-200 text-gray-600" },
  { value: "medium", label: "中", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "高", color: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "紧急", color: "bg-red-100 text-red-700" },
];

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 核心区：输入框 + 快捷操作，一行搞定 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="记一笔，回车保存..."
          required
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap">
          {isEdit ? "保存" : "添加"}
        </button>
      </div>

      {/* 优先级快捷选择 + 截止时间 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                priority === p.value ? p.color : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="ml-auto px-2 py-1 border border-gray-200 rounded-md text-xs outline-none focus:border-blue-400 text-gray-500"
        />
      </div>

      {/* 展开/收起更多选项 */}
      {!showMore ? (
        <button type="button" onClick={() => setShowMore(true)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
          + 描述 / 标签 / 子任务
        </button>
      ) : (
        <>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 resize-none"
            rows={2}
            placeholder="备注（可选）"
          />

          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
            placeholder="标签，逗号分隔"
          />

          {/* 子任务 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">子任务</span>
              {onAiBreakdown && (
                <button type="button" onClick={handleAiBreakdown} disabled={aiLoading || !title.trim()} className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50">
                  {aiLoading ? "拆解中..." : "AI 拆解 ✨"}
                </button>
              )}
            </div>
            {subTasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2 py-0.5">
                <button type="button" onClick={() => setSubTasks(subTasks.map((s) => s.id === st.id ? { ...s, done: !s.done } : s))} className="text-sm">
                  {st.done ? "☑" : "☐"}
                </button>
                <span className={`text-sm flex-1 ${st.done ? "line-through text-gray-400" : ""}`}>{st.title}</span>
                <button type="button" onClick={() => setSubTasks(subTasks.filter((s) => s.id !== st.id))} className="text-xs text-gray-400 hover:text-red-500">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubTask())}
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-400"
                placeholder="添加子任务"
              />
              <button type="button" onClick={addSubTask} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">+</button>
            </div>
          </div>
        </>
      )}

      {/* 编辑模式显示取消按钮 */}
      {isEdit && (
        <button type="button" onClick={onCancel} className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-700">
          取消
        </button>
      )}
    </form>
  );
}

import { useState, useEffect } from "react";
import type { Todo, Priority, SubTask } from "@/types";

interface Props {
  todo: Todo | null;
  onSave: (todo: Omit<Todo, "id"> & { id?: number }) => void;
  onCancel: () => void;
  onAiBreakdown?: (title: string, description: string) => Promise<string[]>;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "urgent", label: "紧急" },
];

export default function TodoForm({ todo, onSave, onCancel, onAiBreakdown }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTask, setNewSubTask] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const isEdit = !!todo;

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description);
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.slice(0, 16) : "");
      setTags(todo.tags.join(", "));
      setSubTasks(todo.subTasks);
    }
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
      tags: tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
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

  function toggleSubTask(id: string) {
    setSubTasks(subTasks.map((st) => (st.id === id ? { ...st, done: !st.done } : st)));
  }

  function removeSubTask(id: string) {
    setSubTasks(subTasks.filter((st) => st.id !== id));
  }

  async function handleAiBreakdown() {
    if (!onAiBreakdown || !title.trim()) return;
    setAiLoading(true);
    try {
      const items = await onAiBreakdown(title, description);
      const newItems = items.map((item) => ({
        id: crypto.randomUUID(),
        title: item,
        done: false,
      }));
      setSubTasks([...subTasks, ...newItems]);
    } catch {
      // silent fail
    }
    setAiLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="输入待办事项..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          rows={3}
          placeholder="详细描述（可选）"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="多个标签用逗号分隔"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">子任务</label>
          {onAiBreakdown && (
            <button
              type="button"
              onClick={handleAiBreakdown}
              disabled={aiLoading || !title.trim()}
              className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? "AI 拆解中..." : "AI 智能拆解 ✨"}
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {subTasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2">
              <button type="button" onClick={() => toggleSubTask(st.id)} className="text-sm">
                {st.done ? "☑" : "☐"}
              </button>
              <span className={`text-sm flex-1 ${st.done ? "line-through text-gray-400" : ""}`}>
                {st.title}
              </span>
              <button
                type="button"
                onClick={() => removeSubTask(st.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubTask}
              onChange={(e) => setNewSubTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubTask())}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-400"
              placeholder="添加子任务"
            />
            <button
              type="button"
              onClick={addSubTask}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          {isEdit ? "保存" : "创建"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}

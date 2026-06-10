import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiBreakdownTask } from "@/services/ai";
import TodoList from "@/components/TodoList";
import TodoForm from "@/components/TodoForm";
import Settings from "@/components/Settings";
import type { Todo, TodoStatus } from "@/types";

type View = "board" | "add" | "edit" | "settings";

export default function SidePanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>("board");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  useEffect(() => {
    loadTodos();
    loadSettings();
  }, []);

  async function loadTodos() {
    const todos = await db.todos.orderBy("order").toArray();
    dispatch({ type: "SET_TODOS", payload: todos });
  }

  async function loadSettings() {
    const settings = await import("@/db").then((m) => m.getSettings());
    dispatch({ type: "SET_SETTINGS", payload: settings });
  }

  async function handleSave(todo: Omit<Todo, "id"> & { id?: number }) {
    if (todo.id) {
      await db.todos.update(todo.id, todo);
      const updated = await db.todos.get(todo.id);
      if (updated) dispatch({ type: "UPDATE_TODO", payload: updated });
    } else {
      const id = await db.todos.add(todo as Todo);
      const created = await db.todos.get(id);
      if (created) dispatch({ type: "ADD_TODO", payload: created });
    }
    setView("board");
    setEditingTodo(null);
  }

  async function handleDelete(id: number) {
    await db.todos.delete(id);
    dispatch({ type: "DELETE_TODO", payload: id });
  }

  async function handleToggle(id: number) {
    const todo = await db.todos.get(id);
    if (!todo) return;
    const nextStatus: Record<TodoStatus, TodoStatus> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    const newStatus = nextStatus[todo.status];
    const updated = {
      ...todo,
      status: newStatus,
      completedAt: newStatus === "done" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    await db.todos.update(id, updated);
    dispatch({ type: "UPDATE_TODO", payload: updated });
  }

  function handleEdit(todo: Todo) {
    setEditingTodo(todo);
    setView("edit");
  }

  async function handleAiBreakdown(title: string, description: string): Promise<string[]> {
    if (!state.settings.ai.enabled) return [];
    try {
      return await aiBreakdownTask(title, description);
    } catch {
      return [];
    }
  }

  const todoItems = state.todos.filter((t) => t.status === "todo");
  const inProgressItems = state.todos.filter((t) => t.status === "in_progress");
  const doneItems = state.todos.filter((t) => t.status === "done");

  const columns = [
    { title: "待办", status: "todo" as const, items: todoItems, color: "border-t-slate-500", bg: "bg-slate-800/30", dot: "bg-slate-500" },
    { title: "进行中", status: "in_progress" as const, items: inProgressItems, color: "border-t-teal-400", bg: "bg-teal-500/10", dot: "bg-teal-400" },
    { title: "已完成", status: "done" as const, items: doneItems, color: "border-t-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  ];

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_70%)]" />

        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 glass flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <div>
                <h1 className="logo-text text-[18px] leading-none">To-Up-Do</h1>
                <p className="text-[8px] text-white mt-0.5 tracking-[0.2em]">SMART TODO MANAGER</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("settings")}
                className="w-8 h-8 rounded-lg bg-white/10 glass text-white hover:text-white hover:bg-white/25 transition-all flex items-center justify-center"
                title="设置"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={() => { setEditingTodo(null); setView("add"); }}
                className="h-8 px-4 rounded-lg bg-white text-teal-700 text-[13px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                新建待办
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {view === "board" && (
          <div className="grid grid-cols-3 gap-5 h-full">
            {columns.map((col) => (
              <div key={col.status} className="bg-slate-800/60 rounded-xl border border-slate-700/60 shadow-sm flex flex-col overflow-hidden">
                <div className={`px-4 py-3 border-t-4 ${col.color} border-b border-slate-700`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <h3 className="font-semibold text-slate-300 text-[13px]">{col.title}</h3>
                    </div>
                    <span className="text-[11px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-medium tabular-nums">
                      {col.items.length}
                    </span>
                  </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-3 ${col.bg}`}>
                  <TodoList
                    todos={col.items}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    emptyMessage="暂无"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {(view === "add" || view === "edit") && (
          <div className="max-w-xl mx-auto bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-200 mb-5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-teal-500" />
              {view === "add" ? "新建待办" : "编辑待办"}
            </h2>
            <TodoForm
              todo={editingTodo}
              onSave={handleSave}
              onCancel={() => { setView("board"); setEditingTodo(null); }}
              onAiBreakdown={state.settings.ai.enabled ? handleAiBreakdown : undefined}
            />
          </div>
        )}

        {view === "settings" && (
          <div className="max-w-xl mx-auto">
            <Settings onClose={() => setView("board")} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiBreakdownTask } from "@/services/ai";
import TodoList from "@/components/TodoList";
import TodoForm from "@/components/TodoForm";
import Settings from "@/components/Settings";
import type { Todo, TodoStatus, Priority } from "@/types";

type View = "list" | "add" | "edit" | "settings";

const FILTER_CONFIG = [
  { key: "all" as const, label: "全部", icon: "M4 6h16M4 12h16M4 18h16" },
  { key: "todo" as const, label: "待办", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "in_progress" as const, label: "进行中", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { key: "done" as const, label: "完成", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Popup() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>("list");
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
    const { getSettings } = await import("@/db");
    const settings = await getSettings();
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
    setView("list");
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

  function goHome() {
    setView("list");
    setEditingTodo(null);
  }

  async function handlePriorityChange(id: number) {
    const todo = await db.todos.get(id);
    if (!todo) return;
    const cycle: Priority[] = ["low", "medium", "high", "urgent"];
    const idx = cycle.indexOf(todo.priority);
    const next = cycle[(idx + 1) % cycle.length];
    const updated = { ...todo, priority: next, updatedAt: new Date().toISOString() };
    await db.todos.update(id, updated);
    dispatch({ type: "UPDATE_TODO", payload: updated });
  }

  async function handleReorder(fromId: number, toId: number) {
    const todos = state.todos;
    const fromIdx = todos.findIndex((t) => t.id === fromId);
    const toIdx = todos.findIndex((t) => t.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...todos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const updates = reordered.map((t, i) => ({
      key: t.id!,
      changes: { order: i, updatedAt: new Date().toISOString() },
    }));

    await db.transaction("rw", db.todos, async () => {
      for (const u of updates) {
        await db.todos.update(u.key, u.changes);
      }
    });

    dispatch({ type: "SET_TODOS", payload: reordered.map((t, i) => ({ ...t, order: i })) });
  }

  async function handleAiBreakdown(title: string, description: string): Promise<string[]> {
    if (!state.settings.ai.enabled) return [];
    try {
      return await aiBreakdownTask(title, description);
    } catch {
      return [];
    }
  }

  const filteredTodos = state.todos.filter((t) => {
    if (state.filter.status !== "all" && t.status !== state.filter.status) return false;
    if (state.filter.source !== "all" && t.source !== "all") return false;
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: state.todos.length,
    todo: state.todos.filter((t) => t.status === "todo").length,
    inProgress: state.todos.filter((t) => t.status === "in_progress").length,
    done: state.todos.filter((t) => t.status === "done").length,
  };

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="w-[400px] min-h-[520px] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_70%)]" />

        <div className="relative px-5 pt-4 pb-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={goHome} className="flex items-center gap-2.5 group/title" title="返回首页">
              <div className="w-8 h-8 rounded-xl bg-white/15 glass flex items-center justify-center group-hover/title:bg-white/25 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="logo-text text-[16px] leading-none">To-Up-Do</h1>
                <p className="text-[8px] text-white/35 mt-0.5 tracking-[0.2em]">SMART TODO MANAGER</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("settings")}
                className="w-7 h-7 rounded-lg bg-white/10 glass text-white/60 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center"
                title="设置"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={() => { setEditingTodo(null); setView("add"); }}
                className="h-7 px-3 rounded-lg bg-white text-indigo-600 text-[12px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1 shadow-sm"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                新建
              </button>
            </div>
          </div>

          {/* Progress */}
          {view === "list" && stats.total > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/40 tracking-wide">完成进度</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/70 font-semibold tabular-nums">{stats.done}</span>
                  <span className="text-[10px] text-white/30">/</span>
                  <span className="text-[10px] text-white/50 tabular-nums">{stats.total}</span>
                  <span className="text-[10px] text-white/40 ml-0.5">{progress}%</span>
                </div>
              </div>
              <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Left sidebar nav tabs */}
          {view === "list" && (
            <div className="flex gap-1">
              {FILTER_CONFIG.map((f) => {
                const count = f.key === "all" ? stats.total
                  : f.key === "todo" ? stats.todo
                  : f.key === "in_progress" ? stats.inProgress
                  : stats.done;
                const active = state.filter.status === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => dispatch({ type: "SET_FILTER", payload: { status: f.key } })}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? "bg-white/90 text-indigo-600 shadow-sm"
                        : "text-white/45 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                    <span>{f.label}</span>
                    <span className={`text-[10px] ${active ? "text-indigo-400" : "opacity-70"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        <div className="animate-fade-up">
          {view === "list" && (
            <TodoList
              todos={filteredTodos}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReorder={handleReorder}
              onPriorityChange={handlePriorityChange}
              emptyMessage="点击「新建」开始记录待办"
            />
          )}

          {(view === "add" || view === "edit") && (
            <TodoForm
              todo={editingTodo}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingTodo(null); }}
              onAiBreakdown={state.settings.ai.enabled ? handleAiBreakdown : undefined}
            />
          )}

          {view === "settings" && <Settings onClose={() => setView("list")} />}
        </div>
      </div>
    </div>
  );
}

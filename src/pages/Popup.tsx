// Design anchor: Refined Minimal (dark variant) — fine strokes, cool neutral palette,
// 4/8px spacing grid, restrained color, teal as the single accent.
import { useState, useEffect } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiBreakdownTask } from "@/services/ai";
import TodoList from "@/components/TodoList";
import TodoForm from "@/components/TodoForm";
import Settings from "@/components/Settings";
import AiChat from "@/components/AiChat";
import type { Todo, TodoStatus, Priority } from "@/types";

type View = "list" | "add" | "edit" | "settings" | "assistant";
type FilterKey = "all" | "todo" | "in_progress" | "done";
type SourceKey = "all" | "manual" | "tapd";

const SOURCE_TABS: { key: SourceKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "manual", label: "我的" },
  { key: "tapd", label: "TAPD" },
];

const FILTER_CONFIG: { key: FilterKey; label: string; icon: JSX.Element }[] = [
  {
    key: "all",
    label: "全部",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="18" height="4" rx="1" />
        <rect x="3" y="16" width="18" height="4" rx="1" />
      </svg>
    ),
  },
  {
    key: "todo",
    label: "待办",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    key: "in_progress",
    label: "进行中",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 11-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    ),
  },
  {
    key: "done",
    label: "已完成",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
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
      for (const u of updates) await db.todos.update(u.key, u.changes);
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

  // Source-aware stats
  const todosBySource = state.todos.filter((t) => {
    if (state.filter.source === "all") return true;
    return t.source === state.filter.source;
  });

  const stats = {
    all: todosBySource.length,
    todo: todosBySource.filter((t) => t.status === "todo").length,
    in_progress: todosBySource.filter((t) => t.status === "in_progress").length,
    done: todosBySource.filter((t) => t.status === "done").length,
  };

  const currentFilter = FILTER_CONFIG.find((f) => f.key === state.filter.status) || FILTER_CONFIG[0];
  const progress = stats.all > 0 ? Math.round((stats.done / stats.all) * 100) : 0;

  const filteredTodos = state.todos.filter((t) => {
    if (state.filter.source !== "all" && t.source !== state.filter.source) return false;
    if (state.filter.status !== "all" && t.status !== state.filter.status) return false;
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isNonList = view !== "list";
  const headerTitle =
    view === "add" ? "新建待办"
    : view === "edit" ? "编辑待办"
    : view === "settings" ? "设置"
    : view === "assistant" ? "智能助手"
    : currentFilter.label;

  return (
    <div className="w-[480px] h-[560px] flex bg-slate-950 text-slate-200">
      {/* ─────────────── Sidebar ─────────────── */}
      <aside className="w-[148px] flex flex-col bg-slate-900/70 border-r border-slate-800/80">
        {/* Brand */}
        <div className="px-3 pt-3.5 pb-3">
          <button
            onClick={() => { setView("list"); setEditingTodo(null); }}
            className="flex items-center gap-2 w-full group"
            title="返回首页"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_0_1px_rgba(45,212,191,0.25),0_4px_12px_-2px_rgba(13,148,136,0.4)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <div className="text-left leading-tight min-w-0">
              <h1 className="logo-text text-[14px] leading-none">To-Up-Do</h1>
              <p className="text-[7.5px] text-slate-500 mt-1 tracking-[0.18em] truncate">SMART · TODO</p>
            </div>
          </button>
        </div>

        {/* New */}
        <div className="px-3 pb-1.5">
          <button
            onClick={() => { setEditingTodo(null); setView("add"); }}
            className="w-full h-8 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-white text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_4px_10px_-3px_rgba(20,184,166,0.55)]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建待办
          </button>
        </div>

        {/* AI Assistant */}
        <div className="px-3 pb-3">
          <button
            onClick={() => { setEditingTodo(null); setView("assistant"); }}
            className={`group relative w-full h-8 rounded-lg overflow-hidden text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all border ${
              view === "assistant"
                ? "border-teal-400/40 bg-gradient-to-r from-teal-500/15 via-emerald-500/15 to-cyan-500/15 text-teal-200 shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_4px_12px_-4px_rgba(20,184,166,0.4)]"
                : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:text-teal-200 hover:border-teal-500/30 hover:bg-slate-800/70"
            }`}
            title="智能助手 — 整理待办、快速登记"
          >
            {/* Subtle shimmer on hover */}
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(110deg,transparent_35%,rgba(45,212,191,0.12)_50%,transparent_65%)] bg-[length:200%_100%] animate-shimmer pointer-events-none" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" opacity="0.6" />
            </svg>
            <span className="relative">智能助手</span>
          </button>
        </div>

        {/* Source tabs */}
        <div className="px-3 pb-3">
          <div className="relative flex bg-slate-800/60 rounded-lg p-[3px]">
            {/* Sliding indicator */}
            <span
              className="absolute top-[3px] bottom-[3px] rounded-md bg-slate-700/90 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(148,163,184,0.08)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                left: `calc(${SOURCE_TABS.findIndex((s) => s.key === state.filter.source) * (100 / SOURCE_TABS.length)}% + 3px)`,
                width: `calc(${100 / SOURCE_TABS.length}% - 6px)`,
              }}
            />
            {SOURCE_TABS.map((s) => {
              const active = state.filter.source === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    dispatch({ type: "SET_FILTER", payload: { source: s.key } });
                    setView("list");
                    setEditingTodo(null);
                  }}
                  className={`relative z-10 flex-1 h-6 rounded-md text-[10.5px] font-medium transition-colors duration-200 ${
                    active ? "text-slate-100" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section label */}
        <div className="px-4 pt-0.5 pb-1.5">
          <span className="text-[9.5px] tracking-[0.18em] text-slate-500 font-medium uppercase">Filter</span>
        </div>

        {/* Filter nav */}
        <nav className="px-2 flex flex-col gap-0.5">
          {FILTER_CONFIG.map((f) => {
            const active = view === "list" && state.filter.status === f.key;
            const count = stats[f.key];
            return (
              <button
                key={f.key}
                onClick={() => {
                  dispatch({ type: "SET_FILTER", payload: { status: f.key } });
                  setView("list");
                  setEditingTodo(null);
                }}
                className={`relative h-8 pl-2.5 pr-2 rounded-md flex items-center gap-2 text-[12px] transition-colors group ${
                  active
                    ? "bg-slate-800/80 text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                {/* active rail */}
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full transition-all ${
                    active ? "bg-teal-400" : "bg-transparent"
                  }`}
                />
                <span className={active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300"}>
                  {f.icon}
                </span>
                <span className="flex-1 text-left">{f.label}</span>
                <span
                  className={`text-[10px] tabular-nums px-1.5 h-[18px] min-w-[20px] rounded-md flex items-center justify-center font-medium transition-colors duration-300 ${
                    active
                      ? "bg-teal-500/15 text-teal-300"
                      : "bg-slate-800/80 text-slate-500 group-hover:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress widget */}
        <div className="px-3 pb-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9.5px] tracking-[0.15em] text-slate-500 uppercase">Progress</span>
              <span className="text-[10px] text-slate-300 font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-500">
              <span>{stats.done} 已完成</span>
              <span>/ {stats.all}</span>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="px-2 pb-2.5">
          <button
            onClick={() => setView("settings")}
            className={`w-full h-8 px-2.5 rounded-md flex items-center gap-2 text-[12px] transition-colors ${
              view === "settings"
                ? "bg-slate-800/80 text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="flex-1 text-left">设置</span>
          </button>
        </div>
      </aside>

      {/* ─────────────── Main ─────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Content header */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-100 tracking-tight truncate">{headerTitle}</h2>
            {view === "list" && (
              <span className="text-[11px] text-slate-500 tabular-nums">{filteredTodos.length} 项</span>
            )}
          </div>
          {isNonList && (
            <button
              onClick={() => { setView("list"); setEditingTodo(null); }}
              className="text-[11px] text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              返回
            </button>
          )}
        </div>

        {/* Content body */}
        <div className={`flex-1 overflow-hidden ${view === "assistant" ? "" : "overflow-y-auto px-3 py-3"}`}>
          {view === "assistant" ? (
            <AiChat />
          ) : (
            <div className="animate-fade-up" key={`${state.filter.source}-${state.filter.status}`}>
              {view === "list" && (
                <TodoList
                  todos={filteredTodos}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReorder={handleReorder}
                  onPriorityChange={handlePriorityChange}
                  emptyMessage="还没有待办，点击左侧「新建待办」开始记录"
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
          )}
        </div>
      </main>
    </div>
  );
}

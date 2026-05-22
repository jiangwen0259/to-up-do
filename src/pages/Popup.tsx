import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import { useAppState, useAppDispatch } from "@/stores";
import { aiBreakdownTask } from "@/services/ai";
import TodoList from "@/components/TodoList";
import TodoForm from "@/components/TodoForm";
import Settings from "@/components/Settings";
import type { Todo, TodoStatus } from "@/types";

type View = "list" | "add" | "edit" | "settings";

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
    if (state.filter.source !== "all" && t.source !== state.filter.source) return false;
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

  return (
    <div className="w-[380px] min-h-[500px] bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">To-Up-Do</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView("settings")}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="设置"
            >
              ⚙
            </button>
            <button
              onClick={() => {
                setEditingTodo(null);
                setView("add");
              }}
              className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              + 新建
            </button>
          </div>
        </div>

        {view === "list" && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => dispatch({ type: "SET_FILTER", payload: { status: "all" } })}
              className={`text-xs px-2 py-1 rounded-full ${state.filter.status === "all" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
            >
              全部 {stats.total}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_FILTER", payload: { status: "todo" } })}
              className={`text-xs px-2 py-1 rounded-full ${state.filter.status === "todo" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
            >
              待办 {stats.todo}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_FILTER", payload: { status: "in_progress" } })}
              className={`text-xs px-2 py-1 rounded-full ${state.filter.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
            >
              进行中 {stats.inProgress}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_FILTER", payload: { status: "done" } })}
              className={`text-xs px-2 py-1 rounded-full ${state.filter.status === "done" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
            >
              完成 {stats.done}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {view === "list" && (
          <TodoList
            todos={filteredTodos}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyMessage="点击右上角「+ 新建」添加待办"
          />
        )}

        {(view === "add" || view === "edit") && (
          <TodoForm
            todo={editingTodo}
            onSave={handleSave}
            onCancel={() => {
              setView("list");
              setEditingTodo(null);
            }}
            onAiBreakdown={state.settings.ai.enabled ? handleAiBreakdown : undefined}
          />
        )}

        {view === "settings" && <Settings onClose={() => setView("list")} />}
      </div>
    </div>
  );
}

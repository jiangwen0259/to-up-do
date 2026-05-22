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
    { title: "待办", status: "todo" as const, items: todoItems, color: "border-t-blue-400" },
    { title: "进行中", status: "in_progress" as const, items: inProgressItems, color: "border-t-orange-400" },
    { title: "已完成", status: "done" as const, items: doneItems, color: "border-t-green-400" },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">To-Up-Do</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView("settings")}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="设置"
            >
              ⚙
            </button>
            <button
              onClick={() => {
                setEditingTodo(null);
                setView("add");
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              + 新建待办
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {view === "board" && (
          <div className="grid grid-cols-3 gap-4 h-full">
            {columns.map((col) => (
              <div key={col.status} className={`bg-white rounded-lg border border-gray-200 border-t-4 ${col.color} flex flex-col`}>
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">{col.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {col.items.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
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
          <div className="max-w-xl mx-auto">
            <h2 className="text-lg font-bold mb-4">{view === "add" ? "新建待办" : "编辑待办"}</h2>
            <TodoForm
              todo={editingTodo}
              onSave={handleSave}
              onCancel={() => {
                setView("board");
                setEditingTodo(null);
              }}
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

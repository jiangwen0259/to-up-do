import { useState } from "react";
import type { Todo } from "@/types";
import TodoItemView from "./TodoItem";

interface Props {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onReorder: (fromId: number, toId: number) => void;
  onPriorityChange: (id: number) => void;
  emptyMessage?: string;
}

export default function TodoList({ todos, onToggle, onDelete, onEdit, onReorder, onPriorityChange, emptyMessage }: Props) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  if (todos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto mb-3 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <p className="text-[12px] text-slate-400">{emptyMessage || "暂无待办"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {todos.map((todo) =>
        todo.id ? (
          <TodoItemView
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            onPriorityChange={onPriorityChange}
            isDragging={dragId === todo.id}
            isDragOver={overId === todo.id}
            dragHandlers={{
              onDragStart: () => setDragId(todo.id!),
              onDragOver: (e) => { e.preventDefault(); setOverId(todo.id!); },
              onDrop: () => { if (dragId && dragId !== todo.id) onReorder(dragId, todo.id!); setDragId(null); setOverId(null); },
              onDragEnd: () => { setDragId(null); setOverId(null); },
            }}
          />
        ) : null
      )}
    </div>
  );
}

import type { Todo } from "@/types";
import TodoItemView from "./TodoItem";

interface Props {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  emptyMessage?: string;
}

export default function TodoList({ todos, onToggle, onDelete, onEdit, emptyMessage }: Props) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm">{emptyMessage || "暂无待办"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) =>
        todo.id ? (
          <TodoItemView
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : null
      )}
    </div>
  );
}

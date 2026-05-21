import type { Todo, Priority, TodoStatus } from "@/types";
import { priorityLabel, priorityColor, statusLabel, formatDate, isOverdue } from "@/utils/date";

interface Props {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
}

const STATUS_ICONS: Record<TodoStatus, string> = {
  todo: "○",
  in_progress: "◐",
  done: "●",
};

export default function TodoItem({ todo, onToggle, onDelete, onEdit }: Props) {
  const isDone = todo.status === "done";
  const overdue = !isDone && isOverdue(todo.dueDate);

  const nextStatus: Record<TodoStatus, TodoStatus> = {
    todo: "in_progress",
    in_progress: "done",
    done: "todo",
  };

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
        isDone ? "opacity-60" : ""
      } ${overdue ? "border-red-300 bg-red-50/50" : "border-gray-200"}`}
    >
      <button
        onClick={() => todo.id && onToggle(todo.id)}
        className="mt-0.5 text-lg flex-shrink-0 hover:scale-110 transition-transform"
        title={`状态: ${statusLabel(todo.status)}（点击切换）`}
      >
        {STATUS_ICONS[todo.status]}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
            {todo.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColor(todo.priority)}`}>
            {priorityLabel(todo.priority)}
          </span>
          {todo.source === "tapd" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">TAPD</span>
          )}
        </div>

        {todo.description && (
          <p className="text-xs text-gray-500 truncate">{todo.description}</p>
        )}

        {todo.subTasks.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {todo.subTasks.map((st) => (
              <div key={st.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>{st.done ? "☑" : "☐"}</span>
                <span className={st.done ? "line-through" : ""}>{st.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          {todo.dueDate && (
            <span className={overdue ? "text-red-500 font-medium" : ""}>
              {formatDate(todo.dueDate)}
            </span>
          )}
          {todo.tags.length > 0 && (
            <span>{todo.tags.map((t) => `#${t}`).join(" ")}</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(todo)}
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          title="编辑"
        >
          ✎
        </button>
        <button
          onClick={() => todo.id && onDelete(todo.id)}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          title="删除"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

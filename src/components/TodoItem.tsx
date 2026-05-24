import type { Todo, Priority, TodoStatus } from "@/types";
import { formatDate, isOverdue } from "@/utils/date";

interface Props {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onPriorityChange: (id: number) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}

const STATUS: Record<TodoStatus, { label: string; style: string }> = {
  todo: { label: "待办", style: "bg-slate-100 text-slate-500 hover:bg-slate-200/70" },
  in_progress: { label: "进行中", style: "bg-blue-100 text-blue-600 hover:bg-blue-200/70" },
  done: { label: "完成", style: "bg-emerald-100 text-emerald-600 hover:bg-emerald-200/70" },
};

const PRIORITY: Record<Priority, { label: string; color: string; dot: string }> = {
  low: { label: "低", color: "text-slate-400", dot: "bg-slate-300" },
  medium: { label: "中", color: "text-blue-500", dot: "bg-blue-400" },
  high: { label: "高", color: "text-amber-500", dot: "bg-amber-400" },
  urgent: { label: "紧急", color: "text-red-500", dot: "bg-red-400" },
};

export default function TodoItem({ todo, onToggle, onDelete, onEdit, onPriorityChange, isDragging, isDragOver, dragHandlers }: Props) {
  const isDone = todo.status === "done";
  const overdue = !isDone && isOverdue(todo.dueDate);
  const s = STATUS[todo.status];
  const p = PRIORITY[todo.priority];

  return (
    <div
      className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 select-none
        ${isDragging ? "opacity-30 border-blue-300 bg-blue-50/30 scale-[0.98]" : ""}
        ${isDragOver && !isDragging ? "border-blue-300/70 bg-blue-50/40" : ""}
        ${!isDragging && !isDragOver ? "border-slate-200/70 bg-white hover:border-slate-300/80" : ""}
        ${isDone && !isDragging ? "opacity-45" : ""}
        ${overdue && !isDragging ? "!border-red-200 !bg-red-50/30" : ""}
      `}
      draggable
      {...dragHandlers}
    >
      {/* Drag handle */}
      <div className="mt-1.5 cursor-grab active:cursor-grabbing text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2.5" cy="2" r="1.2" /><circle cx="7.5" cy="2" r="1.2" />
          <circle cx="2.5" cy="7" r="1.2" /><circle cx="7.5" cy="7" r="1.2" />
          <circle cx="2.5" cy="12" r="1.2" /><circle cx="7.5" cy="12" r="1.2" />
        </svg>
      </div>

      {/* Status badge */}
      <button
        onClick={() => todo.id && onToggle(todo.id)}
        className={`mt-1 text-[10px] leading-none px-1.5 py-[3px] rounded-md font-medium transition-colors flex-shrink-0 ${s.style}`}
        title="点击切换状态"
      >
        {s.label}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug truncate ${isDone ? "line-through text-slate-400" : "text-slate-700"}`}>
          {todo.title}
        </p>

        {todo.description && !isDone && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">{todo.description}</p>
        )}

        {todo.subTasks.length > 0 && (
          <div className="mt-1 space-y-px">
            {todo.subTasks.slice(0, 2).map((st) => (
              <div key={st.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-[9px]">{st.done ? "✓" : "○"}</span>
                <span className={`truncate ${st.done ? "line-through opacity-60" : ""}`}>{st.title}</span>
              </div>
            ))}
            {todo.subTasks.length > 2 && (
              <span className="text-[10px] text-slate-300 ml-3.5">+{todo.subTasks.length - 2} 项</span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <button
            onClick={(e) => { e.stopPropagation(); todo.id && onPriorityChange(todo.id); }}
            className={`flex items-center gap-1 text-[10px] ${p.color} hover:opacity-60 transition-opacity`}
            title="点击切换优先级（低→中→高→紧急）"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
            {p.label}
          </button>
          {todo.source === "tapd" && (
            <span className="text-[10px] px-1.5 py-[1px] rounded bg-violet-50 text-violet-500 font-medium leading-tight">TAPD</span>
          )}
          {todo.dueDate && (
            <span className={`text-[10px] ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
              {formatDate(todo.dueDate)}
            </span>
          )}
          {todo.tags.length > 0 && (
            <span className="text-[10px] text-slate-300">{todo.tags.map((t) => `#${t}`).join(" ")}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
        <button
          onClick={() => onEdit(todo)}
          className="p-1 text-slate-300 hover:text-blue-500 rounded hover:bg-blue-50 transition-colors"
          title="编辑"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => todo.id && onDelete(todo.id)}
          className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
          title="删除"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

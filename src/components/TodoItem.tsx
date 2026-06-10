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
  todo: { label: "待办", style: "bg-slate-700/80 text-slate-300 hover:bg-slate-600/80" },
  in_progress: { label: "进行中", style: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  done: { label: "完成", style: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" },
};

const PRIORITY: Record<Priority, { label: string; color: string; dot: string }> = {
  low: { label: "低", color: "text-slate-400", dot: "bg-slate-500" },
  medium: { label: "中", color: "text-blue-400", dot: "bg-blue-500" },
  high: { label: "高", color: "text-amber-400", dot: "bg-amber-500" },
  urgent: { label: "紧急", color: "text-red-400", dot: "bg-red-500" },
};

export default function TodoItem({ todo, onToggle, onDelete, onEdit, onPriorityChange, isDragging, isDragOver, dragHandlers }: Props) {
  const isDone = todo.status === "done";
  const overdue = !isDone && isOverdue(todo.dueDate);
  const s = STATUS[todo.status];
  const p = PRIORITY[todo.priority];

  const baseStyle = "bg-slate-800/60 hover:border-slate-600";
  const dragStyle = isDragging ? "opacity-30 border-blue-400/50 bg-blue-500/10 scale-[0.98]" : "";
  const overStyle = isDragOver && !isDragging ? "border-blue-400 bg-blue-500/20 shadow-sm" : "";
  const doneStyle = isDone && !isDragging ? "opacity-50" : "";
  const overdueStyle = overdue && !isDragging ? "border-red-500/50 bg-red-500/10" : "";
  const normalStyle = !isDragging && !isDragOver && !overdue ? baseStyle : "";

  return (
    <div
      className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 select-none
        ${normalStyle} ${dragStyle} ${overStyle} ${doneStyle} ${overdueStyle}
        ${!isDragging && !isDragOver && !overdue ? "border-slate-700/60" : ""}
      `}
      draggable
      {...dragHandlers}
    >
      {/* Drag handle */}
      <div className="mt-1.5 cursor-grab active:cursor-grabbing text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2.5" cy="2" r="1.2" /><circle cx="7.5" cy="2" r="1.2" />
          <circle cx="2.5" cy="7" r="1.2" /><circle cx="7.5" cy="7" r="1.2" />
          <circle cx="2.5" cy="12" r="1.2" /><circle cx="7.5" cy="12" r="1.2" />
        </svg>
      </div>

      {/* Status badge */}
      <button
        onClick={() => todo.id && onToggle(todo.id)}
        className={`mt-1 text-[10px] leading-none px-1.5 py-[3px] rounded-md font-medium transition-all flex-shrink-0 ${s.style}`}
        title="点击切换状态"
      >
        {s.label}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug truncate ${isDone ? "line-through text-slate-500" : "text-slate-200"}`}>
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
              <span className="text-[10px] text-slate-500 ml-3.5">+{todo.subTasks.length - 2} 项</span>
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
            <span className="text-[10px] px-1.5 py-[1px] rounded bg-violet-500/20 text-violet-400 font-medium leading-tight">TAPD</span>
          )}
          {todo.dueDate && (
            <span className={`text-[10px] ${overdue ? "text-red-400 font-semibold" : "text-slate-400"}`}>
              {formatDate(todo.dueDate)}
            </span>
          )}
          {todo.tags.length > 0 && (
            <span className="text-[10px] text-slate-500">{todo.tags.map((t) => `#${t}`).join(" ")}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
        <button
          onClick={() => onEdit(todo)}
          className="p-1 text-slate-500 hover:text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors"
          title="编辑"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => todo.id && onDelete(todo.id)}
          className="p-1 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
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

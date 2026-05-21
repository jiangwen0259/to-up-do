export function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return `今天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (isTomorrow) return `明天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function minutesUntilDue(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((new Date(date).getTime() - Date.now()) / 60000);
}

export function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(date);
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
};

export function priorityLabel(p: string): string {
  return PRIORITY_LABELS[p] || p;
}

export function priorityColor(p: string): string {
  return PRIORITY_COLORS[p] || "bg-gray-100 text-gray-600";
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s;
}

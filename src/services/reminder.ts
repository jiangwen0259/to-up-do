import { db, getSettings } from "@/db";
import { fetchTapdTasks } from "@/services/tapd";
import { showNotification } from "@/services/notification";
import { minutesUntilDue } from "@/utils/date";

export async function checkReminders() {
  const settings = await getSettings();
  if (!settings.reminder.enabled) return;

  if (settings.reminder.quietHours.enabled) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = settings.reminder.quietHours.start.split(":").map(Number);
    const [endH, endM] = settings.reminder.quietHours.end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return;
    } else {
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return;
    }
  }

  const todos = await db.todos
    .where("status")
    .anyOf(["todo", "in_progress"])
    .toArray();

  for (const todo of todos) {
    if (!todo.dueDate) continue;
    const minutes = minutesUntilDue(todo.dueDate);
    if (minutes === null) continue;

    if (minutes <= settings.reminder.deadlineAdvance && minutes > 0) {
      showNotification(
        "待办提醒",
        `「${todo.title}」${minutes < 60 ? `${minutes}分钟后到期` : `${Math.floor(minutes / 60)}小时后到期`}`,
      );
      break;
    }

    if (minutes <= 0) {
      showNotification("待办已过期", `「${todo.title}」已超过截止时间！`);
      break;
    }
  }
}

export async function dailyDigestNotification() {
  const settings = await getSettings();
  if (!settings.reminder.enabled || !settings.reminder.dailyDigest) return;

  const todos = await db.todos
    .where("status")
    .anyOf(["todo", "in_progress"])
    .toArray();

  if (todos.length === 0) return;

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const todoCount = todos.filter((t) => t.status === "todo").length;
  const inProgressCount = todos.filter((t) => t.status === "in_progress").length;
  const overdue = todos.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
  const upcoming = todos.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() >= now && new Date(t.dueDate).getTime() - now <= twentyFourHours,
  );

  if (overdue.length === 0 && upcoming.length === 0 && inProgressCount === 0) return;

  const summaryLine = `待办:${todoCount} 进行中:${inProgressCount} 即将到期:${upcoming.length} 已过期:${overdue.length}`;
  const lines: string[] = [summaryLine];

  if (overdue.length > 0) {
    const names = overdue.slice(0, 3).map((t) => `「${t.title}」`).join(" ");
    lines.push(`已过期: ${names}${overdue.length > 3 ? ` 等${overdue.length}项` : ""}`);
  }
  if (upcoming.length > 0) {
    const names = upcoming
      .slice(0, 3)
      .map((t) => {
        const mins = Math.floor((new Date(t.dueDate!).getTime() - now) / 60000);
        const hrs = Math.floor(mins / 60);
        return `「${t.title}」${hrs > 0 ? `${hrs}h后` : `${mins}m后`}`;
      })
      .join(" ");
    lines.push(`即将到期: ${names}${upcoming.length > 3 ? ` 等${upcoming.length}项` : ""}`);
  }

  showNotification("每日待办汇总", lines.join("\n"));
}

export async function syncTapd() {
  const settings = await getSettings();
  if (!settings.tapd.enabled) return;

  try {
    const tapdTodos = await fetchTapdTasks(settings.tapd);
    for (const tapdTodo of tapdTodos) {
      if (!tapdTodo.tapdId) continue;
      const existing = await db.todos.where("tapdId").equals(tapdTodo.tapdId).first();
      if (existing) {
        await db.todos.update(existing.id!, {
          title: tapdTodo.title,
          description: tapdTodo.description,
          priority: tapdTodo.priority,
          dueDate: tapdTodo.dueDate,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.todos.add(tapdTodo);
      }
    }
  } catch {
    // silent, retry next cycle
  }
}

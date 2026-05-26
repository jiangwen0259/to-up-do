export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (chrome.notifications) {
      await chrome.notifications.requestPermission?.();
      return true;
    }
  } catch {}
  return false;
}

export function showNotification(title: string, body: string, onClick?: () => void): void {
  try {
    if (chrome.notifications) {
      const id = `todo-${Date.now()}`;
      chrome.notifications.create(id, {
        type: "basic",
        iconUrl: "icons/128.png",
        title,
        message: body,
      });
      if (onClick) {
        chrome.notifications.onClicked.addListener((nid) => {
          if (nid === id) onClick();
        });
      }
      setTimeout(() => {
        chrome.notifications.clear(id);
      }, 5000);
    }
  } catch {}
}

export async function updateBadge(): Promise<void> {
  try {
    const { db, getSettings } = await import("@/db");
    const settings = await getSettings();
    if (!settings.reminder.enabled) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }

    const todos = await db.todos
      .where("status")
      .anyOf(["todo", "in_progress"])
      .toArray();

    const now = Date.now();
    const deadlineAdvance = settings.reminder.deadlineAdvance * 60 * 1000;
    const count = todos.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      return due - now <= deadlineAdvance;
    }).length;

    if (count > 0) {
      chrome.action.setBadgeText({ text: count > 99 ? "99+" : String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch {}
}

export function formatDueMessage(minutesLeft: number): string {
  if (minutesLeft <= 0) return "已过期";
  if (minutesLeft < 60) return `${minutesLeft} 分钟后到期`;
  const hours = Math.floor(minutesLeft / 60);
  if (hours < 24) return `${hours} 小时后到期`;
  const days = Math.floor(hours / 24);
  return `${days} 天后到期`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showNotification(title: string, body: string, onClick?: () => void): void {
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "/icon/128.png",
  });

  if (onClick) {
    notification.onclick = onClick;
  }

  setTimeout(() => notification.close(), 5000);
}

export function formatDueMessage(minutesLeft: number): string {
  if (minutesLeft <= 0) return "已过期";
  if (minutesLeft < 60) return `${minutesLeft} 分钟后到期`;
  const hours = Math.floor(minutesLeft / 60);
  if (hours < 24) return `${hours} 小时后到期`;
  const days = Math.floor(hours / 24);
  return `${days} 天后到期`;
}

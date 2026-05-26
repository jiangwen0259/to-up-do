function getNext9AM(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

export default defineBackground(() => {
  // Request notification permission on install
  chrome.runtime.onInstalled.addListener(() => {
    chrome.notifications?.requestPermission?.();
  });

  // Set up periodic alarm for reminders (every 1 minute)
  chrome.alarms.create("checkReminders", { periodInMinutes: 1 });

  // Set up daily digest alarm (every day at 9:00 AM)
  chrome.alarms.create("dailyDigest", { when: getNext9AM(), periodInMinutes: 24 * 60 });

  // Set up TAPD sync alarm
  chrome.alarms.create("tapdSync", { periodInMinutes: 30 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkReminders") {
      const { checkReminders } = await import("@/services/reminder");
      await checkReminders();
      const { updateBadge } = await import("@/services/notification");
      await updateBadge();
    } else if (alarm.name === "dailyDigest") {
      const { dailyDigestNotification } = await import("@/services/reminder");
      await dailyDigestNotification();
      const { updateBadge } = await import("@/services/notification");
      await updateBadge();
    } else if (alarm.name === "tapdSync") {
      const { syncTapd } = await import("@/services/reminder");
      await syncTapd();
    }
  });
});

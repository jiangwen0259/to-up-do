export default defineBackground(() => {
  // Request notification permission on install
  chrome.runtime.onInstalled.addListener(() => {
    chrome.notifications?.requestPermission?.();
  });

  // Set up periodic alarm for reminders (every 1 minute)
  chrome.alarms.create("checkReminders", { periodInMinutes: 1 });

  // Set up TAPD sync alarm
  chrome.alarms.create("tapdSync", { periodInMinutes: 30 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkReminders") {
      const { checkReminders } = await import("@/services/reminder");
      await checkReminders();
    } else if (alarm.name === "tapdSync") {
      const { syncTapd } = await import("@/services/reminder");
      await syncTapd();
    }
  });
});

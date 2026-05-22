import Dexie, { type Table } from "dexie";
import type { Todo, AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

class TodoDatabase extends Dexie {
  todos!: Table<Todo, number>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("ToUpDo");
    this.version(1).stores({
      todos: "++id, title, status, priority, source, dueDate, parentId, tapdId, order, createdAt",
      settings: "key",
    });
  }
}

export const db = new TodoDatabase();

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray();
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return {
    serverUrl: (map.serverUrl as string) || DEFAULT_SETTINGS.serverUrl,
    ai: { ...DEFAULT_SETTINGS.ai, ...(map.ai as Record<string, unknown> | undefined) },
    tapd: { ...DEFAULT_SETTINGS.tapd, ...(map.tapd as Record<string, unknown> | undefined) },
    reminder: { ...DEFAULT_SETTINGS.reminder, ...(map.reminder as Record<string, unknown> | undefined) },
  };
}

export async function saveSettings<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  await db.settings.put({ key, value });
}

export type Priority = "low" | "medium" | "high" | "urgent";
export type TodoSource = "manual" | "tapd";
export type TodoStatus = "todo" | "in_progress" | "done";
export type TapdWorkItemType = "story" | "bug" | "task";

export interface Todo {
  id?: number;
  title: string;
  description: string;
  priority: Priority;
  status: TodoStatus;
  source: TodoSource;
  tags: string[];
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: number;
  parentId: number | null;
  tapdId: string | null;
  tapdWorkItemType: TapdWorkItemType | null;
  estimatedHours: number | null;
  subTasks: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface AiConfig {
  enabled: boolean;
}

export interface TapdConfig {
  enabled: boolean;
  workspaceId: string;
  syncInterval: number;
}

export interface ReminderConfig {
  enabled: boolean;
  deadlineAdvance: number;
  dailyDigest: boolean;
  idleReminder: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface AppSettings {
  serverUrl: string;
  ai: AiConfig;
  tapd: TapdConfig;
  reminder: ReminderConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: "http://localhost:8787",
  ai: {
    enabled: false,
  },
  tapd: {
    enabled: false,
    workspaceId: "",
    syncInterval: 30,
  },
  reminder: {
    enabled: true,
    deadlineAdvance: 30,
    dailyDigest: true,
    idleReminder: true,
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "08:00",
    },
  },
};

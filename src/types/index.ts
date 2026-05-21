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
  provider: "openai" | "anthropic" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface TapdConfig {
  enabled: boolean;
  companyId: string;
  authType: "basic" | "token";
  username: string;
  password: string;
  syncInterval: number;
  syncScope: {
    workitemTypes: TapdWorkItemType[];
    statusFilter: string[];
  };
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
  ai: AiConfig;
  tapd: TapdConfig;
  reminder: ReminderConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    enabled: false,
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  tapd: {
    enabled: false,
    companyId: "",
    authType: "basic",
    username: "",
    password: "",
    syncInterval: 30,
    syncScope: {
      workitemTypes: ["story", "bug", "task"],
      statusFilter: ["open", "in_progress"],
    },
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

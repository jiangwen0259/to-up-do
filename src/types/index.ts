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

export type AiModel = "DeepSeek-V4-Flash" | "MiniMax-M3" | "DeepSeek-V4-Pro";

export const AI_MODELS: AiModel[] = ["DeepSeek-V4-Flash", "MiniMax-M3", "DeepSeek-V4-Pro"];

export const AI_BASE_URL = "http://www.esnode.com";
export const TAPD_SERVER_URL = "http://td.esnode.com";

export interface AiConfig {
  enabled: boolean;
  apiKey: string;
  model: AiModel;
}

export interface TapdProject {
  id: string;
  name: string;
  workspaceId: string;
}

export interface TapdConfig {
  enabled: boolean;
  projects: TapdProject[];
  activeProjectId: string;
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
  ai: AiConfig;
  tapd: TapdConfig;
  reminder: ReminderConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    enabled: false,
    apiKey: "",
    model: "DeepSeek-V4-Flash",
  },
  tapd: {
    enabled: false,
    projects: [],
    activeProjectId: "",
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

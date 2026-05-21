import type { TapdConfig, TapdWorkItemType, Todo } from "@/types";

function buildAuthHeader(config: TapdConfig): Record<string, string> {
  if (config.authType === "basic") {
    const encoded = btoa(`${config.username}:${config.password}`);
    return { Authorization: `Basic ${encoded}` };
  }
  return { Authorization: `Bearer ${config.password}` };
}

function baseUrl(config: TapdConfig): string {
  return `https://api.tapd.cn`;
}

interface TapdResponse<T> {
  status: number;
  data: T;
  info: string;
}

export async function fetchTapdTasks(config: TapdConfig): Promise<Todo[]> {
  if (!config.enabled || !config.companyId) {
    return [];
  }

  const headers: Record<string, string> = {
    ...buildAuthHeader(config),
    "Content-Type": "application/json",
  };

  const todos: Todo[] = [];

  for (const type of config.syncScope.workitemTypes) {
    const endpoint = getEndpoint(type);
    const url = `${baseUrl(config)}/${endpoint}?workspace_id=${config.companyId}&limit=200`;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;

      const json: TapdResponse<Record<string, TapdWorkItem>[]> = await res.json();
      if (json.status !== 1 || !Array.isArray(json.data)) continue;

      for (const item of json.data) {
        const workItem = item[Object.keys(item)[0]];
        todos.push(mapTapdItemToTodo(workItem, type));
      }
    } catch {
      continue;
    }
  }

  return todos;
}

function getEndpoint(type: TapdWorkItemType): string {
  switch (type) {
    case "story":
      return "stories";
    case "bug":
      return "bugs";
    case "task":
      return "tasks";
  }
}

interface TapdWorkItem {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  owner: string;
  begin: string;
  due: string;
  created: string;
  modified: string;
}

const TAPD_STATUS_MAP: Record<string, Todo["status"]> = {
  open: "todo",
  progressing: "in_progress",
  resolved: "done",
  closed: "done",
  done: "done",
};

const TAPD_PRIORITY_MAP: Record<string, Todo["priority"]> = {
  "1": "urgent",
  "2": "high",
  "3": "medium",
  "4": "low",
};

function mapTapdItemToTodo(item: TapdWorkItem, type: TapdWorkItemType): Todo {
  return {
    title: item.name,
    description: item.description || "",
    priority: TAPD_PRIORITY_MAP[item.priority] || "medium",
    status: TAPD_STATUS_MAP[item.status] || "todo",
    source: "tapd",
    tags: [],
    dueDate: item.due || null,
    completedAt: null,
    createdAt: item.created || new Date().toISOString(),
    updatedAt: item.modified || new Date().toISOString(),
    order: 0,
    parentId: null,
    tapdId: item.id,
    tapdWorkItemType: type,
    estimatedHours: null,
    subTasks: [],
  };
}

export async function updateTapdTaskStatus(config: TapdConfig, tapdId: string, type: TapdWorkItemType, status: string): Promise<boolean> {
  if (!config.enabled || !config.companyId) return false;

  const headers: Record<string, string> = {
    ...buildAuthHeader(config),
    "Content-Type": "application/json",
  };

  const endpoint = getEndpoint(type);
  const url = `${baseUrl(config)}/${endpoint}/${tapdId}`;

  try {
    const body = type === "task"
      ? JSON.stringify({ task: { status } })
      : type === "bug"
        ? JSON.stringify({ bug: { status } })
        : JSON.stringify({ story: { status } });

    const res = await fetch(url, { method: "POST", headers, body });
    return res.ok;
  } catch {
    return false;
  }
}

import { TAPD_SERVER_URL, type Todo, type TapdWorkItemType } from "@/types";

const API_BASE = `${TAPD_SERVER_URL}/api/tapd`;

interface TapdTaskItem {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  owner: string;
  begin: string | null;
  due: string | null;
  created: string | null;
  modified: string | null;
  workitem_type: string;
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

export async function fetchTapdTasks(): Promise<Todo[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) return [];

    const items: TapdTaskItem[] = await res.json();
    return items.map((item) => ({
      title: item.name,
      description: item.description || "",
      priority: TAPD_PRIORITY_MAP[item.priority] || "medium",
      status: TAPD_STATUS_MAP[item.status] || "todo",
      source: "tapd" as const,
      tags: [],
      dueDate: item.due || null,
      completedAt: null,
      createdAt: item.created || new Date().toISOString(),
      updatedAt: item.modified || new Date().toISOString(),
      order: 0,
      parentId: null,
      tapdId: item.id,
      tapdWorkItemType: item.workitem_type as TapdWorkItemType,
      estimatedHours: null,
      subTasks: [],
    }));
  } catch {
    return [];
  }
}

export async function updateTapdTaskStatus(
  tapdId: string,
  workspaceId: string,
  type: TapdWorkItemType,
  status: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/tasks/${tapdId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, workitem_type: type, status }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function testTapdConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/test`, { method: "POST" });
    return await res.json();
  } catch (e: any) {
    return { ok: false, message: `连接后端失败: ${e.message}` };
  }
}

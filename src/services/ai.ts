const API_BASE = "http://localhost:8787/api/ai";

export async function aiBreakdownTask(title: string, description: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/breakdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error(`AI breakdown failed: ${res.status}`);
  const data = await res.json();
  return data.subtasks;
}

export async function aiSuggestPriority(title: string, description: string, dueDate: string | null): Promise<string> {
  const res = await fetch(`${API_BASE}/priority`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, due_date: dueDate }),
  });
  if (!res.ok) throw new Error(`AI priority failed: ${res.status}`);
  const data = await res.json();
  return data.priority;
}

export async function aiEstimateHours(title: string, description: string): Promise<number> {
  const res = await fetch(`${API_BASE}/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error(`AI estimate failed: ${res.status}`);
  const data = await res.json();
  return data.hours;
}

export async function aiGenerateWeeklyReport(tasks: string[], reportType: "weekly" | "daily" = "weekly"): Promise<string> {
  const res = await fetch(`${API_BASE}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, report_type: reportType }),
  });
  if (!res.ok) throw new Error(`AI report failed: ${res.status}`);
  const data = await res.json();
  return data.report;
}

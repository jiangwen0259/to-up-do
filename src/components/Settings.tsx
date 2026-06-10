import { useState, useEffect } from "react";
import type { AppSettings, AiConfig, TapdConfig, ReminderConfig, TapdProject } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { db, getSettings, saveSettings } from "@/db";
import { testTapdConnection } from "@/services/tapd";

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [tab, setTab] = useState<"server" | "tapd" | "reminder">("server");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SETTINGS.serverUrl);
  const [ai, setAi] = useState<AiConfig>(DEFAULT_SETTINGS.ai);
  const [tapd, setTapd] = useState<TapdConfig>(DEFAULT_SETTINGS.tapd);
  const [reminder, setReminder] = useState<ReminderConfig>(DEFAULT_SETTINGS.reminder);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setServerUrl(s.serverUrl);
      setAi(s.ai);
      setTapd(s.tapd);
      setReminder(s.reminder);
    });
  }, []);

  async function handleSave() {
    await saveSettings("serverUrl", serverUrl);
    await saveSettings("ai", ai);
    await saveSettings("tapd", tapd);
    await saveSettings("reminder", reminder);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs = [
    { key: "server" as const, label: "服务器", icon: "M5 12h14M12 5l7 7-7 7" },
    { key: "tapd" as const, label: "TAPD", icon: "M4 4h16v16H4zM9 9h6m-6 4h6" },
    { key: "reminder" as const, label: "提醒", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const inputClass = "w-full px-3 py-2 border border-slate-600 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder:text-slate-500 bg-slate-800 text-slate-200";
  const labelClass = "block text-[12px] font-medium text-slate-400 mb-1.5";
  const btnPrimary = "flex-1 py-2.5 bg-teal-600 text-white text-[13px] font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm";
  const btnTest = "w-full py-2 text-[13px] font-medium rounded-lg transition-colors";

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-teal-500" />
          设置
        </h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4">
        <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium rounded-md transition-all duration-200 ${
                tab === t.key
                  ? "bg-slate-600 text-slate-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {tab === "server" && (
          <>
            <div>
              <label className={labelClass}>后端服务地址</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className={inputClass}
                placeholder="http://localhost:8787"
              />
            </div>

            <div className="bg-slate-700/40 rounded-lg p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ai.enabled}
                  onChange={(e) => setAi({ ...ai, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-[13px] font-medium text-slate-300">启用 AI 助手</span>
              </label>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${serverUrl}/api/settings/test-ai`, { method: "POST" });
                    const data = await res.json();
                    alert(data.ok ? "AI 服务连接成功" : `AI 服务连接失败: ${data.message}`);
                  } catch (e: any) {
                    alert(`请求失败: ${e.message}`);
                  }
                }}
                disabled={!ai.enabled}
                className={`${btnTest} bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                测试 AI 连接
              </button>
            </div>

            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${serverUrl}/health`);
                  const data = await res.json();
                  alert(`连接成功！服务版本: ${data.version}`);
                } catch (e: any) {
                  alert(`连接失败: ${e.message}`);
                }
              }}
              className={`${btnTest} bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`}
            >
              测试后端连接
            </button>
          </>
        )}

        {tab === "tapd" && (
          <>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={tapd.enabled}
                onChange={(e) => setTapd({ ...tapd, enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-teal-500"
              />
              <span className="text-[13px] font-medium text-slate-300">启用 TAPD 同步</span>
            </label>

            {/* Project list */}
            <div className="space-y-2">
              <label className={labelClass}>项目列表</label>
              {tapd.projects.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">暂无项目，点击下方添加</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {tapd.projects.map((project, idx) => (
                    <div key={project.id} className={`flex items-center gap-2 p-2 rounded-lg ${tapd.activeProjectId === project.id ? "bg-teal-600/20 border border-teal-600/40" : "bg-slate-700/40 border border-slate-600/40"}`}>
                      <button
                        onClick={() => setTapd({ ...tapd, activeProjectId: project.id })}
                        className="flex-1 text-left"
                      >
                        <div className="text-[12px] font-medium text-slate-200">{project.name}</div>
                        <div className="text-[10px] text-slate-500">Workspace: {project.workspaceId}</div>
                      </button>
                      <button
                        onClick={() => {
                          const newProjects = tapd.projects.filter((_, i) => i !== idx);
                          setTapd({
                            ...tapd,
                            projects: newProjects,
                            activeProjectId: tapd.activeProjectId === project.id ? (newProjects[0]?.id || "") : tapd.activeProjectId,
                          });
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-600/50 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add project form */}
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">添加新项目</div>
              <input
                type="text"
                value={tapd.projects.length > 0 ? "" : ""}
                onChange={(e) => {
                  const name = e.target.value;
                  const wsId = e.target.value;
                  if (!name || !wsId) return;
                }}
                placeholder="项目名称"
                className={`${inputClass} text-[12px]`}
                id="new-project-name"
              />
              <input
                type="text"
                placeholder="Workspace ID"
                className={`${inputClass} text-[12px]`}
                id="new-project-workspace"
              />
              <button
                onClick={() => {
                  const nameInput = document.getElementById("new-project-name") as HTMLInputElement;
                  const wsInput = document.getElementById("new-project-workspace") as HTMLInputElement;
                  const name = nameInput?.value.trim();
                  const wsId = wsInput?.value.trim();
                  if (!name || !wsId) {
                    alert("请填写项目名称和 Workspace ID");
                    return;
                  }
                  const newProject: TapdProject = {
                    id: `proj_${Date.now()}`,
                    name,
                    workspaceId: wsId,
                  };
                  const newProjects = [...tapd.projects, newProject];
                  setTapd({
                    ...tapd,
                    projects: newProjects,
                    activeProjectId: tapd.activeProjectId || newProject.id,
                  });
                  if (nameInput) nameInput.value = "";
                  if (wsInput) wsInput.value = "";
                }}
                className="w-full py-1.5 bg-teal-600/20 text-teal-400 text-[12px] font-medium rounded-lg hover:bg-teal-600/30 transition-colors"
              >
                + 添加项目
              </button>
            </div>

            <div>
              <label className={labelClass}>同步间隔（分钟）</label>
              <input
                type="number"
                value={tapd.syncInterval}
                onChange={(e) => setTapd({ ...tapd, syncInterval: parseInt(e.target.value) || 30 })}
                className={inputClass}
                min={5}
              />
            </div>

            <button
              onClick={async () => {
                await saveSettings("tapd", tapd);
                const result = await testTapdConnection();
                alert(result.ok ? result.message : `连接失败: ${result.message}`);
              }}
              className={`${btnTest} bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`}
            >
              测试 TAPD 连接
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              TAPD 凭证（Token/OAuth）在后端 config.json 中配置，插件端不存储敏感信息。
            </p>
          </>
        )}

        {tab === "reminder" && (
          <>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder.enabled}
                  onChange={(e) => setReminder({ ...reminder, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-[13px] font-medium text-slate-300">启用提醒</span>
              </label>

              <div>
                <label className={labelClass}>提前提醒（分钟）</label>
                <input
                  type="number"
                  value={reminder.deadlineAdvance}
                  onChange={(e) => setReminder({ ...reminder, deadlineAdvance: parseInt(e.target.value) || 30 })}
                  className={inputClass}
                  min={5}
                />
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-lg p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={reminder.dailyDigest} onChange={(e) => setReminder({ ...reminder, dailyDigest: e.target.checked })} className="w-4 h-4 rounded accent-teal-500" />
                <span className="text-[13px] text-slate-300">每日概览</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={reminder.idleReminder} onChange={(e) => setReminder({ ...reminder, idleReminder: e.target.checked })} className="w-4 h-4 rounded accent-teal-500" />
                <span className="text-[13px] text-slate-300">闲置提醒</span>
              </label>
            </div>

            <div className="bg-slate-700/40 rounded-lg p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={reminder.quietHours.enabled} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, enabled: e.target.checked } })} className="w-4 h-4 rounded accent-teal-500" />
                <span className="text-[13px] font-medium text-slate-300">免打扰时段</span>
              </label>
              {reminder.quietHours.enabled && (
                <div className="flex items-center gap-2">
                  <input type="time" value={reminder.quietHours.start} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, start: e.target.value } })} className={`flex-1 ${inputClass}`} />
                  <span className="text-slate-500 text-sm">—</span>
                  <input type="time" value={reminder.quietHours.end} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, end: e.target.value } })} className={`flex-1 ${inputClass}`} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700 flex gap-2.5">
        <button onClick={handleSave} className={btnPrimary}>
          {saved ? "已保存" : "保存设置"}
        </button>
        <button onClick={onClose} className="px-5 py-2.5 text-[13px] font-medium text-slate-400 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
          关闭
        </button>
      </div>
    </div>
  );
}

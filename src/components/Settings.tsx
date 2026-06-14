import { useState, useEffect } from "react";
import type { AppSettings, AiConfig, TapdConfig, ReminderConfig, TapdProject, AiModel } from "@/types";
import { DEFAULT_SETTINGS, AI_MODELS, AI_BASE_URL } from "@/types";
import { db, getSettings, saveSettings } from "@/db";
import { testTapdConnection } from "@/services/tapd";
import { aiPing } from "@/services/ai";

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [tab, setTab] = useState<"model" | "tapd" | "reminder">("model");
  const [ai, setAi] = useState<AiConfig>(DEFAULT_SETTINGS.ai);
  const [tapd, setTapd] = useState<TapdConfig>(DEFAULT_SETTINGS.tapd);
  const [reminder, setReminder] = useState<ReminderConfig>(DEFAULT_SETTINGS.reminder);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setAi(s.ai);
      setTapd(s.tapd);
      setReminder(s.reminder);
    });
  }, []);

  async function handleSave() {
    await saveSettings("ai", ai);
    await saveSettings("tapd", tapd);
    await saveSettings("reminder", reminder);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs = [
    { key: "model" as const, label: "模型", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
    { key: "tapd" as const, label: "TAPD", icon: "M4 4h16v16H4zM9 9h6m-6 4h6" },
    { key: "reminder" as const, label: "提醒", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const inputClass = "w-full px-3 py-2 border border-slate-600 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder:text-slate-500 bg-slate-800 text-slate-200";
  const labelClass = "block text-[12px] font-medium text-slate-400 mb-1.5";
  const btnPrimary = "flex-1 py-2.5 bg-teal-600 text-white text-[13px] font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm";
  const btnTest = "w-full py-2 text-[13px] font-medium rounded-lg transition-colors";

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="px-5 pt-4 pb-0">
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
        {tab === "model" && (
          <>
            {/* Enable */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ai.enabled}
                onChange={(e) => setAi({ ...ai, enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-teal-500"
              />
              <span className="text-[13px] font-medium text-slate-300">启用 AI 助手</span>
            </label>

            {/* Endpoint info */}
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/40">
              <div className="text-[10px] tracking-[0.18em] text-slate-500 uppercase font-medium mb-1">Endpoint</div>
              <div className="text-[12px] text-slate-300 font-mono break-all">{AI_BASE_URL}/v1/messages</div>
              <div className="text-[10px] text-slate-500 mt-1">协议: Anthropic Messages API</div>
            </div>

            {/* Model picker */}
            <div>
              <label className={labelClass}>模型</label>
              <div className="grid grid-cols-1 gap-1.5">
                {AI_MODELS.map((m) => {
                  const active = ai.model === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAi({ ...ai, model: m })}
                      className={`relative h-9 px-3 rounded-lg text-[12px] font-medium flex items-center justify-between transition-all border ${
                        active
                          ? "border-teal-400/50 bg-gradient-to-r from-teal-500/15 to-cyan-500/15 text-teal-200 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]"
                          : "border-slate-600/60 bg-slate-700/40 text-slate-300 hover:border-teal-500/30 hover:bg-slate-700/70"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-teal-400" : "bg-slate-500"}`} />
                        {m}
                      </span>
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className={labelClass}>API Key</label>
              <input
                type="password"
                value={ai.apiKey}
                onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="sk-ant-..."
              />
            </div>

            {/* Test */}
            <button
              onClick={async () => {
                if (!ai.enabled) { alert("请先启用 AI 助手"); return; }
                if (!ai.apiKey) { alert("请填写 API Key"); return; }
                setTesting(true);
                await saveSettings("ai", ai);
                const res = await aiPing();
                setTesting(false);
                alert(res.ok ? `✅ ${res.message}` : `❌ ${res.message}`);
              }}
              disabled={testing}
              className={`${btnTest} bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50`}
            >
              {testing ? "测试中..." : "测试模型连接"}
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
              TAPD 凭证（Token/OAuth）在后端 config.json 中配置，插件端不存储敏感信息。后端服务: td.esnode.com
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

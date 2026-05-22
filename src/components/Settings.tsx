import { useState, useEffect } from "react";
import type { AppSettings, AiConfig, TapdConfig, ReminderConfig } from "@/types";
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
    { key: "server" as const, label: "服务器" },
    { key: "tapd" as const, label: "TAPD" },
    { key: "reminder" as const, label: "提醒" },
  ];

  return (
    <div className="p-4 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">设置</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "server" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">后端服务地址</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:8787"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ai.enabled}
              onChange={(e) => setAi({ ...ai, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">启用 AI 助手</span>
          </label>

          <div className="pt-2 border-t">
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
              className="w-full py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              测试后端连接
            </button>
          </div>

          <div className="pt-2 border-t">
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
              className="w-full py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              测试 AI 连接
            </button>
          </div>
        </div>
      )}

      {tab === "tapd" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tapd.enabled}
              onChange={(e) => setTapd({ ...tapd, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">启用 TAPD 同步</span>
          </label>

          <div>
            <label className="block text-sm text-gray-600 mb-1">工作空间 ID</label>
            <input
              type="text"
              value={tapd.workspaceId}
              onChange={(e) => setTapd({ ...tapd, workspaceId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如 44789041"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">同步间隔（分钟）</label>
            <input
              type="number"
              value={tapd.syncInterval}
              onChange={(e) => setTapd({ ...tapd, syncInterval: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              min={5}
            />
          </div>

          <div className="pt-2 border-t">
            <button
              onClick={async () => {
                await saveSettings("tapd", tapd);
                const result = await testTapdConnection();
                alert(result.ok ? result.message : `连接失败: ${result.message}`);
              }}
              className="w-full py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              测试 TAPD 连接
            </button>
          </div>

          <p className="text-xs text-gray-400">
            TAPD 凭证（Token/OAuth）在后端 config.json 中配置，插件端不存储敏感信息。
          </p>
        </div>
      )}

      {tab === "reminder" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={(e) => setReminder({ ...reminder, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">启用提醒</span>
          </label>

          <div>
            <label className="block text-sm text-gray-600 mb-1">提前提醒（分钟）</label>
            <input
              type="number"
              value={reminder.deadlineAdvance}
              onChange={(e) => setReminder({ ...reminder, deadlineAdvance: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              min={5}
            />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={reminder.dailyDigest} onChange={(e) => setReminder({ ...reminder, dailyDigest: e.target.checked })} className="rounded" />
            <span className="text-sm">每日概览</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={reminder.idleReminder} onChange={(e) => setReminder({ ...reminder, idleReminder: e.target.checked })} className="rounded" />
            <span className="text-sm">闲置提醒</span>
          </label>

          <div className="pt-2 border-t">
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={reminder.quietHours.enabled} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, enabled: e.target.checked } })} className="rounded" />
              <span className="text-sm font-medium">免打扰时段</span>
            </label>
            {reminder.quietHours.enabled && (
              <div className="flex gap-2">
                <input type="time" value={reminder.quietHours.start} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, start: e.target.value } })} className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none" />
                <span className="self-center text-gray-400">~</span>
                <input type="time" value={reminder.quietHours.end} onChange={(e) => setReminder({ ...reminder, quietHours: { ...reminder.quietHours, end: e.target.value } })} className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button onClick={handleSave} className="flex-1 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {saved ? "已保存 ✓" : "保存设置"}
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          关闭
        </button>
      </div>
    </div>
  );
}

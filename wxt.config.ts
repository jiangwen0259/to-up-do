import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "dist",
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    name: "To-Up-Do",
    description: "高效率的智能待办管理工具，集成 AI 助手与 TAPD",
    permissions: ["storage", "notifications", "alarms", "sidePanel"],
    host_permissions: [
      "https://api.tapd.cn/*",
      "http://td.esnode.com/*",
      "https://td.esnode.com/*",
      "http://www.esnode.com/*",
      "https://www.esnode.com/*",
    ],
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png",
    },
  },
  vite: () => ({
    base: "./",
  }),
});

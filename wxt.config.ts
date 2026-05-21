import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    name: "To-Up-Do",
    description: "高效率的智能待办管理工具，集成 AI 助手与 TAPD",
    permissions: ["storage", "notifications", "alarms", "sidePanel"],
  },
});

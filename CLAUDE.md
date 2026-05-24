# To-Up-Do

浏览器插件 + Python FastAPI 后端的待办管理工具。

## 后端服务

- **启动前必须先激活虚拟环境：**
  ```
  source /Users/wallace/resource/venv/bin/activate
  ```
- **启动命令：**
  ```
  cd server && python -m app.main
  ```
- 后端监听 `0.0.0.0:8787`
- 配置文件：`server/config.json`（含 TAPD、AI、Reminder 等配置）

## 插件开发

- 框架：WXT (Web Extension Tools)
- 构建：`npm run build` / `npm run dev`
- 产出目录：`dist/` 或 `.output/chrome-mv3/`

## AI 配置

- Provider: OpenAI 兼容协议
- Base URL: `https://www.dreamfield.top/v1`
- Model: `MiniMax-M2.7-highspeed`
- API Key 已配置在 `server/config.json`

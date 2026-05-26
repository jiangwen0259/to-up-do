<!--
╔══════════════════════════════════════════════════════════════════════╗
║  DreamSeed 种梦计划 — AI创造者大赛  官方 README 模板                ║
║                                                                      ║
║  使用说明：                                                          ║
║  1. 将本模板放在参赛仓库根目录 README.md 的顶部                       ║
║  2. 头图使用 DreamField 官方公开活动图片地址                         ║
║  3. 请保留 DREAMFIELD_README_HEADER_START / END 标识                 ║
║  4. 分割线以下供创作者自由编写项目内容                               ║
╚══════════════════════════════════════════════════════════════════════╝
-->

<!-- DREAMFIELD_README_HEADER_START -->

<p align="center">
  <a href="https://www.dreamfield.top">
    <img src="https://www.dreamfield.top/dream-field/contest-readme/assets/dreamseed-readme-banner.png" alt="DreamSeed 种梦计划参赛作品" width="100%" />
  </a>
</p>

<!-- DREAMFIELD_README_HEADER_END -->

# To-Up-Do

一款高效率的智能待办管理工具，集成 AI 助手与 TAPD 项目管理，让待办不再遗漏。

## 核心特性

- **多源聚合** — 统一管理手动创建的待办和 TAPD 同步过来的任务，一个列表搞定
- **AI 增强** — 智能分析待办内容，自动建议优先级、预估工时、拆解子任务
- **TAPD 集成** — 双向同步 TAPD 需求/Bug/任务，状态变更实时同步
- **智能提醒** — 基于截止时间、优先级和工作习惯的多策略提醒，不错过任何重要事项
- **配置化** — AI 模型和 TAPD 连接均为可配置项，按需接入，开箱即用

## 项目状态

> Phase 1 — 浏览器插件开发中

## 架构概览

```
┌─────────────────────────────────────────────┐
│              Browser Extension              │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Popup  │ │ Side Panel│ │ Background   │ │
│  │  (UI)   │ │  (Board) │ │  (Service)   │ │
│  └────┬────┘ └─────┬────┘ └──────┬───────┘ │
│       │            │              │         │
│  ┌────┴────────────┴──────────────┴───────┐ │
│  │            Storage & Message Bus        │ │
│  └────────────────────┬───────────────────┘ │
└───────────────────────┼─────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
     ┌──────┴──────┐        ┌──────┴──────┐
     │  AI Service │        │ TAPD Client │
     │ (LLM API)   │        │  (REST API) │
     └─────────────┘        └─────────────┘
```

## 功能模块

### 1. 待办管理

| 能力 | 说明 |
|------|------|
| 创建/编辑/完成 | 支持标题、描述、优先级、截止时间、标签 |
| 分组与筛选 | 按项目、标签、来源（手动/TAPD）分类查看 |
| 拖拽排序 | 手动调整待办顺序 |
| 子任务 | 将大任务拆解为可勾选的子项 |

### 2. AI 助手（可配置）

在设置页面配置 AI 服务后即可使用以下能力：

| 能力 | 说明 |
|------|------|
| 智能拆解 | 输入一个模糊目标，AI 自动拆解为可执行的子任务列表 |
| 优先级建议 | 根据截止时间、描述内容自动建议优先级排序 |
| 工时预估 | 基于 TAPD 历史数据或任务描述，预估完成耗时 |
| 周报生成 | 汇总已完成待办，一键生成周报摘要 |
| 自然语言输入 | "明天下午三点前完成评审" → 自动解析时间与内容 |

### 3. TAPD 集成（可配置）

在设置页面配置 TAPD 公司 ID 和认证信息后即可使用：

| 能力 | 说明 |
|------|------|
| 任务同步 | 自动拉取分配给当前用户的 TAPD 任务 |
| 状态同步 | 插件中完成/重新打开待办，自动同步回 TAPD |
| 双向关联 | TAPD 任务与本地待办一一对应，支持跳转至 TAPD 页面 |
| 需求/Bug | 支持同步需求（Story）和缺陷（Bug）两种工作项类型 |

### 4. 待办提醒

| 策略 | 说明 |
|------|------|
| 截止时间提醒 | 到期前 N 分钟/小时弹出提醒，N 可配置 |
| 每日概览 | 每日首次打开浏览器时，推送今日待办摘要 |
| 闲置提醒 | 长时间未操作的待办，周期性提醒 |
| 浏览器通知 | 基于 Chrome Notifications API，即使插件面板关闭也能收到提醒 |

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 扩展框架 | [WXT](https://wxt.dev/) — 现代浏览器插件开发框架，Manifest V2/V3 自动适配 |
| UI | React + TypeScript |
| 样式 | Tailwind CSS |
| 状态管理 | React Context + useReducer — Todo 级别复杂度无需额外库 |
| 数据存储 | IndexedDB（Dexie.js）— 原生 IndexedDB 的轻量封装，支持复杂查询与大数据量 |
| 构建工具 | WXT 内置（基于 Vite）|

> **选型原则：** 优先选择 LLM 训练数据丰富、抽象层级低、依赖少的方案，确保 AI 辅助开发效率最大化。

## 项目结构（规划）

```
to-up-do/
├── src/
│   ├── background/          # Service Worker — 同步、提醒、消息调度
│   │   ├── index.ts
│   │   ├── sync.ts          # TAPD 定时同步逻辑
│   │   └── reminder.ts      # 提醒调度逻辑
│   ├── popup/               # 点击插件图标弹出的快捷面板
│   │   └── index.tsx
│   ├── side-panel/          # 侧边栏 — 完整的看板视图
│   │   └── index.tsx
│   ├── components/          # 通用组件
│   │   ├── TodoItem.tsx
│   │   ├── TodoList.tsx
│   │   └── ...
│   ├── services/            # 外部服务封装
│   │   ├── ai.ts            # AI 服务调用
│   │   ├── tapd.ts          # TAPD API 调用
│   │   └── notification.ts  # 浏览器通知
│   ├── stores/              # React Context 状态
│   │   ├── todo.ts
│   │   ├── settings.ts
│   │   └── sync.ts
│   ├── db/                  # IndexedDB 数据层
│   │   └── index.ts
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/               # 工具函数
│       ├── date.ts
│       └── parser.ts        # 自然语言解析
├── assets/                  # 图标等静态资源
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 配置说明

插件安装后，在设置页面（Popup 齿轮图标 → Settings）进行以下配置：

### AI 服务配置

```jsonc
{
  "ai": {
    "enabled": true,
    "provider": "openai",        // 支持: openai | anthropic | custom
    "apiKey": "sk-xxx",
    "baseUrl": "https://api.openai.com/v1",  // 可自定义，支持代理地址
    "model": "gpt-4o"
  }
}
```

### TAPD 配置

```jsonc
{
  "tapd": {
    "enabled": true,
    "companyId": "your-company-id",
    "authType": "basic",         // 支持: basic | token
    "username": "your-username",
    "password": "your-password", // 加密存储
    "syncInterval": 30,         // 同步间隔，单位：分钟
    "syncScope": {
      "workitemTypes": ["story", "bug", "task"],
      "statusFilter": ["open", "in_progress"]
    }
  }
}
```

### 提醒配置

```jsonc
{
  "reminder": {
    "enabled": true,
    "deadlineAdvance": 30,      // 提前 N 分钟提醒
    "dailyDigest": true,        // 每日概览
    "idleReminder": true,       // 闲置提醒
    "quietHours": {             # 免打扰时段
      "enabled": true,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

## 快速开始

```bash
# 克隆项目
git clone <repo-url> to-up-do
cd to-up-do

# 安装依赖
npm install

# 开发模式（支持 HMR）
npm run dev

# 构建
npm run build

# 打包为 .zip（用于上传到 Chrome Web Store）
npm run package
```

## Roadmap

### Phase 1 — 浏览器插件（当前）

- [ ] 项目初始化（WXT + React + TypeScript）
- [ ] 待办 CRUD 与本地存储
- [ ] Popup 快捷面板 + Side Panel 看板视图
- [ ] AI 集成 — 智能拆解、优先级建议、自然语言解析
- [ ] TAPD 集成 — 任务拉取、状态同步
- [ ] 待办提醒 — 截止提醒、每日概览
- [ ] 设置页面 — AI / TAPD / 提醒配置化

### Phase 2 — 增强体验

- [ ] 数据云端同步（可选）
- [ ] 快捷键支持
- [ ] TAPD 评论同步
- [ ] AI 周报 / 日报生成
- [ ] 番茄钟计时

### Phase 3 — 多端扩展

- [ ] VS Code 插件
- [ ] 移动端（React Native）
- [ ] CLI 工具
- [ ] Web Dashboard

## License

MIT

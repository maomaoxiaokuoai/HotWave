# ❄️ 热浪聚合 HotWave · 国内外热门热搜榜

一站式聚合 **国内**（百度 / 微博 / B站 / 知乎 / 抖音）与 **海外**（Google Trends / Reddit / Hacker News / X / YouTube）共 10 个平台的热门搜索榜单，全部实时抓取。

- 🎨 8 种界面风格一键切换（冰蓝 / 赛博 / 樱花 / 复古 / 极光 / 黑白 / 液态玻璃 / 崩坏错误），偏好自动记忆
- 🌨️ 天气特效可选（无 / 大雪花 / 下雨 / 雷暴 / 爱心雨），小/中/大三档强度，雷暴含随机闪电
- ✨ 鼠标点击特效（爱心 / 星星 / 雪花 / 随机混合）
- 📊 每 3 分钟自动刷新、地区筛选、实时/演示数据标识、接口异常自动降级演示数据
- 📥 所有平台图标为本地文件，断网也能完整显示
- 🔗 榜单条目与官网按钮直接打开源站（新标签页，无任何中转）

## 技术栈

- Next.js 16（App Router）+ React 19 + Tailwind CSS 4 + TypeScript + Canvas 特效
- PostgreSQL + Drizzle ORM（**可选**，不配置也能完整运行）

## 项目结构

```
├── README.md                    # 唯一文档
├── config/                      # 项目配置（根目录保持干净）
│   ├── drizzle.config.json      # Drizzle 数据库配置
│   └── env.example              # 环境变量示例
├── public/                      # 静态资源（平台图标全部本地化）
│   ├── favicons/                # 各平台官网 favicon
│   ├── icons/                   # SVG 兜底图标 + 站点图标
│   └── icon.svg                 # 站点 favicon
└── src/
    ├── app/                     # Next.js 页面与 API 路由
    │   ├── page.tsx / layout.tsx / globals.css
    │   └── api/                 # hot / settings / health
    ├── components/              # 前端组件
    │   ├── HotHub.tsx           # 主页面聚合组件
    │   ├── fx/WeatherFX.tsx     # 雪/雨/雷暴 Canvas 特效
    │   └── ui/                  # PlatformCard / SVG 图标
    ├── db/                      # PostgreSQL 连接与表结构（可选）
    └── lib/
        ├── themes.ts            # 主题与特效类型定义
        └── hotsearch/           # 抓取引擎
            ├── types.ts         # 平台定义
            ├── fetchers.ts      # 16 个平台的实时抓取器
            └── index.ts         # 聚合 + 内存/数据库缓存
```

## 本地开发

```bash
npm install
npm run dev          # 打开 http://localhost:3000
```

### 可选：启用 PostgreSQL 持久化

```bash
cp config/env.example .env    # 编辑填写 DATABASE_URL
npx drizzle-kit push --config=config/drizzle.config.json   # 推送表结构
```

不配置数据库时：主题/特效偏好保存在浏览器 localStorage，热搜缓存使用内存，功能完全不受影响。

## 部署到 Cloudflare（连接 GitHub 仓库自动部署）

> 2025 年起 Cloudflare 官方推荐用 **OpenNext（@opennextjs/cloudflare）** 部署 Next.js。
> 本项目已针对 Cloudflare 适配：**无需数据库、无需任何密钥**，代码在 Workers 运行时安全。

### 方式一：Cloudflare Workers CI（推荐，最省心）

1. 把代码推到 GitHub 仓库（`.env` 已在 .gitignore 中，不会被提交）
2. Cloudflare Dashboard → **Workers & Pages** → 创建 → **Workers Builds / CI** → Connect to Git，选择你的仓库
3. 构建配置填：

| 配置项 | 值 |
|--------|-----|
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |

4. 保存。之后每次 `git push` 都会自动构建并上线。

> ⚠️ 两个关键点：
> - 仓库里已含 `.node-version`(Node 22)，CF 构建镜像会自动使用它（Next.js 16 要求 Node ≥ 20.9，默认镜像版本过旧会导致构建失败）
> - `wrangler.jsonc` 与 `open-next.config.ts` 已提交到仓库。请勿删除它们，也不要使用 `npx wrangler deploy` 的自动迁移功能；这会让 CI 临时改写依赖，导致构建不稳定。

### 方式二：本地命令行部署

```bash
npm install
npm run cf:build                     # 本地验证构建
npx wrangler login                   # 首次登录 Cloudflare 账号
npm run cf:deploy                    # 一键部署到 Workers
```

### 可选环境变量（Cloudflare）

在项目的 Settings → Variables 中添加（均为可选）：

| 变量 | 说明 |
|------|------|
| `TWITTER_BEARER` | X 热搜抓取的 Bearer Token，不填则使用内置公开访客 token |
| `DATABASE_URL` | **Cloudflare 上不要配置**（Workers 不支持 PostgreSQL TCP 直连，代码会自动降级） |

## 数据说明

- 各平台数据来自公开接口，抓取失败自动降级为演示数据（卡片以「实时 / 演示」呼吸灯标识）
- Reddit 官方 JSON 对数据中心 IP 有封锁，内置 rss2json 备用源自动切换
- YouTube 官方趋势页解析失败时自动切换 Piped 镜像实例
- `/api/hot` 不可用时，前端直接用内置演示数据渲染，页面永不空白

## 常见问题

- **部署后页面打不开/一直转圈**：页面在接口失败时会自动显示演示数据；若完全空白，检查 CF 构建日志中 Node 版本是否 ≥ 20.9（仓库内 `.node-version` 已固定为 22），以及构建命令是否为 `npx @opennextjs/cloudflare build`
- **点击条目打开的是演示数据站**：个别平台接口在 Cloudflare 边缘节点上被限制（如 Reddit），属于正常降级；国内平台与 Google/HN/X/YouTube 均可实时
- **图标显示异常**：所有平台图标为本地文件（`public/favicons`、`public/icons`），与网络无关

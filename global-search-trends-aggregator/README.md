# ❄️ 热浪聚合 HotWave · 国内外热门热搜榜

一站式聚合 **国内**（百度 / 微博 / B站 / 知乎 / 抖音）与 **海外**（Google Trends / Reddit / Hacker News / X / YouTube）共 10 个平台的热门搜索榜单，全部实时抓取。

- 🎨 6 种界面风格一键切换（冰蓝 / 深夜 / 赛博 / 樱花 / 复古 / 圣诞），偏好自动记忆
- 🌨️ 天气特效可选（无 / 雪花 / 下雨 / 雷暴），支持小/中/大三档强度，雷暴含随机闪电
- 📊 每 3 分钟自动刷新、地区筛选、实时/演示数据标识
- 📥 所有平台图标为本地文件，断网也能完整显示
- 🔗 外链走本站 `/go` 中转，避免被目标站安全头拦截

## 技术栈

- Next.js 16（App Router）+ React 19 + Tailwind CSS 4
- TypeScript、Canvas 特效
- PostgreSQL + Drizzle ORM（**可选**，不配置也能完整运行）

## 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

### 可选：启用 PostgreSQL 持久化

```bash
# 1. 准备数据库，写入连接串
cp .env.example .env
# 编辑 .env，取消 DATABASE_URL 注释并填写

# 2. 推送表结构
npx drizzle-kit push
```

不配置数据库时：主题/特效偏好保存在浏览器 localStorage，热搜缓存使用内存，功能完全不受影响。

## 部署到 Cloudflare（GitHub 仓库连接部署）

项目已为 Cloudflare 适配：**无需数据库、无需任何密钥即可部署**。
（Cloudflare Workers 不支持 PostgreSQL 直连，代码已做惰性降级处理。）

### 方式一：Cloudflare Workers + OpenNext（官方推荐）

> Cloudflare 自 2025 年起推荐使用 OpenNext 部署 Next.js 应用。

**1. 安装适配器并本地构建验证**

```bash
npm install -D @opennextjs/cloudflare
npx opennextjs-cloudflare build
```

**2A. 手动部署**

```bash
npx wrangler login
npx wrangler deploy
```

**2B. 连接 GitHub 仓库自动部署（推荐）**

- 打开 Cloudflare Dashboard → **Workers & Pages** → 创建 → **Workers Builds / CI** → Connect to Git
- 选择你的 GitHub 仓库，构建命令填：

```bash
npm install && npx opennextjs-cloudflare build && npx wrangler deploy
```

- 保存后每次 push 代码都会自动构建并上线。

### 方式二：Cloudflare Pages 连接仓库

- 打开 Cloudflare Dashboard → **Workers & Pages** → 创建 → **Pages** → **Connect to Git**
- 选择 GitHub 仓库
- 框架预设选 **Next.js**，构建配置填：

| 配置项 | 值 |
|--------|-----|
| Build command | `npx opennextjs-cloudflare build` |
| Build output directory | `.worker-next` |

- 保存并部署，之后每次 push 自动构建。

### 可选环境变量（Cloudflare）

在对应项目的 Settings → Variables 中添加：

| 变量 | 必填 | 说明 |
|------|------|------|
| `TWITTER_BEARER` | 否 | X 热搜抓取的 Bearer Token，不填则使用内置公开访客 token |
| `DATABASE_URL` | 否 | **Cloudflare 上不要配置**（Workers 不支持 TCP 直连） |

## 数据说明

- 各平台数据来自公开接口，抓取失败时自动降级为演示数据（卡片上以「实时 / 演示」呼吸灯标识）
- Reddit 官方 JSON 对数据中心 IP 有封锁，代码内置 rss2json 备用源自动切换
- YouTube 官方趋势页解析失败时自动切换 Piped 镜像实例

## 常见问题

- **点击榜单条目提示「已阻止 / ERR_BLOCKED_BY_RESPONSE」**：已通过 `/go` 同源中转解决，新标签页顶层跳转，不再触发目标站 X-Frame-Options/CSP 拦截
- **图标显示异常**：所有平台图标为本地文件（`public/favicons`、`public/icons`），与网络无关
- **换浏览器后主题/特效不记住**：本地运行时需配置数据库持久化；Cloudflare 上为 localStorage，仅对当前浏览器生效

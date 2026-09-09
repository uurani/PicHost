# 更新日志

PicHost 版本历史与重要变更说明。完整记录亦见仓库根目录 [CHANGELOG.md](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md)。

---

## [1.4.0] — 2026-09-09

### 新增

- **标签**：每用户彩色标签；设置页管理；上传/图库批量打标；图库 OR / AND 筛选
- **操作日志**：登录、删除、设置、标签等操作；日期与用户筛选
- **API**：标签与打标接口；上传 `tagIds`；列表/统计标签筛选

### 文档

- 截图与 README 同步 v1.4 界面

## [1.3.0] — 2026-09-07

### 新增

- **站点备份 / 恢复 / 跨后端同步** 与任务中心；运维 CLI `backup-export`、`backup-restore`、`storage-sync`

## [1.2.8] — 2026-09-04

### 改进

- **双域名**：保存 / 初始化时弹出风险确认（含锁死说明与 `clear-domains` 恢复方式），不再强制校验当前 Host

### 新增

- **运维 CLI**：`clear-domains` 清除数据库域名配置（`docker exec pichost clear-domains`）

### 文档

- FAQ 与双域名、反代文档补充恢复步骤

## [1.2.7] — 2026-09-03

### 新增

- **登录验证**：登录/注册支持本地滑块、Cloudflare Turnstile、Cap；在「设置 → 访问控制」配置
- **运维 CLI**：`slider` 将验证方式重置为本地滑块（`docker exec pichost slider`）

### 改进

- 登出后登录页验证码可正常重新加载

## [1.2.6] — 2026-09-01

### 新增

- **管理界面**：设置、API、图库、存储页 UI 重构；API 页支持在线调试
- **图库筛选**：按存储后端筛选
- **存储标识**：新建 R2 / COS / OSS / S3 后端按类型生成 `r2-*`、`cos-*`、`oss-*`、`s3-*` 前缀

### 改进

- 操作日志表格样式与路径截断
- 存储后端卡片信息行布局
- 文档站与 README 截图更新

## [1.2.5] — 2026-08-31

### 新增

- **图库页**：导航「统计」改为「图库」（`/gallery`）；点击图片打开详情弹层（大图、尺寸、上传方式、存储路径、链接复制）
- **列表操作**：全选 / 反选；单张删除移至详情弹层
- **上传来源**：图库 API 返回网页 / API 上传方式（来自活动日志）

### 改进

- README 补充技术栈章节

### 移除

- `/stats` 路由（不再保留兼容跳转）

## [1.2.4] — 2026-08-31

### 修复

- **访问控制留空仍拦截外链**：未配置 Referer 白名单时，浏览器直开图片正常，但博客/论坛嵌入会因 Referer 校验返回 403 图裂；现仅在配置了白名单时才启用防盗链

## [1.2.3] — 2026-08-30

### 修复

- **简短图片链接 + 按年/月分组**：纯文件名直链（如 `https://域名/xxx.webp`）不再误当成 `images/xxx.webp`，改为经 SQLite 索引反查 `images/年/月/xxx.webp`，缩略图与短链恢复正常

---

## [1.2.2] — 2026-08-30

> 升级后请**重启服务**使中间件与 API 生效。

### 双域名配置与 Host 隔离

#### 修复

| 问题 | 说明 |
| ---- | ---- |
| 管理域被误清空 | 设置页保存时，关闭双域名或仅改图片域可能把 `site_base_url` 写成空字符串，导致 UI 切回单域、管理域「消失」 |
| 配置与生效 URL 混淆 | `GET /api/settings` 的 `siteBaseUrl` / `imageBaseUrl` 曾混入当前请求的 `origin`，设置页「当前生效」与数据库配置难以区分 |
| 第三 Host 绕过隔离 | `pages.dev`、裸 IP、旧图片域等未纳入配置的 Host 此前不被中间件拦截，后台/API 可能仍可访问 |

#### 改进

**设置 API（`GET /api/settings`）**

| 字段 | 含义 |
| ---- | ---- |
| `siteBaseUrl` / `imageBaseUrl` | **配置值**（DB → 环境变量），不含 request fallback |
| `effectiveSiteBaseUrl` / `effectiveImageBaseUrl` | **直链生成用**，未配置时回退到当前请求 origin |
| `runtime.currentOrigin` | 检测到的当前访问地址（仅展示，不写入配置） |
| `runtime.hostRole` | `site` / `image` / `unknown` / `single` |

**保存 API（`PATCH /api/settings`）**

- 新增 body 字段 `domainSeparation`（`true` / `false`），显式表达是否启用双域名
- `domainSeparation: true` 时网站域与图片域**均必填**，且主机名不能相同
- `domainSeparation: false` 时允许清空网站域
- 未传 `domainSeparation` 且双域名已配置时，**禁止**单独把 `siteBaseUrl` 置空

**设置页 / 首次设置**

- 表单回填配置值；「当前生效」显示 `effective*` 字段
- 展示「检测到当前访问」地址，**不再**自动写入 `window.location.origin`
- 提供「填入检测地址」按钮（用户主动点击才填）
- 关闭双域名需确认弹窗
- 双域名开启且 `hostRole === 'unknown'` 时显示反代绕过警告

**Host 中间件**

- 双域名开启时，非 site/image 的 Host **应用层一律 404**（所有 HTTP 方法）
- 开发环境 `localhost` / `127.0.0.1` 例外，便于 `npm run dev`
- 与 Nginx `default_server` **互补**，建议两层都配置

#### 文档

- 重写 [Cloudflare / CF 优选部署](./cloudflare-deployment.md)（精简结构、检查清单、双层防护）
- 更新 [双域名分离](./domain-separation.md) 第三 Host 与应用层拦截说明
- 新增本页 **更新日志**

#### 升级说明

- **无需**数据库迁移或 CLI 操作
- 若管理域此前已被误清空：在 **设置** 中重新填写网站域，或设置环境变量 `SITE_BASE_URL` 后重启
- 生产双域名部署：确认反代 `server_name` 与设置一致；建议保留 Nginx default server

---

## [1.2.1] — 2026-08-29

### 新增

- 登录滑动拼图验证（缺口对齐）；验证与登录分两步
- VitePress 文档站（`docs-site/`），部署至 GitHub Pages
- `npm run docs:dev` / `docs:build` / `docs:preview`

### 修复

- 统计页删除图片后图库不刷新
- 分页跳转输入框在 `type="number"` 下无法跳转
- 非首页路由下复制链接格式偏好不持久化
- 滑动验证 UI：滑块垂直居中、缺口尺寸与滑块一致

### 改进

- README 精简，详细说明迁入文档站
- 双域名文档补充未知 Host 风险与 Cloudflare 部署说明

---

## [1.2.0] — 2026-08-28

### 变更

- 图片统一存放在 `data/images/`；不再使用与 `images` 并列的顶层目录

### 新增

- 启动时自动同步图片索引（扫描磁盘、归一化遗留 key、清理孤儿记录）

---

## [1.1.x] 摘要

| 版本 | 要点 |
| ---- | ---- |
| 1.1.5 | API 上传后预览偶发失败修复；出图前校验文件存在 |
| 1.1.4 | 按年/月分组存储；网站域禁止直链出图 |
| 1.1.3 | 双域名分离（`SITE_BASE_URL` / `IMAGE_BASE_URL`）；Host 中间件 |
| 1.1.0 | 多存储后端（S3 / R2 等） |

更早版本见 [GitHub CHANGELOG](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md)。

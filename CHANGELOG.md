# Changelog

本仓库自 **v1.0.0** 起作为正式版维护；此前历史提交已归档重置。

## [Unreleased]

## [1.3.0] - 2026-09-07

### 新增

- **站点备份**：存储页导出 `.phost.tar.gz`（含 `pichost.db` 与全部图片），支持下载与任务进度
- **站点恢复**：存储页或 setup 未初始化时从备份包恢复，支持预检与跳过/覆盖冲突
- **跨后端同步**：在已配置存储后端之间拷贝图片并更新索引；后端卡片快捷「迁入 / 迁出」
- **任务中心**：`backup_jobs` 记录最近导出/恢复/同步任务，失败可重试；列表分页
- 运维 CLI：`backup-export`、`backup-restore`、`storage-sync`（`docker exec pichost …`）

### 移除

- 遗留目录迁移 CLI `migrate` / `migrate-to-single-images.mjs`（由启动索引同步与整站备份恢复替代）

### 文档

- [存储](./docs-site/guide/storage.md) 补充备份与迁移说明；更新截图；移除 v1.2 迁移专页

## [1.2.8] - 2026-09-04

### 改进

- 双域名：保存或初始化时弹出风险确认（说明可能锁死及 `clear-domains` 恢复方式），不再强制校验当前 Host

### 新增

- 运维 CLI `clear-domains`：清除数据库中的网站域 / 图片域配置（`docker exec pichost clear-domains`）

### 文档

- FAQ、双域名、反向代理文档补充锁死原因与恢复步骤

## [1.2.7] - 2026-09-03

### 新增

- 登录/注册人机验证：本地滑块、Cloudflare Turnstile、Cap；管理员在「设置 → 访问控制」中切换
- 运维 CLI `slider`：将登录验证重置为本地滑块（`docker exec pichost slider`）

### 改进

- 登出后登录页验证码可正常重新加载

## [1.2.6] - 2026-09-01

### 新增

- 设置、API、图库、存储页 UI 重构（侧栏导航、统计卡片、在线调试等）
- 图库筛选增加存储后端下拉
- 新建对象存储后端按类型生成存储标识：`r2-*`、`cos-*`、`oss-*`、`s3-*`

### 改进

- 操作日志表格：操作/来源标签同行展示，路径列省略号截断、无横向滚动条
- 存储后端卡片：存储标识与类型同一行左对齐排列
- README 与文档站截图、导航说明同步新界面

## [1.2.5] - 2026-08-31

### 新增

- 图库页（`/gallery`）替代原「统计」导航；图片点击放大详情弹层（尺寸、上传方式、存储路径、链接复制）
- 图库列表支持全选、反选；单张删除移至详情弹层
- 图片列表 API 返回上传来源（网页 / API，来自活动日志）

### 改进

- README 补充技术栈说明

### 移除

- `/stats` 路由（不再兼容跳转）

## [1.2.4] - 2026-08-31

### 修复

- 访问控制（Referer 防盗链）留空时仍会拦截外链图片：浏览器直开无 Referer 可访问，博客/论坛嵌入带 Referer 会 403 图裂；现仅在配置了白名单时才校验

## [1.2.3] - 2026-08-30

### 修复

- 开启「简短图片链接」且按年/月分组时，纯文件名直链（如 `/xxx.webp`）误解析为 `images/xxx.webp` 导致 404；现先经 SQLite 索引反查完整 key

## [1.2.2] - 2026-08-30

### 修复

- 双域名：设置页保存时误清空管理域（`site_base_url`）；仅改图片域时保护已有网站域配置
- 双域名：设置 API 配置值与 request origin fallback 混淆，导致「当前生效」显示错误
- 双域名：未配置的第三 Host（`pages.dev`、裸 IP 等）可绕过 Host 隔离访问后台

### 改进

- 设置 API 拆分 `siteBaseUrl` / `imageBaseUrl`（配置值）、`effective*`（直链）、`runtime`（当前访问检测）
- `PATCH /api/settings` 增加 `domainSeparation` 字段与保存校验
- 设置页：检测地址展示、关闭双域名确认、反代 Host 不一致警告；首次设置不再自动填入 origin
- Host 中间件：双域名开启时对未知 Host 返回 404（开发 `localhost` 例外）
- 文档站：新增 [更新日志](https://o96u.github.io/PicHost/guide/changelog)；重写 Cloudflare 部署说明；同步 FAQ / 双域名文档

## [1.2.1] - 2026-08-29

### 新增

- 登录滑动拼图验证（缺口对齐）；验证与登录分两步，登录接口校验 `captchaId` / `captchaPosition`
- VitePress 文档站（`docs-site/`）：中英文指南，部署至 GitHub Pages <https://o96u.github.io/PicHost/>
- `npm run docs:dev` / `docs:build` / `docs:preview`；CI 增加 `docs:build`；`.github/workflows/docs.yml` 发布文档

### 修复

- 修复统计页删除图片后图库不刷新的问题
- 修复分页跳转输入框在 `type="number"` 下无法跳转的问题
- 修复非首页路由下复制链接格式偏好不持久化的问题（`useUploadPreferences` 首次使用时自动加载）
- 滑动验证 UI：滑块垂直居中、缺口尺寸与滑块一致

### 改进

- README 精简为产品宣传页，详细说明指向文档站
- 双域名文档补充：未知 Host 风险、Cloudflare 橙云部署、勿用 Pages/Workers 整站反代
- 文档截图更新（登录页等）；旧 `docs/*.md` 长文迁入 `docs-site/`

## [1.2.0] - 2026-08-28

### 变更

- 图片统一存放在 `data/images/`；遗留 `blog/`、`twikoo/` 等并列目录需迁移后升级

### 新增

- CLI 迁移工具：`docker exec pichost migrate` / `migrate --apply`（`server/cli/migrate-to-single-images.mjs`）
- 扫描 `data/` 下除 `images` 外所有顶层目录中的图片，输出 `data/mapping.json`
- 启动时自动同步图片索引（扫描磁盘、归一化遗留 key、清理孤儿记录），并打印同步日志

### 改进

- 启动时归一化遗留 SQLite key、清理无文件的孤儿索引；支持删除仅索引无文件的记录

## [1.1.5] - 2026-08-28

### 修复

- 修复 API 上传后图库预览偶发失败、需等待刷新才显示的问题
- 图库卡片加载失败后自动重试，刷新列表时重置预览状态

### 改进

- 出图前校验存储文件实际存在，避免索引与磁盘短暂不一致
- 图片 404/403 与域名隔离 404 禁止 CDN 缓存，降低反代误判影响

## [1.1.4] - 2026-08-28

### 新增

- 上传目录可按年/月分组或扁平保存（`storage_use_date_path` / `STORAGE_USE_DATE_PATH`），设置页可切换
- 双域名分离下网站域禁止直链出图，仅图片域可访问图片路径

### 改进

- 隐藏 `images/` 前缀时外链改为仅文件名（如 `xxx.webp`）；图片域仍兼容旧版 `/2026/08/xxx.webp` 短链
- 设置页重构：功能开关、域名配置、存储路径分组展示
- 本地磁盘索引扫描支持扁平路径；文件夹列表 `images` 置顶

## [1.1.3] - 2026-08-27

### 新增

- 后台与图片域名分离（`SITE_BASE_URL` / `IMAGE_BASE_URL`）：单实例双域名，Host 中间件隔离图片域非图片路径
- `/setup` 与系统设置支持启用/关闭域名分离，设置页可后续关闭并恢复单域
- 可选隐藏外链中的 `images/` 前缀（多文件夹时确认提示）
- 设置页加载时检测 GitHub 最新版本并提示更新
- 双域名部署文档（Nginx / Lucky / 本地 hosts 测试）：[文档站 · 双域名分离](https://o96u.github.io/PicHost/guide/domain-separation)

### 改进

- 双域名下防盗链自动放行网站域与图片域主机名
- 开发服务器默认绑定 `127.0.0.1:3000`，便于 hosts 双域本地测试
- API 文档补充自定义文件夹的 cURL 示例

### 其他

- 许可证变更为 GPL-3.0-only
- `scripts/` 目录改为本地维护，不再纳入仓库

## [1.1.2] - 2026-08-26

### 新增

- 操作日志页（`/logs`）：记录上传/删除，管理员可查看全部用户并筛选
- 图库记录支持按存储后端筛选
- 上传 IP / API Token 限流（15 分钟窗口）

### 改进

- 操作日志记录存储后端；图库卡片可展示存储来源
- 存储筛选下拉固定「本地磁盘」排在第二位
- 系统设置页版本号链接至 GitHub Releases

### 修复

- 修复删除存储后端后确认弹窗闪出空名称

## [1.1.1] - 2026-08-26

### 修复

- 移除启动时自动创建的空白「S3 兼容存储」占位；升级后自动清理旧占位记录
- 修复管理页切换路由时反复闪现「正在验证登录状态」
- 修复静默会话校验后设置 / 统计 / API 页不加载数据

### 改进

- Docker 日志：4xx/5xx 分级输出，记录错误原因与堆栈；上传/启动任务失败写入详细错误

## [1.1.0] - 2026-08-26

### 新增

- S3 兼容对象存储后端（R2 / AWS S3 / 腾讯云 COS / 阿里云 OSS）
- `storage_backends` + `images` 索引表，列表/搜索/统计改查 SQLite
- 混合直链：`proxy`（默认，PicHost 代理）与 `public`（302 到 CDN）
- 管理员 `/storage` 存储管理页：多后端卡片、用量条、添加/编辑/删除云存储实例
- 可选环境变量覆盖存储配置（`STORAGE_BACKEND`、`S3_*`）

### 改进

- 启动时自动将本地磁盘图片扫描迁入 `images` 索引（幂等）
- 上传/删除/直链/auto-delete 按 `backend_id` 路由到对应后端

## [1.0.4] - 2026-08-25

### 新增

- 密码输入框支持显示/隐藏切换（`PasswordInput` 组件，含无障碍文案）

### 改进

- 遗留 `ADMIN_SECRET` 部署：`/setup`、`/register` 路由与 `needsMigration` 检测对齐
- 合并重复的密码不一致 i18n 文案；移除未使用的 `jose` 依赖

### 修复

- 修复 `PasswordInput` 导致 CI typecheck 失败

## [1.0.3] - 2026-08-23

### 修复

- 修复 CI typecheck 失败（移动端菜单、i18n、统计页图库刷新）
- Docker 构建：arm64 改用原生 ARM Runner，避免 QEMU 下 `npm ci` 极慢
- Docker 构建：启用 npm 缓存挂载，加快依赖安装

## [1.0.2] - 2026-08-23

### 新增

- 中英文界面（`@nuxtjs/i18n`），语言切换与主题切换独立菜单
- 移动端导航：汉堡菜单 + 分组用户菜单（语言 / 外观 / 账户）
- Docker 忘记密码：`docker exec pichost reset-password`（随机密码，见 `server/cli/`）
- Docker 升级到 v1.2.0 前迁移遗留目录：`docker exec pichost migrate` / `migrate --apply`

### 改进

- 统计页工具栏与图库布局（桌面单行、移动端适配）
- 上传卡片视觉优化（背景图、插图、悬停边框动效）
- Logo 与上传区图片压缩，减小体积

## [1.0.1] - 2026-08-22

### 修复

- 系统设置页底部显示当前应用版本号
- 修复移动端上传偏好面板内容被裁剪、无法完整展示的问题

## [1.0.0] - 2026-08-22

### 新增

- 多用户账号体系：Web 引导创建管理员、用户名密码登录、可选开放注册
- 角色权限：管理员 / 普通用户；图库按 `userId` 隔离，服务端强制校验
- 个人 API Token：每用户独立 Token，脚本上传归属对应账号
- 上传偏好：客户端预压缩、WebP 质量、自动复制链接、按用户自动删除策略
- 管理员系统设置：注册开关、防盗链、访问域名、默认上传目录
- 统计页：图库浏览 / 搜索 / 批量删除；管理员显示注册用户数量
- Twikoo / EasyImage 2.0 兼容：`POST /api/index.php`
- 遗留 `ADMIN_SECRET` 一次性迁移至账号密码

### 技术栈

- Nuxt 4 + Nuxt UI 4
- 本地磁盘存储 + SQLite
- sharp 服务端 WebP 压缩
- Docker 多架构镜像（amd64 / arm64）

### 路线图

- **v1.2.0**（开发中）：统一 `images/` 存储、遗留目录迁移 CLI、启动索引同步

[1.2.0]: https://github.com/O96u/PicHost/releases/tag/v1.2.0
[1.1.1]: https://github.com/O96u/PicHost/releases/tag/v1.1.1
[1.1.0]: https://github.com/O96u/PicHost/releases/tag/v1.1.0
[1.0.4]: https://github.com/O96u/PicHost/releases/tag/v1.0.4
[1.0.3]: https://github.com/O96u/PicHost/releases/tag/v1.0.3
[1.0.2]: https://github.com/O96u/PicHost/releases/tag/v1.0.2
[1.0.1]: https://github.com/O96u/PicHost/releases/tag/v1.0.1
[1.0.0]: https://github.com/O96u/PicHost/releases/tag/v1.0.0

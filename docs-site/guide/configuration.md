PicHost 支持通过环境变量（Docker / `.env`）与后台 **设置** 页配置。管理员在 **设置与偏好**（`/settings`）左侧切换 **基础设置**、**域名与路径**、**访问控制**、**标签管理**、**操作日志**；多数项 **SQLite 优先**；部分项环境变量可覆盖或锁定后台编辑。

![基础设置](/screenshots/settings.png)

## 优先级总览

| 配置项 | 优先级（高 → 低） | 环境变量覆盖后台 |
| ------ | ----------------- | ---------------- |
| API 上传 Token | 环境变量 → SQLite | **是**（设了则后台无法重新生成） |
| WebP 质量 | SQLite → 环境变量 → 默认 80 | 否（未在 DB 存时读 env） |
| 防盗链白名单 | SQLite → 环境变量 | 否 |
| 网站 / 图片域名 | SQLite → 环境变量（设置 API 配置值）；直链生成另用 `effective*` 或请求 origin | 否 |
| 简短图片链接 | SQLite → 环境变量 → 默认 false | 否 |
| 按年/月分组存储 | SQLite → 环境变量 → 默认 true | 否 |
| 全局自动删除天数 | SQLite → 环境变量 → 默认 0 | 否 |
| 登录人机验证 | SQLite（设置 → 访问控制） | 否 |

## 变量说明

### `API_UPLOAD_TOKEN`

外部脚本上传 Token（Twikoo / 油猴 / 博客）。请求头：`Auth-Token: <token>`；表单上传仍可用 `token` 字段。

- 未配置时可在后台 **API** 页生成
- **环境变量一旦设置，优先级最高**，后台显示「由环境变量覆盖」且无法重新生成
- 别名：`NUXT_API_UPLOAD_TOKEN`

### `ALLOWED_REFERER_HOSTS`

防盗链白名单，逗号分隔域名。自身域名自动放行。可选；不填可在设置页配置。若环境变量有值且 SQLite 未存，则使用环境变量。

### `SITE_BASE_URL` / `IMAGE_BASE_URL`

- **网站域名**：管理后台、API、Twikoo 上传入口
- **图片域名**：复制链接与直链使用的公网地址

双域名分离需两者主机名不同，详见 [双域名分离](./domain-separation.md) 与 [Cloudflare / CF 优选部署](./cloudflare-deployment.md)。填写后须与反代 `server_name` 一致；**勿**通过 `localhost`、IP 或未配置的域名访问生产后台。

在后台 **设置** 中保存时须显式勾选「启用后台与图片域名分离」，并同时填写两个域名；关闭双域名会清除网站域配置（需确认）。设置 API 返回的配置值与「当前生效」直链地址已分离，详见 [更新日志](./changelog.md#1-2-2-2026-08-30)。

### `HIDE_FOLDER_IN_URL`

`true` 时使用简短图片链接（仅域名 + 文件名，如 `img.example.com/a8K3xP.webp`）；`false` 时保留日期或自定义目录（如 `img.example.com/2026/08/a8K3xP.webp`）。对外 URL **不会** 暴露内部 `images/` 前缀；旧版含 `images/` 的直链仍兼容。

### `STORAGE_USE_DATE_PATH` / `STORAGE_LAYOUT`

- `STORAGE_USE_DATE_PATH=true`（默认）或 `STORAGE_LAYOUT=date`：新图保存为 `images/年/月/随机ID.webp`
- `false` 或 `STORAGE_LAYOUT=flat`：保存为 `images/随机ID.webp`

也可在设置页切换。

### `DATA_DIR`

图片与 SQLite 根目录。默认 `./data`，容器内为 `/data`。

### `WEBP_QUALITY`

服务端 WebP 压缩质量 1–100，默认 **80**。

### `AUTO_DELETE_DAYS`

全局自动删除超过 N 天的图片，`0` 表示关闭。启用后仅影响**之后新上传**的图片（与按用户策略一致）。也可在设置页配置。

### `DEV_BYPASS_ACCESS`

仅本地开发：`true` 绕过登录验证。生产环境勿用。

### 登录人机验证（仅后台设置）

在 **设置 → 访问控制** 配置，存入 SQLite，无对应环境变量：

| 方式 | 说明 |
| ---- | ---- |
| **本地滑块**（默认） | 无需第三方服务 |
| **Cloudflare Turnstile** | 填写 Site Key 与 Secret Key |
| **Cap** | 填写 API Endpoint 与 Secret |

登录与注册共用同一验证方式。若第三方配置错误导致无法登录，执行 `docker exec pichost slider`（或 `npm run slider`）恢复为本地滑块。

### 存储后端（可选）

管理员通常在 **存储** 页添加后端；也可用环境变量引导（如 `STORAGE_BACKEND=s3` 与 `S3_*`）。详见 [存储](./storage.md)。

## Docker Compose 示例

```yaml
services:
  pichost:
    image: muxui/pichost:latest
    ports:
      - "6892:6892"
    volumes:
      - ./data:/data
    environment:
      SITE_BASE_URL: https://admin.example.com
      IMAGE_BASE_URL: https://pic.example.com
      API_UPLOAD_TOKEN: your-secret-token
      WEBP_QUALITY: "85"
```

修改环境变量后需 **重启容器** 才能生效（Token、质量等读取在启动时或请求时按实现读取）。

## 与后台设置对照

| 后台设置项 | 对应环境变量 |
| ---------- | ------------ |
| API Token | `API_UPLOAD_TOKEN` |
| 防盗链 | `ALLOWED_REFERER_HOSTS` |
| 网站域名 | `SITE_BASE_URL` |
| 图片域名 | `IMAGE_BASE_URL` |
| 隐藏目录前缀 | `HIDE_FOLDER_IN_URL` |
| 按年/月分组 | `STORAGE_USE_DATE_PATH` / `STORAGE_LAYOUT` |
| WebP 质量 | `WEBP_QUALITY` |
| 自动删除 | `AUTO_DELETE_DAYS` |
| 登录验证 | （仅后台 **设置 → 访问控制**） |

完整模板见仓库根目录 [`.env.example`](https://github.com/O96u/PicHost/blob/main/.env.example)。

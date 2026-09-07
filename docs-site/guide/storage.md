# 存储

PicHost 支持 **本地磁盘** 与 **S3 兼容对象存储**（Cloudflare R2、腾讯云 COS、阿里云 OSS、AWS S3 等）。管理员在 **存储**（`/storage`）页管理后端；新上传写入 **默认后端**。页面顶部展示 **存储总览**（总量、已用、剩余、使用率与容量分布），下方为各后端卡片与支持的后端类型说明。

![存储管理](/screenshots/storage.png)

## 存储结构（本地）

```
/data
├── pichost.db          # SQLite：用户、会话、设置、storage_backends、images 索引
└── images/             # 本地后端时的全部图片文件
```

- 新上传：`images/随机ID.webp` 或 `images/年/月/随机ID.webp`（可在设置中切换扁平模式）
- 迁移遗留：`images/blog/...` 等子路径
- 云存储时文件在对应桶内，索引仍在 SQLite `images` 表

所有图片 **key** 以 `images/` 开头。上传 API **不再接受** `folder` 参数。

## 添加存储后端

1. 以管理员登录，打开 **存储** → **添加存储**。
2. 选择类型：**本地磁盘** 或 **S3 兼容**（含 R2 / COS / OSS 预设）。
3. 填写连接信息（桶名、Endpoint、Access Key 等）。
4. 保存后可 **设默认**，新上传将写入该后端。

新建对象存储后端的 **存储标识** 按类型自动生成前缀：本地为 `local`；R2 为 `r2-*`；COS 为 `cos-*`；OSS 为 `oss-*`；AWS S3 及自定义 S3 兼容为 `s3-*`（创建后不可修改，图片索引会引用该 ID）。

### Cloudflare R2 要点

| 项 | 值 |
| -- | -- |
| Endpoint | `https://<account_id>.r2.cloudflarestorage.com` |
| Region | `auto` |
| 桶 | 你的 R2 桶名 |
| 密钥 | R2 API Token 的 Access Key / Secret Key |

若仓库 **cloudflare** 分支专用于「仅 R2」部署，也可用环境变量预设，见 [文档首页](./index.md) 分支说明。

### 环境变量（可选）

部分部署用环境变量初始化默认 S3 后端（如 `STORAGE_BACKEND=s3`、`S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_REGION`）。**UI 中配置的后端信息存于 SQLite**，与环境变量并存时以管理界面为准管理多后端。

## 直链模式

每个后端可配置公开 URL 行为：

| 模式 | 说明 |
| ---- | ---- |
| **proxy** | 通过 PicHost 同源代理出图（`GET /images/...`） |
| **public** | 302 重定向到桶/CDN 公网地址 |

复制链接时使用 **图片域名**（`IMAGE_BASE_URL`）拼接路径。开启「隐藏 images 前缀」后 URL 可能更短，服务按文件名或路径反查索引。

## 用量与筛选

- 存储页展示各后端用量（本地扫描目录，对象存储查询 API）
- 图库可按 **存储后端**、**上传来源** 筛选，支持网格/列表视图切换；点击图片打开详情弹窗（尺寸、存储路径、多格式链接复制）

## 备份与迁移（v1.3.0+）

存储页 **备份与迁移** 面板包含三张功能卡与下方 **最近任务** 列表：

| 能力 | 说明 |
| ---- | ---- |
| **创建站点备份** | 导出 `.phost.tar.gz`，含 `pichost.db` 与全部图片（含云存储中的对象）；展示预计体积与备份包含项 |
| **从备份恢复** | 本地上传或选择 `data/backups/` 内已有包，预检后确认；可选跳过/覆盖冲突图片 |
| **跨后端同步** | 在已配置后端间拷贝图片并更新索引；展示待迁移数量与体积，支持预检、删源、设默认 |

![备份与迁移](/screenshots/storage.png)

- 导出文件保存在 `data/backups/`；后端同一时间仅允许一个进行中的备份/迁移任务
- 任务列表支持分页，可下载导出包、查看恢复结果、重试失败的同步任务
- 备份包 **不含** 云存储 Access Key / Secret Key，恢复后请在存储页重新填写
- 未初始化实例可在 **setup** 页 **从备份恢复** 标签上传整站包（始终覆盖模式）

![从备份恢复（setup）](/screenshots/setup-restore.png)

### CLI

```bash
# 导出整站备份
docker exec pichost backup-export

# 从备份恢复（默认跳过冲突图片）
docker exec pichost backup-restore /data/backups/pichost-xxx.phost.tar.gz
docker exec pichost backup-restore /data/backups/pichost-xxx.phost.tar.gz --overwrite

# 跨后端同步
docker exec pichost storage-sync --from local --to s3-xxx --dry-run
docker exec pichost storage-sync --from local --to s3-xxx --set-default
```

本地开发（项目根目录）：

```bash
npm run backup-export
npm run backup-restore -- data/backups/pichost-xxx.phost.tar.gz
npm run storage-sync -- --from local --to s3-xxx --dry-run
```

### 手动备份

仍可同时备份 `data/images/`（本地后端）、`data/pichost.db` 与各云桶中的对象；推荐使用上文整站导出。

## 相关

- [环境变量](./configuration.md) — `STORAGE_USE_DATE_PATH`、`HIDE_FOLDER_IN_URL`
- [用户与权限](./users-and-permissions.md) — 谁可以管理存储

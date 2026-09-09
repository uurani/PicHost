# API

PicHost 提供 REST 接口与 Twikoo 兼容端点。登录后打开顶栏 **API** 页：左侧为接口目录与 Token 管理，中间为参数说明与 cURL 示例，右侧可 **在线调试** 发送请求。

![API 文档与在线调试](/screenshots/api.png)

## 鉴权

所有 REST 接口使用请求头：

```http
Auth-Token: YOUR_TOKEN
```

| Token 类型 | 获取方式 | 说明 |
| ---------- | -------- | ---- |
| **全局 Token** | 管理员 **API** 页生成；或 `API_UPLOAD_TOKEN` 环境变量 | 环境变量优先且锁定后台重新生成 |
| **个人 Token** | 各用户 **API** 页 | 仅用于该用户脚本，上传归属本人 |

表单上传仍可使用字段 `token`（Twikoo 协议）。

## 接口列表

### 1. 上传图片

`POST /api/images/upload`

上传单张或多张图片。字段 `image` 传图片；仍兼容 `file`、`files`。存入 `images/`。

```bash
curl -X POST "https://admin.example.com/api/images/upload" \
  -H "Auth-Token: YOUR_TOKEN" \
  -F "image=@./demo.png" \
  -F 'tagIds=[1,2]'
```

可选表单字段 `tagIds`：JSON 数组字符串（如 `[1,2]`）或重复字段，上传成功后自动打标。存储路径仍为 `images/年/月/id.webp`，**不会**因标签创建子目录。

### 2. 获取图片列表

`GET /api/images`

分页列出图库。`limit` 默认 20、最大 100。

```bash
curl "https://admin.example.com/api/images?limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

可选查询参数：

| 参数 | 说明 |
| ---- | ---- |
| `tagIds` | 逗号分隔的标签 ID，默认 **OR**（含任一标签） |
| `tagMode` | `and` 时多标签取交集 |
| `untagged` | `1` 仅返回无标签图片 |

响应 `items[]` 含 `tags` 数组（`id`、`name`、`color`）。

### 3. 搜索图片

`GET /api/images/search`

按文件名或路径关键词搜索，参数 `q` 必填。

```bash
curl "https://admin.example.com/api/images/search?q=demo&limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 4. 删除图片

`DELETE /api/images`

通过 `key` 删除单张，`key` 为存储路径（如 `images/2026/08/xxx.webp`）。

```bash
curl -X DELETE "https://admin.example.com/api/images?key=images/2026/08/xxxx.webp" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 5. 批量删除

`POST /api/images/batch-delete`

请求体 JSON：`{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}`

```bash
curl -X POST "https://admin.example.com/api/images/batch-delete" \
  -H "Auth-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'
```

### 6. 标签管理

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| `GET` | `/api/tags` | 当前用户标签列表（含 `imageCount`） |
| `POST` | `/api/tags` | 创建 `{ "name": "工作", "color": "#22c55e" }` |
| `PATCH` | `/api/tags/:id` | 改名称/颜色 |
| `DELETE` | `/api/tags/:id` | 删除标签（不删图片） |
| `POST` | `/api/tags/merge` | `{ "sourceIds": [2,3], "targetId": 1 }` |

### 7. 图片打标

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| `POST` | `/api/images/tags` | `{ "key": "images/…", "tagIds": [1,2] }` 追加 |
| `PATCH` | `/api/images/tags` | 整体替换标签集合 |
| `DELETE` | `/api/images/tags` | `key` + `tagId` 移除单个 |
| `POST` | `/api/images/batch-tags` | `{ "keys": [], "tagIds": [], "action": "add" \| "remove" }` |

`GET /api/stats` 支持与列表相同的 `tagIds` / `tagMode` / `untagged` 筛选，统计与当前筛选一致。

## 错误格式

REST 接口返回 JSON，含 `code` 与 `message`（如 `UNAUTHORIZED`、`FORBIDDEN`、`INVALID_REQUEST`）。Twikoo 端点使用 EasyImage 兼容 JSON 格式。

## 权限与可见范围

- 普通用户 Token：列表/搜索/删除仅作用于自己的图片
- 管理员 Token：可访问全部图片
- 全局 Token 上传的图片归属管理员

详见 [用户与权限](./users-and-permissions.md)。

## Twikoo

`POST /api/index.php` 见 [Twikoo](./twikoo.md)。

## 相关

- [环境变量](./configuration.md) — `API_UPLOAD_TOKEN`
- [反向代理](./reverse-proxy.md) — 公网 URL 与 HTTPS

# 快速开始

PicHost 适合在 NAS、家用服务器或 VPS 上自托管图床。推荐用 Docker 部署，首次访问通过 Web 向导创建管理员。

## 在线体验

| 分支 | 说明 |
| ---- | ---- |
| **main** | 无公网演示；产品界面见 [文档首页](./index.md#截图预览) 或仓库 README |
| **cloudflare** | R2 专用线在线演示：[pic.roven.cc](https://pic.roven.cc) |

## Docker（推荐）

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

默认端口 **6892**。浏览器打开 `http://<主机IP>:6892`，按引导创建管理员即可。

已克隆仓库时也可用：

```bash
docker compose up -d
```

见仓库内 `docker-compose.yml`。

## 首次设置

1. 访问实例 URL（Docker 默认 `http://<主机>:6892`）。
2. 在 `/setup` 选择 **创建管理员** 或 **从备份恢复**：
   - **创建管理员**：填写用户名与密码，可选开放注册、双域名等。
   - **从备份恢复**：上传 `.phost.tar.gz` 整站备份包（覆盖当前数据；云存储密钥需恢复后重新填写）。
3. （可选）配置网站域名、图片域名、防盗链等 — 详见 [环境变量](./configuration.md) 与 [双域名分离](./domain-separation.md)。
4. 登录后可在首页上传图片；顶栏可进入 **图库**、**存储**（管理员）、**设置**、**API**。

| 创建管理员 | 从备份恢复 |
| :--------: | :--------: |
| ![首次设置](/screenshots/setup.png) | ![从备份恢复](/screenshots/setup-restore.png) |

已初始化实例请使用 [存储 → 备份与迁移](./storage.md#备份与迁移v130) 恢复，而非 setup 页。

## 登录

访问上传、图库、设置等管理页面前需登录。在登录卡片中填写用户名与密码，完成人机验证后点击 **登录**。

默认使用**本地滑块**（拖动滑块对齐缺口）。管理员可在 **设置 → 访问控制** 切换为 **Cloudflare Turnstile** 或 **Cap**，并填写对应 Site Key / Secret 或 API 端点。

![登录页](/screenshots/login.png)

若管理员开启了开放注册，可前往注册页创建账号（同样需完成人机验证）。遗留部署仍可能使用密钥登录（见界面提示）。

### 验证方式被锁死时

若 Turnstile / Cap 配置错误导致无法登录，可在服务器上重置为本地滑块：

```bash
docker exec pichost slider
```

本地开发：`npm run slider`

## 忘记密码

需能执行 `docker exec`（相当于服务器权限）：

```bash
# 无参数：重置管理员（仅当系统中只有一个管理员时）
docker exec pichost reset-password

# 指定用户名：可重置管理员或普通用户
docker exec pichost reset-password 用户名
```

终端会打印随机新密码；用户不存在时会报错。登录后请到「修改密码」更换。

本地开发：`npm run reset-password` 或 `npm run reset-password -- 用户名`

## 双域名配置锁死

若启用双域名后通过 IP / 内网地址无法进入后台：

```bash
docker exec pichost clear-domains
```

本地：`npm run clear-domains`。详见 [常见问题 — 双域名配置后后台 404](./faq.md#双域名配置后后台-404-进不去)。

## 下一步

- [本地开发](./local-dev.md) — `npm run dev` 与 `.env`
- [环境变量](./configuration.md) — 生产配置
- [存储](./storage.md) — 多后端与直链
- [API](./api.md) — Token 与 REST 接口

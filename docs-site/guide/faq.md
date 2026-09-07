# 常见问题

## 忘记管理员密码怎么办？

能执行 `docker exec` 时：

```bash
docker exec pichost reset-password
# 或指定用户名
docker exec pichost reset-password 用户名
```

本地：`npm run reset-password`。详见 [快速开始](./getting-started.md#忘记密码)。

## 为什么后台无法重新生成 API Token？

若设置了环境变量 `API_UPLOAD_TOKEN`，Token 由环境变量 **锁定**，需修改 env 并 **重启服务**。见 [环境变量](./configuration.md#api-upload-token)。

## 图片外链显示「盗链」或无法加载？

检查 **防盗链白名单**（`ALLOWED_REFERER_HOSTS` 或设置页）。引用图片的站点域名需在白名单中；PicHost 自身域名与双域名场景下的网站域、图片域会自动放行。

## 双域名配置后后台 404 / 进不去？

**原因：** 启用双域名后，PicHost 会对**未配置的网站域、图片域之外**的 Host 全站返回 404。常见触发方式：

1. 通过 IP 或内网地址打开设置，保存了公网网站域 / 图片域
2. 反代「强制域名」或 Host 头配置错误，PicHost 收到的 Host 与设置中的网站域不一致

**恢复（已锁死时）：**

```bash
docker exec pichost clear-domains
# 仅清除网站域：docker exec pichost clear-domains --site
```

本地开发：`npm run clear-domains`。执行后用原来的 IP / 内网地址刷新即可重新进入后台，再按文档正确配置双域名。

**预防：** 保存双域名时注意确认框中的风险提示；反代须 `proxy_set_header Host $host;` 并保留 `X-Forwarded-Proto`。详见 [双域名分离](./domain-separation.md#中间件隔离与第三-host)。

## 双域名下为什么用 pages.dev / workers.dev / IP 也能进后台？

**v1.2.2 起：** 双域名开启时，PicHost 中间件会对**未配置的网站域、图片域之外**的 Host 返回 **404**（开发环境 `localhost` / `127.0.0.1` 例外）。详见 [更新日志](./changelog.md#1-2-2-2026-08-30)。

若仍能访问，常见原因：

1. **未启用双域名**（仅配置了图片域、网站域为空）— 隔离与第三 Host 拦截均不生效
2. **反代把 Host 改成管理域** — 例如 Pages/Worker 对图片域 `fetch(admin…)`，PicHost 看到的是管理域
3. **源站裸暴露 `6892`** — 绕过 Cloudflare 与 Nginx `server_name`

处理：在设置中正确配置双域名；反代加 default server；橙云时源站只放行 CF IP；勿用 Pages/Workers 整站反代。详见 [双域名分离](./domain-separation.md#中间件隔离与第三-host)、[Cloudflare 部署](./cloudflare-deployment.md) 与 [更新日志](./changelog.md#1-2-2-2026-08-30)。

## 能把 PicHost 部署到 Cloudflare Workers / Pages 吗？

**不能（现状）。** 项目使用 `node-server`、SQLite、`sharp` 与本地 `data/`，需 Docker / VPS。CF 控制台「从 Git 创建 Worker」连本仓库会部署失败。

推荐：源站跑 PicHost，CF 用 **橙云 DNS**（含优选）+ 可选 **R2 存储**；不要用 Pages/Workers 反代整站。

## 双域名下后台能打开但缩略图裂图？

- 确认 **图片域名** 配置正确且反代到同一实例
- 后台请用 **网站域名** 打开，不要用 `localhost` 混用
- 见 [双域名分离](./domain-separation.md)

## 图库有删不掉的记录？

可能是 **孤儿索引**（有记录无文件）。重启后启动同步会自动清理；也可在图库中手动删除。

## 如何备份与迁移整站？

v1.3.0 起在 **存储** 页使用「备份与迁移」面板，或 CLI：

```bash
docker exec pichost backup-export
docker exec pichost backup-restore /data/backups/pichost-xxx.phost.tar.gz
docker exec pichost storage-sync --from local --to s3-xxx --dry-run
```

备份包含数据库与全部图片，**不含** 云存储密钥；恢复后请在存储页重新填写。详见 [存储 → 备份与迁移](./storage.md#备份与迁移v130)。

## 开发时如何跳过登录？

`DEV_BYPASS_ACCESS=true`（仅本地，勿用于生产）。正常流程请访问 `/setup` 创建管理员。

## 文档与仓库 README 哪个为准？

**本 VitePress 文档站** 为完整用户指南；README 保留摘要与快速开始。在线地址：<https://o96u.github.io/PicHost/>

## GitHub 仓库 About 怎么写？

**main** 分支建议：

- **Description**：`Lightweight self-hosted image hosting — Docker, multi-user, gallery & API, local disk or S3-compatible storage.`
- **Website**：`https://o96u.github.io/PicHost/`（文档站，非图床演示）

勿写「部署在 Cloudflare Pages/Workers」—— PicHost 应用跑在 Docker/VPS；**cloudflare** 分支在线演示为 [pic.roven.cc](https://pic.roven.cc)。

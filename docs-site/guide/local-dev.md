# 本地开发

在仓库根目录进行 Nuxt 4 全栈开发，数据默认写入 `./data`。

## 环境要求

- Node.js **22**
- npm **11**（与 `package.json` 中 `packageManager` 一致）

## 启动

```bash
npm install
cp .env.example .env   # 可选
npm run dev
```

访问 `http://localhost:3000/setup` 创建管理员。数据目录默认 `./data`（`DATA_DIR` 可改）。

## 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行 `.output` |
| `npm run lint` | ESLint |
| `npm run typecheck` | 类型检查 |
| `npm test` | 单元测试 |
| `npm run reset-password` | 重置密码（可选用户名） |
| `npm run slider` | 将登录验证重置为本地滑块 |
| `npm run clear-domains` | 清除数据库中的网站域 / 图片域配置（双域名锁死时恢复） |

## 开发专用环境变量

| 变量 | 说明 |
| ---- | ---- |
| `DEV_BYPASS_ACCESS` | 设为 `true` 可绕过登录（跳过 `/setup`，一般无需开启） |
| `DATA_DIR` | 数据目录，默认 `./data` |

完整变量列表见 [环境变量](./configuration.md)。

## 双域名本地测试

修改系统 `hosts` 后可用两个测试域名验证分离逻辑，步骤见 [双域名分离](./domain-separation.md#本地测试-windows-macos)。

## 文档站

```bash
npm run docs:dev      # VitePress 开发
npm run docs:build    # 构建静态站点
npm run docs:preview  # 预览构建结果
```

文档源码在 `docs-site/`；截图源文件在 `docs/screenshots/`（含 `login.png`、`setup.png`、`setup-restore.png` 等），构建前会复制到 `docs-site/public/screenshots/`。在线文档：<https://o96u.github.io/PicHost/>

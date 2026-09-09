# Local development

Full-stack Nuxt 4 development at the repository root. Data defaults to `./data`.

## Requirements

- Node.js **22**
- npm **11** (see `packageManager` in `package.json`)

## Start

```bash
npm install
cp .env.example .env   # optional
npm run dev
```

Open `http://localhost:3000/setup` to create the admin account. Data directory defaults to `./data` (`DATA_DIR` overrides).

## Common commands

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Run `.output` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type check |
| `npm test` | Unit tests |
| `npm run reset-password` | Reset password (optional username) |
| `npm run slider` | Reset login verification to local slider |
| `npm run clear-domains` | Clear site/image URL settings from DB (recover from dual-domain lockout) |

## Dev-only variables

| Variable | Description |
| -------- | ----------- |
| `DEV_BYPASS_ACCESS` | `true` bypasses login (skips `/setup`; rarely needed) |
| `DATA_DIR` | Data directory, default `./data` |

Full list: [Environment variables](./configuration.md).

## Dual-domain local test

Edit `hosts` and follow [Dual-domain separation](./domain-separation.md) for local verification.

## Documentation site

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

Sources live in `docs-site/`; screenshot sources are in `docs/screenshots/` (including `upload.png`, `gallery.png`, `tags.png`, `api.png`, `storage.png`, `settings.png`, `logs.png`, `setup.png`, etc.), copied to `docs-site/public/screenshots/` before build. Live docs: <https://o96u.github.io/PicHost/>

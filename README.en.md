<p align="center">
  <img src="app/assets/image/logo-light.png" alt="PicHost" width="96" />
</p>

<h1 align="center">PicHost</h1>

<p align="center"><strong>Lightweight personal image hosting</strong> · Simple uploads, clean management</p>

<p align="center">Self-hosted / Multi-user / Docker / API / Twikoo · Local disk or object storage</p>

<p align="center">
  <a href="https://github.com/O96u/PicHost/blob/main/package.json"><img src="https://img.shields.io/github/package-json/v/O96u/PicHost?style=flat-square&color=22c55e" alt="version" /></a>
  <a href="https://github.com/O96u/PicHost/actions/workflows/ci.yml"><img src="https://github.com/O96u/PicHost/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white" alt="Nuxt 4" />
  <a href="https://hub.docker.com/r/muxui/pichost"><img src="https://img.shields.io/badge/Docker-muxui%2Fpichost-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="GPL-3.0" />
</p>

<p align="center">
  <a href="https://o96u.github.io/PicHost/en/">Docs</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="README.md">简体中文</a>
</p>

---

## Screenshots

**main** has no public demo. **cloudflare** branch live demo: [pic.roven.cc](https://pic.roven.cc)

| Upload | Gallery |
| :----: | :-----: |
| ![Upload](docs/screenshots/upload.png) | ![Gallery](docs/screenshots/gallery.png) |

| API | Tag management |
| :-: | :------------: |
| ![API](docs/screenshots/api.png) | ![Tags](docs/screenshots/tags.png) |

| Storage | Settings |
| :-----: | :-------: |
| ![Storage](docs/screenshots/storage.png) | ![Settings](docs/screenshots/settings-en.png) |

| First-time setup | Restore from backup |
| :--------------: | :-----------------: |
| ![Setup](docs/screenshots/setup.png) | ![Setup restore](docs/screenshots/setup-restore.png) |

| Activity log |
| :----------: |
| ![Activity log](docs/screenshots/logs.png) |

## Features

- **Drag, click, or Ctrl+V paste** — server-side WebP, Referer hotlink protection
- **Multi-user** — login with slider, Turnstile, or Cap verification; optional registration; users see only their images
- **Multi-backend storage** — local disk + S3-compatible (R2 / COS / OSS / AWS); hybrid `proxy` / `public` URLs
- **Gallery** — browse, search, filter by storage/source/tags, grid/list views, batch delete and batch tagging; stats overview and source breakdown; image detail modal with link formats
- **Tags** — per-user colored tags; tag on upload (single or batch); manage in Settings (create, recolor, merge, delete); API supports `tagIds` and batch tagging
- **Backup & migration** — full-site export/restore (`.phost.tar.gz`), cross-backend sync; restore from backup on uninitialized `/setup`
- **API & Twikoo** — global / per-user tokens; `POST /api/index.php` compatible
- **Zero-config Docker** — first-run web wizard, no secrets upfront

## Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| Frontend | [Nuxt 4](https://nuxt.com) · [Nuxt UI 4](https://ui.nuxt.com) · [Vue 3](https://vuejs.org) · [Tailwind CSS 4](https://tailwindcss.com) · TypeScript |
| Backend | [Nitro](https://nitro.build) (`node-server`) · REST API |
| Data | SQLite · local `data/pichost.db` |
| Images | [sharp](https://sharp.pixelplumbing.com) (server-side WebP) |
| Storage | Local disk · S3-compatible ([AWS SDK](https://aws.amazon.com/sdk-for-javascript/) · R2 / COS / OSS, etc.) |
| i18n | [@nuxtjs/i18n](https://i18n.nuxtjs.org) (zh-CN / English) |
| Quality & docs | [Vitest](https://vitest.dev) · [VitePress](https://vitepress.dev) docs site |
| Deploy | Docker · Node.js 22 |

## Quick Start

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

Open `http://<host>:6892` and complete the setup wizard.

**Full guide** (env vars, upgrades, dual-domain setup, API, Twikoo, reverse proxy, local dev, etc.): **[Documentation](https://o96u.github.io/PicHost/en/)**.

| Branch | Notes |
| ------ | ----- |
| [**main**](https://github.com/O96u/PicHost/tree/main) | Default: multi-backend, dual-domain, unified `images/` storage |
| [**cloudflare**](https://github.com/O96u/PicHost/tree/cloudflare) | Cloudflare R2 only; live demo [pic.roven.cc](https://pic.roven.cc) |

## License

[GPL-3.0](LICENSE)

## Friend links

[LINUX DO](https://linux.do/)

# PicHost documentation

Welcome to the PicHost user guide. This site is the single source of truth; the repository README keeps a short overview and quick start.

## Suggested reading order

1. [Quick start](./getting-started.md) — Docker and first-time setup
2. [Environment variables](./configuration.md) — Production config vs in-app settings
3. [Changelog](./changelog.md) — Version history and upgrade notes
4. [Storage](./storage.md) — Backends and URL modes
5. [API](./api.md) — REST endpoints and tokens

## Screenshots

**main** has no public demo. Below are current product screenshots (v1.3.0+).

| API | Gallery (detail) |
| :-: | :--------------: |
| ![API](/screenshots/api.png) | ![Gallery](/screenshots/gallery.png) |

| Storage | Settings |
| :-----: | :-------: |
| ![Storage](/screenshots/storage.png) | ![Settings](/screenshots/settings-en.png) |

| First-time setup | Restore from backup |
| :--------------: | :-----------------: |
| ![Setup](/screenshots/setup.png) | ![Setup restore](/screenshots/setup-restore.png) |

| Activity log |
| :----------: |
| ![Activity log](/screenshots/logs.png) |

## Branches

| Branch | Notes |
| ------ | ----- |
| [**main**](https://github.com/O96u/PicHost/tree/main) | Full product; screenshots above |
| [**cloudflare**](https://github.com/O96u/PicHost/tree/cloudflare) | R2-only; live demo [pic.roven.cc](https://pic.roven.cc) |

Use **main** for multiple cloud backends; use **cloudflare** if you only deploy with Cloudflare R2.

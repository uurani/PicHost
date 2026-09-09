# Changelog

Version history and notable changes. The full log is also in the repo root [CHANGELOG.md](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md).

---

## [1.4.0] — 2026-09-09

### Added

- **Tags**: per-user colored tags; Settings management; batch tagging on upload/gallery; OR / AND gallery filters
- **Activity log**: login, delete, settings, tag operations; date and user filters
- **API**: tag and tagging endpoints; upload `tagIds`; list/stats tag filters

### Docs

- Screenshots and README updated for v1.4 UI

## [1.3.0] — 2026-09-07

### Added

- **Site backup / restore / cross-backend sync** with job center; CLI `backup-export`, `backup-restore`, `storage-sync`

## [1.2.8] — 2026-09-04

### Improved

- **Dual-domain**: confirm dialog on save/setup with lockout risks and `clear-domains` recovery; no longer blocks save based on current Host

### Added

- **Ops CLI**: `clear-domains` clears site/image URL settings from DB (`docker exec pichost clear-domains`)

### Docs

- FAQ and dual-domain / reverse-proxy guides updated with recovery steps

## [1.2.7] — 2026-09-03

### Added

- **Login verification**: slider, Cloudflare Turnstile, or Cap on login/register; configure under Settings → Access
- **Ops CLI**: `slider` resets verification to the local slider (`docker exec pichost slider`)

### Improved

- Login captcha reloads correctly after logout

## [1.2.6] — 2026-09-01

### Added

- **Admin UI**: redesigned Settings, API, Gallery, and Storage pages; API page includes live debugging
- **Gallery filter**: filter by storage backend
- **Storage IDs**: new R2 / COS / OSS / S3 backends get `r2-*`, `cos-*`, `oss-*`, or `s3-*` prefixes

### Improved

- Activity log table styling and path truncation
- Storage backend card metadata layout
- Docs site and README screenshots updated

## [1.2.5] — 2026-08-31

### Added

- **Gallery page**: nav “Stats” renamed to “Gallery” (`/gallery`); click a thumbnail for a detail modal (full image, dimensions, upload source, storage path, link copy)
- **List actions**: select all / invert selection; single-image delete moved into the detail modal
- **Upload source**: gallery API returns web / API upload source (from activity logs)

### Improved

- README tech stack section

### Removed

- `/stats` route (no compatibility redirect)

## [1.2.4] — 2026-08-31

### Fix

- **Empty referer whitelist still blocked hotlinks**: with no Referer whitelist configured, direct browser access worked but embedded images on blogs/forums returned 403; protection now runs only when a whitelist is configured

## [1.2.3] — 2026-08-30

### Fix

- **Short links + date-based storage**: bare filename URLs (e.g. `https://host/xxx.webp`) no longer map to flat `images/xxx.webp`; SQLite index resolves the full `images/YYYY/MM/xxx.webp` key so thumbnails and short links work again

---

## [1.2.2] — 2026-08-30

> **Restart the service** after upgrading so middleware and API updates take effect.

### Dual-domain settings & Host isolation

#### Fixes

| Issue | Description |
| ----- | ----------- |
| Site URL cleared by mistake | Saving Settings could write an empty `site_base_url` when disabling dual-domain or editing only the image URL |
| Config vs effective URL mixed | `GET /api/settings` used to blend DB values with `request.origin`, confusing the Settings UI |
| Third-host bypass | Unlisted hosts (`pages.dev`, bare IP, old image domains) were not blocked by middleware |

#### Improvements

**Settings API (`GET /api/settings`)**

| Field | Meaning |
| ----- | ------- |
| `siteBaseUrl` / `imageBaseUrl` | **Configured** values (DB → env), no request fallback |
| `effectiveSiteBaseUrl` / `effectiveImageBaseUrl` | **Link generation**, falls back to request origin when unset |
| `runtime.currentOrigin` | Detected access URL (display only, not saved) |
| `runtime.hostRole` | `site` / `image` / `unknown` / `single` |

**Save API (`PATCH /api/settings`)**

- New body field `domainSeparation` (`true` / `false`)
- `domainSeparation: true` requires both URLs with different hostnames
- `domainSeparation: false` allows clearing the site URL
- Without `domainSeparation`, cannot clear `siteBaseUrl` while dual-domain is active

**Settings / setup UI**

- Form uses configured values; “Active” line shows `effective*`
- Shows detected access URL; **no longer** auto-fills `window.location.origin`
- “Use detected URL” button (opt-in)
- Confirmation modal when disabling dual-domain
- Warning when `hostRole === 'unknown'` with dual-domain on

**Host middleware**

- When dual-domain is on, unlisted hosts get **404** at the app layer (all methods)
- `localhost` / `127.0.0.1` exempt in development
- Complements Nginx `default_server` — use both layers in production

#### Docs

- Rewrote [Cloudflare deployment](./cloudflare-deployment.md)
- Updated [Dual-domain separation](./domain-separation.md) for third-host blocking
- Added this changelog page

#### Upgrade notes

- **No** database migration or CLI step
- If the site URL was cleared earlier: re-enter it in **Settings**, or set `SITE_BASE_URL` in env and restart
- Production: match proxy `server_name` to Settings; keep a default server block

---

## [1.2.1] — 2026-08-29

### Added

- Slide puzzle login captcha
- VitePress docs site on GitHub Pages
- `npm run docs:dev` / `docs:build` / `docs:preview`

### Fixed

- Gallery not refreshing after delete on stats page
- Pagination jump with `type="number"` input
- Copy-link format preference not persisting off home route
- Captcha UI alignment

### Improved

- README trimmed; details moved to docs
- Dual-domain docs: unknown Host risk, Cloudflare guide

---

## [1.2.0] — 2026-08-28

### Changed

- All images under `data/images/`; parallel top-level folders beside `images` are no longer used

### Added

- Startup index sync (disk scan, legacy key normalization, orphan cleanup)

---

## [1.1.x] summary

| Version | Highlights |
| ------- | ---------- |
| 1.1.5 | API upload preview fix; file existence check before serve |
| 1.1.4 | Date-based storage paths; site host blocks image URLs |
| 1.1.3 | Dual-domain (`SITE_BASE_URL` / `IMAGE_BASE_URL`); Host middleware |
| 1.1.0 | Multi storage backends (S3 / R2) |

Older entries: [GitHub CHANGELOG](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md).

# Quick start

PicHost is a self-hosted image host for NAS, home servers, or VPS. Docker is recommended; the first visit runs a web wizard to create the admin account.

## Try it online

| Branch | Notes |
| ------ | ----- |
| **main** | No public demo — see [screenshots](./index.md#screenshots) or the repository README |
| **cloudflare** | R2-only live demo: [pic.roven.cc](https://pic.roven.cc) |

## Docker (recommended)

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

Default port: **6892**. Open `http://<host>:6892` and complete setup.

If you cloned the repo:

```bash
docker compose up -d
```

See `docker-compose.yml` in the repository.

## First-time setup

1. Open your instance URL (Docker default `http://<host>:6892`).
2. On `/setup`, choose **Create admin** or **Restore backup**:
   - **Create admin** — username, password, optional registration and dual-domain options.
   - **Restore backup** — upload a `.phost.tar.gz` full-site package (replaces current data; re-enter cloud storage secrets after restore).
3. (Optional) Configure site URL, image URL, Referer rules — see [Environment variables](./configuration.md) and [Dual-domain separation](./domain-separation.md).
4. Upload from the home page; use the top nav for **Gallery**, **Storage** (admin), **Settings**, and **API**.

| Create admin | Restore from backup |
| :----------: | :-----------------: |
| ![Setup](/screenshots/setup.png) | ![Setup restore](/screenshots/setup-restore.png) |

For an already-initialized instance, use [Storage → Backup & migration](./storage.md#backup--migration-v130) instead of `/setup`.

## Sign in

Management pages (upload, gallery, settings, etc.) require login. Enter username and password, complete the verification challenge, then click **Sign in**.

The default is a **local slider** (align the thumb with the gap). Admins can switch to **Cloudflare Turnstile** or **Cap** under **Settings → Access control**, with the matching site key / secret or API endpoint.

![Login](/screenshots/login.png)

If registration is enabled, create an account from the register page (same verification). Legacy deployments may still use a secret key (see the on-screen hint).

### Locked out of verification

If Turnstile / Cap is misconfigured and you cannot sign in, reset to the local slider on the server:

```bash
docker exec pichost slider
```

Local dev: `npm run slider`

## Forgot password

Requires `docker exec` (server access):

```bash
docker exec pichost reset-password              # admin only when there is exactly one
docker exec pichost reset-password <username> # admin or regular user
```

A random password is printed. Change it after login.

Local dev: `npm run reset-password` or `npm run reset-password -- <username>`

## Dual-domain lockout

If dual-domain is enabled and IP / LAN access returns 404:

```bash
docker exec pichost clear-domains
```

Local: `npm run clear-domains`. See [FAQ — Admin 404 after dual-domain setup](./faq.md#admin-404--locked-out-after-dual-domain-setup).

## Next steps

- [Local development](./local-dev.md)
- [Environment variables](./configuration.md)
- [Storage](./storage.md)
- [API](./api.md)

# Storage

PicHost supports **local disk** and **S3-compatible object storage** (Cloudflare R2, Tencent COS, Alibaba OSS, AWS S3, etc.). Admins manage backends at **Storage** (`/storage`); new uploads go to the **default** backend. The page shows a **storage overview** (total, used, remaining, usage rate, capacity chart) plus per-backend cards and supported backend types.

![Storage management](/screenshots/storage.png)

## Layout (local)

```
/data
├── pichost.db          # SQLite: users, sessions, settings, storage_backends, images index
└── images/             # All files when using local backend
```

- New uploads: `images/randomId.webp` or `images/YYYY/MM/randomId.webp` (flat mode in Settings)
- Migrated legacy: `images/blog/...` and similar
- With cloud backends, blobs live in the bucket; index stays in SQLite `images`

All **keys** start with `images/`. The upload API does **not** accept a `folder` parameter.

## Adding a backend

1. Sign in as admin → **Storage** → **Add backend**.
2. Choose **local disk** or **S3-compatible** (R2 / COS / OSS presets).
3. Enter connection details (bucket, endpoint, keys).
4. **Set as default** so new uploads use it.

New object-storage backends get an auto-generated **storage ID** prefix: `local` for disk; `r2-*` for R2; `cos-*` for COS; `oss-*` for OSS; `s3-*` for AWS S3 and custom S3-compatible endpoints (immutable after creation; the image index references this ID).

### Cloudflare R2

| Field | Value |
| ----- | ----- |
| Endpoint | `https://<account_id>.r2.cloudflarestorage.com` |
| Region | `auto` |
| Bucket | Your R2 bucket name |
| Keys | R2 API token access / secret |

The **cloudflare** branch streamlines R2-only deploys; see branch notes on the [docs overview](./index.md).

### Environment variables (optional)

Some installs seed a default S3 backend via `STORAGE_BACKEND=s3`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`. **UI-configured backends live in SQLite** alongside env-based defaults.

## URL modes

| Mode | Behavior |
| ---- | -------- |
| **proxy** | Serve via PicHost (`GET /images/...`) |
| **public** | 302 redirect to bucket/CDN public URL |

Copied links use **IMAGE_BASE_URL**. “Hide folder prefix” may shorten URLs; the server resolves by path or basename.

## Usage & gallery filter

- Per-backend usage on the Storage page
- Gallery filters by **storage backend** and **upload source**; grid/list view toggle; click a thumbnail for the detail modal (dimensions, storage path, link formats)

## Backup & migration (v1.3.0+)

The **Backup & migration** panel has three action cards and a paginated **Recent jobs** table below:

| Feature | Description |
| ------- | ------------- |
| **Create site backup** | Export `.phost.tar.gz` with `pichost.db` and all images (including objects on cloud backends); shows estimated size and package contents |
| **Restore from backup** | Upload locally or pick an existing package under `data/backups/`, preview, then confirm; skip or overwrite conflicting images |
| **Cross-backend sync** | Copy images between configured backends and update the index; shows pending count/size, dry-run, optional delete-source and set-default |

![Backup & migration](/screenshots/storage.png)

- Exports are saved under `data/backups/`; only one backup/migration job may run at a time
- Job list supports pagination; download exports, view restore summaries, retry failed sync jobs
- Packages **do not** include cloud storage secrets — re-enter them on the Storage page after restore
- Uninitialized instances can use the **Restore backup** tab on `/setup` (always overwrite mode)

![Setup restore](/screenshots/setup-restore.png)

### CLI

```bash
docker exec pichost backup-export
docker exec pichost backup-restore /data/backups/pichost-xxx.phost.tar.gz
docker exec pichost backup-restore /data/backups/pichost-xxx.phost.tar.gz --overwrite
docker exec pichost storage-sync --from local --to s3-xxx --dry-run
docker exec pichost storage-sync --from local --to s3-xxx --set-default
```

Local development (project root):

```bash
npm run backup-export
npm run backup-restore -- data/backups/pichost-xxx.phost.tar.gz
npm run storage-sync -- --from local --to s3-xxx --dry-run
```

### Manual backup

You can still back up `data/images/`, `data/pichost.db`, and bucket objects directly; prefer the full-site export above.

## See also

- [Environment variables](./configuration.md)
- [Users & permissions](./users-and-permissions.md)

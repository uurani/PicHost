# API

PicHost exposes REST endpoints and a Twikoo-compatible upload. After sign-in, open **API** in the nav: a sidebar lists endpoints and token controls, the center shows parameters and copyable cURL, and the right panel supports **live debugging**.

![API docs and debugger](/screenshots/api.png)

## Authentication

All REST calls use:

```http
Auth-Token: YOUR_TOKEN
```

| Token type | How to obtain | Notes |
| ---------- | ------------- | ----- |
| **Global** | Admin **API** page or `API_UPLOAD_TOKEN` env | Env wins and blocks UI regenerate |
| **Personal** | Each user’s **API** page | Uploads belong to that user |

Form uploads may use field `token` (Twikoo protocol).

## Endpoints

### 1. Upload images

`POST /api/images/upload`

Upload one or more images via `image`; also accepts `file`, `files`. Stored under `images/`.

```bash
curl -X POST "https://admin.example.com/api/images/upload" \
  -H "Auth-Token: YOUR_TOKEN" \
  -F "image=@./demo.png" \
  -F 'tagIds=[1,2]'
```

Optional form field `tagIds`: JSON array string or repeated fields. Tags do **not** change storage paths under `images/`.

### 2. List images

`GET /api/images`

Paginated gallery. `limit` default 20, max 100.

```bash
curl "https://admin.example.com/api/images?limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

Optional query: `tagIds` (comma-separated, OR by default), `tagMode=and`, `untagged=1`. Each item includes a `tags` array.

### 3. Search images

`GET /api/images/search`

Search by filename or path; `q` is required.

```bash
curl "https://admin.example.com/api/images/search?q=demo&limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 4. Delete image

`DELETE /api/images`

Delete by `key` (storage path, e.g. `images/2026/08/xxx.webp`).

```bash
curl -X DELETE "https://admin.example.com/api/images?key=images/2026/08/xxxx.webp" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 5. Batch delete

`POST /api/images/batch-delete`

JSON body: `{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}`

```bash
curl -X POST "https://admin.example.com/api/images/batch-delete" \
  -H "Auth-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'
```

### 6. Tags

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/tags` | List current user’s tags |
| `POST` | `/api/tags` | Create `{ "name": "work", "color": "#22c55e" }` |
| `PATCH` | `/api/tags/:id` | Rename or recolor |
| `DELETE` | `/api/tags/:id` | Delete tag (images remain) |
| `POST` | `/api/tags/merge` | Merge tags into a target |

### 7. Image tags

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/images/tags` | Add tags to an image |
| `PATCH` | `/api/images/tags` | Replace tag set |
| `DELETE` | `/api/images/tags` | Remove one tag |
| `POST` | `/api/images/batch-tags` | Batch add/remove |

`GET /api/stats` accepts the same tag filter query params as the list API.

## Errors

REST responses are JSON with `code` and `message` (`UNAUTHORIZED`, `FORBIDDEN`, `INVALID_REQUEST`, etc.). Twikoo uses EasyImage-compatible JSON.

## Visibility

- User token: list/search/delete own images only
- Admin token: all images
- Global token uploads belong to admin

See [Users & permissions](./users-and-permissions.md).

## Twikoo

`POST /api/index.php` — [Twikoo](./twikoo.md).

## See also

- [Environment variables](./configuration.md)
- [Reverse proxy](./reverse-proxy.md)

# 🚀 Deploying the Admin Panel to Vercel

> Deploy the **backend (Render) first** — you need its URL here.

The Admin is a **static Vite SPA**. It calls the backend **directly from the
browser**, so the backend's `CORS_ORIGINS` must include this app's Vercel URL.

---

## Step 1 — Import the project

Vercel → **Add New → Project** → import `ulmind-com/Srikrishna-Seva-Niketan-Admin`.

Vercel auto-detects the settings from [`vercel.json`](vercel.json):

- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA rewrites:** all routes → `/index.html` (so deep links / refresh work)

You normally don't change anything here.

## Step 2 — Environment variables

Project → **Settings → Environment Variables** (scope: **Production**, and
Preview if you use it):

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://<backend>.onrender.com/api/v1` — **must include `/api/v1`**, no trailing slash |
| `VITE_APP_NAME` | `Srikrishna Seva Niketan` |

> ⚠️ `VITE_*` vars are **baked in at build time**. If you change one, you must
> **redeploy** for it to take effect.

## Step 3 — Deploy, then wire up CORS

1. Deploy. Note the URL, e.g. `https://srikrishna-seva-niketan-admin.vercel.app`.
2. Go back to **Render → backend → Environment** and make sure `CORS_ORIGINS`
   contains this exact URL (comma-separated with the frontend URL), then redeploy.
3. Open the Admin URL and log in with the backend's `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login/API calls fail with **CORS error** | Backend `CORS_ORIGINS` is missing this Vercel URL → add it, redeploy backend |
| Refresh on a sub-route → **404** | SPA rewrite missing — `vercel.json` already handles it; ensure it wasn't removed |
| Calls hit the wrong host / 404 | `VITE_API_BASE_URL` wrong or missing `/api/v1` → fix, **redeploy** |
| Changed env var but nothing changed | `VITE_*` is build-time → redeploy |
| Blank page, console asset 404 | wrong Output Directory — keep it `dist` |

See also: [README](README.md)

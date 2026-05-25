# Render setup (CHIMERA API) — simple steps

Your site is **two parts**:

| Part | Host | What it runs |
|------|------|----------------|
| **Website** | Netlify | React app (`dist/`) |
| **API** | Render | `server/index.mjs` (login, backup, sync, online play) |

Netlify proxies `/api/chimera/*` → Render (see `netlify.toml`). You do **not** need CORS for normal use.

---

## 1. Deploy / update the API on Render

1. Open [dashboard.render.com](https://dashboard.render.com) and sign in.
2. If you already have **chimera-data-api** (or similar):
   - Open that service → **Manual Deploy** → **Deploy latest commit** (after you push to GitHub).
3. If you do **not** have a service yet:
   - **New** → **Blueprint**
   - Connect GitHub repo `CobraThorn/chimerachess-`
   - Render reads `render.yaml` and creates **chimera-data-api**
   - Wait until status is **Live** (first deploy ~3–5 min).

4. Copy the service URL, e.g. `https://chimerachess-0so2.onrender.com`

5. Test in a browser:

   `https://chimerachess-0so2.onrender.com/api/chimera/health`

   You should see `"ok": true`.

**Free tier:** the API sleeps after ~15 min idle. The first request after sleep can take **30–60 seconds** — that is normal, not a crash.

---

## 2. Point Netlify at Render (proxy)

In **Netlify** → your site → **Environment variables**:

- Do **not** set `VITE_CHIMERA_API_URL` (leave it empty).

In `netlify.toml` the redirect should match your Render URL:

```toml
to = "https://chimerachess-0so2.onrender.com/api/chimera/:splat"
```

If your Render URL differs, edit that line, commit, push. Netlify redeploys on push to `main`.

---

## 3. Optional Render environment variables

Render → **chimera-data-api** → **Environment**:

| Variable | Purpose |
|----------|---------|
| `CHIMERA_OPENAI_API_KEY` | GPT coach (`sk-...`) |
| `CHIMERA_CORS_ORIGIN` | Only if you set `VITE_CHIMERA_API_URL` on Netlify |
| `CHIMERA_ADMIN_SECRET` | Admin wipe endpoint |

Save → Render redeploys automatically.

---

## 4. Testers

After this deploy, each user should **sign out and sign in once** (new session tokens for backup/sync).

---

## 5. Local dev (no Render)

```bash
npm run dev:full
```

App: http://localhost:5173 — API proxied to localhost:8787.

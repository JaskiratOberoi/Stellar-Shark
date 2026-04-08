# Nexus by Stellar Infomatica (Genomics dashboard)

## Run with Docker (API + PostgreSQL)

1. Copy [.env.example](.env.example) to `.env` and set any LIS / scraper variables your deployment needs.
2. Start the stack:

```bash
docker compose up --build
```

- **Web + API on the host**: [http://127.0.0.1:3101](http://127.0.0.1:3101) by default (maps to the app inside the container). Override with `NEXUS_APP_PORT` if needed.
- **PostgreSQL** is only on the Docker network (not published to the host) so it does not conflict with a local Postgres on port 5432. Data is stored in the `nexus_pgdata` volume.

Production deployments should terminate **HTTPS** in front of the app container (nginx, Caddy, Traefik, or a cloud load balancer). Set `CORS_ORIGINS` if the SPA is served from a different origin than the API (for example Vite on port 5173 during development).

## Windows desktop (thin client)

The packaged app **does not** bundle the server. It opens your deployed site in an embedded browser.

1. Set **`NEXUS_DESKTOP_BACKEND_URL`** to your HTTPS origin (for example `https://lab.example.com/`), **or**
2. Create **`%APPDATA%\Nexus\config.json`**:

```json
{ "backendUrl": "https://lab.example.com/" }
```

3. Unpacked development: run the API locally (`npm run dev:server` or Docker), then `npm run desktop:dev`. The shell defaults to `http://127.0.0.1:3101/` when not packaged and no URL is configured.

Build the installer: `npm run desktop:dist`.

## Local development (no Docker)

```bash
npm install
npm run dev
```

Uses JSON files under `./data` unless `DATABASE_URL` is set (then Postgres is required). The API listens on **port 3101** by default (`PORT` in `.env`); Vite dev server proxies `/api` to that port.

**Login returns 404:** The Vite proxy must target the same port as the API. `web/vite.config.js` reads `PORT` from the **repository root** `.env`. If your API runs on another port (e.g. `PORT=3001`), either change that to `3101` or set `VITE_API_PORT=3001` in root `.env` and restart `npm run dev`. Ensure the Node server is running (not only Vite).

## Multi-module app (PostgreSQL required)

When `DATABASE_URL` is set, the API enables **JWT authentication** and multi-tenant features:

- **Teller** (`/teller/dashboard`) — LIS counter, reports, scheduler (all authenticated roles). Old `/shark/*` URLs redirect here.
- **Lab** (`/lab/*`) — lab technicians only; scoped to assigned BUs and machines.
- **Admin** (`/admin/*`) — super admin only: BUs, machines, kits, parameters, React Flow parameter↔machine mapping, inventory, users, daily validation.

On first migration, a **super admin** user is seeded if none exists (username `Jas`; password set in [`server/db/migrate.js`](server/db/migrate.js)). **Change this password immediately in production** and set a strong `JWT_SECRET` in `.env`.

Lab technician accounts are created from **Admin → Users** with BU assignments.

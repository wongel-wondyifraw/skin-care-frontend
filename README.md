# Medaf Skin Care — Admin Frontend

Next.js admin portal for Medaf Skin Care (catalogue, orders, customers, settings).

## Setup

```bash
npm install
```

Copy env as needed:

```bash
# Local backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

# Or local frontend → Render backend (recommended for quick runs)
NEXT_PUBLIC_API_BASE_URL=/api
API_PROXY_TARGET=https://skin-care-backend-br1d.onrender.com
```

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated visits redirect to `/admin/login`.

Customer Mini App catalog lives at `/shop` (open from the Telegram bot Products button). It authenticates via Telegram `initData`, not admin login.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run test:e2e:ui` | Playwright UI mode |

## E2E smoke test

Requires the frontend (and usually the backend API) running.

```bash
# Terminal A
npm run dev

# Terminal B — with admin credentials
set E2E_ADMIN_EMAIL=admin@example.com
set E2E_ADMIN_PASSWORD=your-password
npm run test:e2e
```

On Unix:

```bash
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=your-password npm run test:e2e
```

If credentials are missing, the smoke test skips instead of failing.

Optional: `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).

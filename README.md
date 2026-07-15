# Deviante Web

React frontend for the Deviante maintenance intelligence platform.

## Stack

- React 19 + Vite
- React Router
- Mock API via `localStorage` (swap to Ktor when `VITE_USE_REMOTE_API=true`)

## Typography

Deviante uses **GT Planar** from the shared Gestalt tokens:

```
gestalt/tokens/
├── fonts/GT-Planar-VF.woff2
└── typography.css    # responsive --type-* variables
```

Imported via `@gestalt/tokens` alias in `vite.config.js`.

Design system: [design-system/README.md](../../design-system/README.md) · Figma [Deviante v1.0](https://www.figma.com/design/DzMGsKozRhijjcFFngdy4S/--PIBITI-----Deviante-v1.0?node-id=142-896)

Responsive type tokens share the same property names across breakpoints (mobile · tablet 768px · desktop 1024px): `--type-body-*`, `--type-h1-*`, `--type-h2-*`, etc.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Implemented use cases (UI shell)

| UC | Screen | Route |
|----|--------|-------|
| UC1 | Login | `/login` |
| UC1 | Account settings | `/account` |
| UC2 | Main dashboard | `/dashboard` |
| UC2 | Process detail | `/processes/:processId` |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | — | Publishable / anon key |
| `VITE_USE_REMOTE_API` | `false` | Use Ktor API instead of local mock |
| `VITE_API_URL` | `/api` | API base URL |

Copy `deviante/web/.env.example` → `.env`.

### Google OAuth

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client (Web):
   - Authorized JavaScript origins: `http://localhost:5173` (and production URL later)
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → Google: paste Client ID + Client Secret, Save.
3. **Supabase** → Authentication → URL Configuration:
   - Site URL: `http://localhost:5173`
   - Redirect URLs (add all dev origins you use):
     ```
     http://localhost:5173/**
     http://192.168.1.31:5173/**
     ```
     Update the LAN IP when it changes. If Supabase rejects the redirect, it falls back to **Site URL** (`localhost`) — on a phone that fails with “cannot connect to server”.

### Google OAuth on a phone (same Wi‑Fi)

Use the **Network** URL from Vite (e.g. `http://192.168.1.31:5173`), not `localhost`.

| Where | Add |
|-------|-----|
| **Google OAuth client** → JavaScript origins | `http://192.168.1.31:5173` |
| **Supabase** → Redirect URLs | `http://192.168.1.31:5173/**` |

Open the app on the phone with that IP **before** clicking **Continuar com Google** (the app sends `redirectTo` from the current origin).

## Project structure

```
src/
├── components/   layout + shared UI
├── context/      AuthProvider
├── lib/          api, validation, storage
├── pages/        route screens
└── routes/       auth guards
```

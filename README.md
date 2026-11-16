# Realtime Bingo Multiplayer

Full-stack, real-time multiplayer bingo platform: admins create sessions with several game rooms, players buy cards and join live games, and winners are verified automatically. TypeScript monorepo (pnpm workspaces).

## Features

- **Real-time game** over Socket.IO: ball drawing (manual or auto-draw), live card marking, ball history, bingo claims and automatic winner verification.
- **Admin dashboard**: create sessions and multiple rooms per session (capacity, prizes, cards per room from 1 to 1000), start/pause games, set independent prizes, review payments and sessions with charts.
- **Player flow**: email/Google auth, visual card selection, five payment methods with manual verification (Pago Movil, Zelle, USDT, Bizum, cash) and an audit trail.
- **Patterns**: horizontal, vertical, diagonal, corners, custom shapes (L, M, O, X) and full card.
- **Persistence**: game state in memory, Redis and PostgreSQL.
- **Security**: Supabase Auth, Row Level Security, rate limiting, zod validation.
- **Quality**: Vitest unit tests, Playwright E2E, ESLint, Prettier, Husky hooks.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Chart.js, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, zod, winston |
| Database / Auth | Supabase (PostgreSQL + RLS + Edge Functions) |
| Cache | Redis (ioredis / Upstash) |
| Shared | `@bingo/shared-types` package (types and zod schemas shared by both apps) |
| Infra | Docker multi-stage builds, docker-compose |

## Architecture

```
apps/backend       Express + Socket.IO game server (routes, services, socket handlers)
apps/frontend      React SPA (admin and player UIs, E2E tests in tests/e2e)
packages/shared-types   Shared TypeScript types and zod schemas
supabase/          SQL migrations (schema, RLS, RPC functions) and Edge Functions
docs/              Setup and testing guides
```

Clients authenticate with Supabase; the Socket.IO server validates the access token, keeps live game state in memory with Redis persistence, and writes durable data to PostgreSQL through atomic RPC functions (for example payment approval).

## Run locally

Requirements: Node >= 20, pnpm >= 8, a Supabase project, optionally Redis.

```bash
pnpm install
pnpm --filter @bingo/shared-types build
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# fill in your Supabase URL/keys; apply supabase/migrations in order
pnpm dev            # backend :3001, frontend :5173
pnpm test           # unit tests
pnpm test:e2e       # Playwright
```

See `docs/QUICK-START.md` and `docs/setup/` for details. All payment data in `.env.example` and migrations are placeholders.

## Built by

Gustavo Tejera, https://github.com/GustavoVzla

License: MIT.

---

## Resumen en español

Plataforma de bingo multijugador en tiempo real (monorepo TypeScript): panel de administración con varias salas por sesión, flujo de jugador con cinco métodos de pago verificados manualmente, sorteo automático o manual con Socket.IO y verificación automática de ganadores. Stack: React 19 + Vite, Node/Express + Socket.IO, Supabase (PostgreSQL con RLS) y Redis. Para ejecutarlo: `pnpm install`, copiar los `.env.example`, aplicar las migraciones y `pnpm dev`.

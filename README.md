# Streamly

Streamly is a monorepo streaming platform with:

- `apps/web`: Next.js customer and admin interface.
- `apps/api`: NestJS API, authentication, catalog, playback, imports and admin endpoints.
- `apps/api/prisma`: PostgreSQL schema, migrations and seed.
- `deploy`: production Docker/Caddy support.
- `scripts`: smoke checks and operational helpers referenced by `package.json`.

## Local Setup

Prerequisites: Node.js 24, npm and Docker Desktop.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
npm install
npm run db:generate
npm run db:deploy
node apps/api/scripts/prisma.cjs db seed
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health/live`

Create the first administrator from an interactive terminal:

```powershell
npm run admin:bootstrap
```

Add `NEXT_PUBLIC_TMDB_API_KEY` to `.env` to enable public movie and series discovery. Add and manage playback providers in `/en/admin/providers`.

See [description.md](description.md) for the full project description and workflows.

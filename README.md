# Streamly

Streamly is a monorepo streaming platform with:

- `apps/web`: Next.js customer and admin interface.
- `apps/api`: NestJS API, authentication, catalog, playback, imports and admin endpoints.
- `apps/api/prisma`: PostgreSQL schema, migrations and seed.
- `deploy`: production Docker/Caddy support.
- `scripts`: smoke checks and operational helpers referenced by `package.json`.

## Administration des sources

Le back-office suit un parcours unique et prévisible :

1. **Sources > Films** et **Sources > Séries** gèrent les templates de lecture existants et leurs priorités.
2. **Sources > TV & Live** réunit les connexions M3U, Xtream, Portal, URL directe et les templates Live.
3. Une connexion IPTV doit être testée puis activée avant sa synchronisation dans la **Bibliothèque**.
4. Le catalogue importé reste en brouillon jusqu'à sa publication explicite avec confirmation des droits.
5. Une même chaîne reconnue chez plusieurs fournisseurs conserve une identité unique et reçoit plusieurs variantes de lecture ordonnées comme sources de secours.
6. Un contenu disparu est archivé uniquement lorsqu'aucune autre source active ne le fournit.
7. Une connexion IPTV est archivée, et non détruite, afin de conserver ses tests, imports et événements d'audit.

La migration Prisma doit être appliquée avant le redémarrage de l'API en production :

```powershell
npm.cmd run db:deploy
```

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

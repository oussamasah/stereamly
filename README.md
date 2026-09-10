# Streamly Platform

Socle d’une plateforme internationale de streaming légal. Le projet est organisé en monorepo :

- `apps/web` : interface Next.js multilingue FR/EN/AR ;
- `apps/api` : API NestJS, identité, sessions et santé ;
- `apps/api/prisma` : schéma PostgreSQL et migrations ;
- `docs` : décisions, sprints et rapports de validation.

## Démarrage local

Prérequis : Node.js 24, npm et Docker Desktop.

```powershell
Copy-Item .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate -- --name initial
npm run dev
```

- Web : `http://localhost:3000`
- API : `http://localhost:4000/api/v1`
- Liveness : `http://localhost:4000/api/v1/health/live`
- Readiness PostgreSQL/Redis : `http://localhost:4000/api/v1/health/ready`

Ne jamais utiliser les secrets d’exemple en production.


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

## Synchronisations volumineuses en production

Les imports M3U, Xtream et Portal/MAC sont traites par lots et proteges par un lease stocke dans PostgreSQL. Pour un deploiement durable, separer l'API du worker :

- service API : commande `npm run start -w @stream/api`, variable `IMPORT_EXECUTION_MODE=enqueue` ;
- background worker : commande `npm run start:worker -w @stream/api`, variable `IMPORT_EXECUTION_MODE=worker` ;
- les deux services partagent les memes `DATABASE_URL`, `REDIS_URL`, `SOURCE_ENCRYPTION_KEY`, `JWT_SECRET` et `TOKEN_PEPPER` ;
- executer `npm run db:deploy -w @stream/api` avant le premier demarrage.

En local, la valeur par defaut `IMPORT_EXECUTION_MODE=all` conserve l'API et le worker dans un seul processus. Un worker permanent est requis pour les catalogues massifs : un service web suspendu ne peut pas garantir leur achevement.

Ne jamais utiliser les secrets d’exemple en production.

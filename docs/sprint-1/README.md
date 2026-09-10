# Sprint 1 — Socle technique, sécurité et déploiement

## Statut

**Terminé — 7 septembre 2026**

## Fonctionnalités livrées

- Monorepo npm avec frontend Next.js et API NestJS.
- PostgreSQL piloté par Prisma, migration initiale versionnée.
- Redis avec connexion paresseuse et contrôle de disponibilité.
- Inscription, vérification d’e-mail, connexion, access token court, refresh token opaque avec rotation, déconnexion et révocation globale.
- Récupération du mot de passe avec token opaque, expiration et révocation des sessions.
- Mots de passe hachés par bcrypt avec coût 12 ; tokens uniquement stockés sous forme de condensat avec pepper.
- Cookies refresh `HttpOnly`, `SameSite=Lax`, `Secure` en production et chemin restreint.
- Validation stricte des requêtes, CORS limité, Helmet et rate limiting global.
- Journaux JSON avec identifiant de requête et masquage des autorisations, cookies, tokens, mots de passe et secrets.
- Endpoints `/api/v1/health/live` et `/api/v1/health/ready`.
- Pages accueil, inscription et connexion en français, anglais et arabe, avec direction RTL.
- Détection de langue et routes `/fr`, `/en`, `/ar`.
- Environnements documentés par `.env.example`, services locaux dans `compose.yaml` et images de production.
- CI GitHub : PostgreSQL, Redis, génération Prisma, migration, lint, types, tests et builds.

## Commandes

```bash
npm install
docker compose up -d
copy .env.example .env
npm run db:generate
npm run db:migrate -- --name initial
npm run dev
```

Validation complète :

```bash
npm run check
```

## Séparation des environnements

- `development` : tokens de vérification/réinitialisation visibles dans la réponse pour faciliter le développement local.
- `test` : secrets éphémères CI et bases isolées.
- `staging` : configuration proche de production, sans données clients réelles.
- `production` : aucun token sensible dans les réponses, cookies sécurisés et secrets injectés par le gestionnaire de secrets.

## Limite de la validation locale

Docker n’est pas disponible sur la machine actuelle. La migration SQL est versionnée et la CI démarre PostgreSQL/Redis, mais le test local de connexion réelle attend un moteur Docker ou des services externes. La compilation et les tests sans infrastructure sont exécutés localement.


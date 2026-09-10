# Sprint 2 — Catalogue, chaînes, packs et tarification

## Statut

**Terminé — 8 septembre 2026**

## Livré

- Modèles PostgreSQL pour catégories, chaînes, droits, prix, packs et associations.
- Traductions obligatoires FR/EN/AR et champ de recherche multilingue.
- CRUD back-office protégé pour `CONTENT_MANAGER` et `SUPER_ADMIN`.
- Archivage logique afin de préserver les références historiques.
- États brouillon, planifié, publié et archivé.
- Prévisualisation des chaînes et packs non publics.
- Contrôle des droits et des prix avant publication.
- Prix en unités monétaires entières, par devise et périodes 1/3/6/12 mois.
- Pays autorisés, limites d’appareils et connexions simultanées par pack.
- Téléversement PNG/JPEG/WebP/AVIF, limite 5 Mo/4000 px et conversion WebP 800 px.
- Catalogue public avec recherche, pays, langue, catégorie et pagination.
- Cache Redis 5 minutes et invalidation après mutation du catalogue.
- Calcul à la carte exclusivement côté serveur et recommandation de packs couvrant la sélection.
- Pages publiques `/[locale]/channels` et `/[locale]/packages` responsives.
- Écran `/[locale]/admin/catalog` pour gérer catégories, chaînes et packs.

## Endpoints principaux

### Publics

- `GET /api/v1/catalog/categories`
- `GET /api/v1/catalog/channels?country=FR&currency=EUR&page=1&pageSize=24`
- `GET /api/v1/catalog/packages?country=FR&currency=EUR&page=1&pageSize=24`
- `POST /api/v1/catalog/quote`

### Back-office

- `GET|POST /api/v1/admin/catalog/categories|channels|packages`
- `PATCH|DELETE /api/v1/admin/catalog/{type}/:id`
- `GET /api/v1/admin/catalog/channels/:id/preview`
- `GET /api/v1/admin/catalog/packages/:id/preview`
- `POST /api/v1/admin/catalog/images`

Les suppressions exposées par `DELETE` effectuent un archivage sécurisé.

## Règles de publication

- Une chaîne publiée ou planifiée doit avoir un prix et au moins un droit approuvé valide à la date de publication.
- Un pack publié doit contenir au moins une chaîne non archivée et au moins un prix.
- Le catalogue public filtre les droits valides pour le pays demandé, avec `ALL` pour le contenu mondial.
- Une publication planifiée n’est visible qu’après son horaire.
- Le cache ne remplace jamais les contrôles du moteur de prix.

## Exécution

```powershell
npm run db:generate
npm run db:migrate -- --name catalog
npm run check
```

Docker n’étant pas installé localement, l’application et la migration sont validées statiquement et via les tests ; PostgreSQL et Redis réels sont démarrés par le workflow CI.


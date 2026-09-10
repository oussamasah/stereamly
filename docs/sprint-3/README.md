# Sprint 3 — Coffre de sources et connecteurs

## Fonctionnalités livrées

- sources `M3U`, `XTREAM`, `PORTAL_MAC` et `DIRECT` ;
- coffre AES-256-GCM avec IV unique, tag d’authentification et version de clé ;
- aucune restitution des secrets : uniquement des indicateurs `has…` ;
- états brouillon, test, prêt, dégradé, auth refusée, expiré, hors ligne et désactivé ;
- test M3U par lecture limitée de l’en-tête `#EXTM3U` ;
- test Xtream de l’authentification, expiration et limite de connexions ;
- test de disponibilité Portal/MAC autorisé et préparation de la résolution tardive ;
- test HLS/DASH direct ;
- hôtes explicitement autorisés et blocage SSRF des IP privées, loopback, link-local, metadata et ports inattendus ;
- redirections manuelles validées à chaque étape, timeout et limites de réponse ;
- journal des tests et audit des créations, changements, tests et activations ;
- activation impossible avant un test réussi ;
- écran graphique `/[locale]/admin/sources`.

## API

- `GET/POST /api/v1/admin/sources`
- `GET/PATCH /api/v1/admin/sources/:id`
- `POST /api/v1/admin/sources/:id/test`
- `POST /api/v1/admin/sources/:id/enable`
- `POST /api/v1/admin/sources/:id/disable`

Ces routes sont réservées à `TECHNICAL_ADMIN` et `SUPER_ADMIN`.

## Sécurité et exploitation

La variable `SOURCE_ENCRYPTION_KEY` doit être injectée par le gestionnaire de secrets en production et être distincte des clés JWT. Une rotation future utilisera `keyVersion`. Le connecteur Portal de ce sprint vérifie une configuration autorisée ; la synchronisation détaillée et la résolution des commandes seront branchées sur l’API documentée du fournisseur au Sprint 4/8.

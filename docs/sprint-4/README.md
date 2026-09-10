# Sprint 4 — Import, normalisation et déduplication

Le pipeline importe les sources activées vers une zone de staging. Rien n’est publié automatiquement : l’administrateur inspecte les ajouts, modifications, retraits, conflits et exclusions, choisit les lignes, puis applique le résultat en brouillon.

Fonctionnalités : états détaillés et progression, verrou par source, annulation, M3U progressif, inventaires Xtream séparés, lots de 500, empreintes stables, règles d’exclusion, aperçu, sélection, application idempotente, rapprochement multi-source, garde anti-suppression massive et chiffrement des références de flux. Les URLs ou credentials ne figurent ni dans l’aperçu ni dans les rapports.

Les éléments appliqués créent des chaînes, films ou séries en `DRAFT` et une variante `REMOTE_REFERENCE`. La publication reste une décision éditoriale. Un connecteur Portal spécialisé nécessite l’API documentée du fournisseur ; sans cet adaptateur la tâche échoue clairement avec `PORTAL_PROVIDER_ADAPTER_REQUIRED` au lieu de simuler un protocole.

Interface : `/[locale]/admin/imports`. API : création/liste/détail/sélection/application/annulation sous `/api/v1/admin/imports`, réservée aux administrateurs techniques.

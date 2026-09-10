# Sprint 7 — Recherche et bibliothèque

La recherche authentifiée couvre titres, variantes de noms, casting, genres et chaînes avec normalisation Unicode, tolérance par mots et classement exact/préfixe/contenu. Les suggestions sont différées de 220 ms et l’historique de recherche est contrôlable.

La bibliothèque synchronise favoris, progression, historique et reprise entre appareils. Elle fournit le prochain épisode, des contenus similaires, un Top 10 calculé sur des événements agrégés et un export/import JSON versionné qui ne contient aucune source vidéo. Chaque lecture et chaque suppression reste isolée par `userId`.

Interfaces : `/[locale]/search` et `/[locale]/my-list`. API authentifiée : `/api/v1/library/*`.

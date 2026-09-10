# Sprint 10 — Live TV et EPG

Ce sprint ajoute l’import XMLTV sécurisé par source, la conversion explicite des offsets XMLTV vers UTC, la conservation des titres/descriptions multilingues et le rejet comptabilisé des horaires incohérents.

Les identifiants externes `tvg-id` sont associés aux chaînes par source. Une correspondance exacte est proposée automatiquement ; le back-office `/[locale]/admin/epg` expose les éléments sans correspondance et permet de les corriger sans réimporter le fichier.

Le guide `/[locale]/live` fusionne toutes les chaînes publiées avec les programmes : une chaîne sans EPG demeure affichée et lisible. Il fournit maintenant/suivant, une grille sur 24 heures dans le fuseau du navigateur, filtres pays/langue/catégorie/favoris, mini-player et changement contrôlé de chaîne. Les rappels demandent la permission navigateur puis sont persistés côté serveur.

Les données périmées produisent un avertissement sans bloquer la lecture. L’endpoint administratif de disponibilité expose les variantes et leur état de santé par chaîne et référence source.

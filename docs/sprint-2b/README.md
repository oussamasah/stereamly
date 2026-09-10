# Sprint 2B — Modèle média unifié et UX

Le sprint ajoute le catalogue Films/Séries sans modifier ni supprimer le catalogue Live livré au Sprint 2A.

## Livré

- modèles Prisma `MediaTitle`, `Movie`, `Series`, `Season`, `Episode`, `Genre`, `Person`, `Credit`, `MediaImage`, `ExternalId` et `PlaybackVariant` ;
- migration additive et relations strictes série → saison → épisode ;
- variantes multiples pour chaîne, film ou épisode ;
- API publique filtrable `/media/titles` et `/media/genres` ;
- CRUD administrateur `/admin/media/titles` et `/admin/media/genres` ;
- validation FR/EN/AR, numéros de saisons/épisodes et identifiants externes ;
- pages responsive et RTL `/[locale]/movies` et `/[locale]/series` ;
- navigation Live, Films, Séries et Packs.

## Contrat de déduplication

Un `ExternalId(provider, externalId)` est unique dans toute la plateforme. Sans identifiant externe, l’import du Sprint 4 proposera un rapprochement sur type + titre normalisé + année, qui devra être confirmé en cas d’ambiguïté.

## Wireframes fonctionnels

### Ordinateur

```text
[Logo] [Live] [Films] [Séries] [Packs]             [Langue] [Compte]

FILMS / SÉRIES                                      [Recherche........]
[Poster] [Poster] [Poster] [Poster] [Poster] [Poster]
 titre    titre    titre    titre    titre    titre
 année · note · nombre d’épisodes
```

### Mobile

```text
[Logo] [menu/navigation repliée]
FILMS / SÉRIES
[Recherche........................]
[Poster] [Poster]
[Poster] [Poster]
```

### Fiche et player à réaliser dans les sprints dédiés

```text
[Backdrop............................................]
[Poster]  Titre, année, durée, âge, note
          Synopsis et genres
          [Lecture] [Ma liste]
[Saisons] -> [Épisodes]
[Player 16:9] -> sélection automatique de PlaybackVariant
```

## Validation

Exécuter `npm run check`. Une base PostgreSQL disponible est nécessaire uniquement pour appliquer la migration et réaliser les tests d’intégration de persistance.

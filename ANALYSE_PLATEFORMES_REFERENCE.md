# Analyse des plateformes de référence

Date de l’analyse : 8 septembre 2026

## 1. Résumé exécutif

Les quatre références présentent une expérience de **catalogue de streaming orientée contenu** : l’utilisateur cherche un titre, parcourt des rangées éditoriales, ouvre une fiche détaillée puis lance la lecture. Elles ne présentent pas au public les informations techniques des sources.

Le produit Streamly doit donc réunir trois univers dans une interface cohérente :

1. **Live TV** : chaînes, catégories, pays, langues, favoris et guide TV ;
2. **Films** : catalogue, genres, nouveautés, tendances, fiches, casting et lecture ;
3. **Séries** : fiches, saisons, épisodes, progression et prochain épisode.

Le back-office importe et normalise les contenus de sources autorisées. Le frontend ne connaît que les objets métier `Channel`, `Movie`, `Series`, `Season` et `Episode`, jamais les identifiants techniques d’un fournisseur.

## 2. Fonctionnement visible des références

### Movy

L’accueil est fortement éditorialisé : grand contenu vedette, action de lecture, fiche d’information, Top 10, nouveautés, séries en cours ou à venir, tendances de la semaine, rangées par service, contenus 4K, mieux notés et genres populaires.

Points à retenir :

- hero visuel avec lecture immédiate ;
- rangées horizontales thématiques ;
- badges Top 10, nouveauté et 4K ;
- notes, année, type et genres sur les cartes ;
- calendrier des épisodes actuels et futurs ;
- découverte par humeur ou genre ;
- hiérarchie visuelle proche des grands services de streaming.

### Cinejoy

La fiche série observée contient année, classification d’âge, note, genres, synopsis, langue, statut, dates de diffusion, nombre de saisons et épisodes, sélecteur de saison, liste d’épisodes avec durée et résumé, casting, évaluations externes et recommandations similaires.

Points à retenir :

- fiche média très complète ;
- saisons et épisodes directement accessibles ;
- bouton Play prioritaire ;
- casting et recommandations ;
- informations de contexte utiles avant lecture ;
- design adapté aux films comme aux séries.

### Z-Stream

L’interface publique met en avant une recherche centrale très simple, trois entrées Movies, TV Shows et Editor Picks, des listes de découverte, et un accès sans création de compte obligatoire. Le site annonce aussi des applications Windows/Android et le téléchargement, mais ces fonctions ne sont pas nécessaires au MVP.

Points à retenir :

- recherche immédiatement visible ;
- segmentation films/séries/sélections ;
- friction minimale avant découverte ;
- pages média légères ;
- promotion des applications en évolution future.

### Rive

L’accueil organise des carrousels Latest et Popular pour films, séries, K-Dramas, anime et manga. La bibliothèque propose Watchlist, Continue Watching, filtres par type, import, export et synchronisation. Sa documentation présente également un player responsive et plusieurs chemins de résolution de source.

Points à retenir :

- rangées Latest/Popular par univers ;
- bibliothèque personnelle ;
- favoris et reprise de lecture ;
- import/export/synchronisation de bibliothèque ;
- interface responsive et choix de source ;
- séparation entre métadonnées du titre et résolution de lecture.

## 3. Matrice comparative

| Fonction | Movy | Cinejoy | Z-Stream | Rive | Cible Streamly |
|---|---:|---:|---:|---:|---:|
| Hero éditorial | Oui | Partiel | Partiel | Oui | Oui |
| Rangées horizontales | Oui | Recommandations | Listes | Oui | Oui |
| Films et séries | Oui | Oui | Oui | Oui | Oui |
| Live TV | Non visible | Non visible | Service séparé annoncé | Non visible | Oui |
| Recherche globale | Oui | Oui | Centrale | Oui | Oui |
| Genres/filtres | Oui | Oui | Listes | Types | Oui |
| Top 10/tendances | Oui | Notes | Editor Picks | Popular | Oui |
| Saisons/épisodes | Calendrier | Très complet | Oui | Oui | Oui |
| Casting/notes | Oui | Très complet | Selon fiche | Selon fiche | Oui |
| Favoris/watchlist | Non observé | Non observé | Non observé | Oui | Oui |
| Reprise de lecture | Non observé | Non observé | Non observé | Oui | Oui |
| Multilingue/RTL | Non confirmé | Non confirmé | Non confirmé | Non confirmé | FR/EN/AR |
| Abonnements/packs | Non observé | Non observé | Non | Non | Oui |
| Back-office sources | Non public | Non public | Non public | Non public | Oui |

« Non observé » signifie que la fonction n’était pas visible dans les pages accessibles pendant l’analyse ; cela ne prouve pas son absence totale.

## 4. Architecture fonctionnelle adaptée

```text
Sources autorisées
  ├─ Compte/API compatible Xtream
  ├─ Playlist M3U/M3U8
  ├─ API/portail documenté par le fournisseur
  └─ Fichiers HLS/DASH directs
           │
           ▼
Connecteurs isolés → Import brut → Normalisation → Déduplication
                                           │
                  ┌────────────────────────┼──────────────────────┐
                  ▼                        ▼                      ▼
              Live TV                   Films                  Séries
            chaînes + EPG          métadonnées + assets   saisons + épisodes
                  └────────────────────────┼──────────────────────┘
                                           ▼
                               Catalogue éditorial interne
                                           │
                       ┌───────────────────┴────────────────────┐
                       ▼                                        ▼
              API publique/cache                     Résolveur de lecture
                       ▼                                        ▼
               Web / mobile / TV                    Session courte/player
```

## 5. Traitement des entrées techniques

### Compte/API compatible Xtream

Le back-office accepte l’URL de base et des identifiants fournis légalement. Un connecteur serveur récupère les catégories live/VOD/séries, les entrées, métadonnées et EPG disponibles. Les secrets sont chiffrés et ne sont jamais envoyés au navigateur.

### M3U/M3U8

Le système accepte une URL distante ou un fichier. Il analyse `EXTINF`, `tvg-id`, `tvg-name`, `tvg-logo`, `group-title` et l’URL du flux, puis présente un aperçu avant import. Les réimports utilisent une clé fournisseur stable afin de mettre à jour plutôt que dupliquer.

### Portail ou appareil identifié par adresse MAC

Le produit peut intégrer uniquement une API de portail **documentée et autorisée par le fournisseur**, y compris lorsqu’un appareil ou une adresse MAC enregistrée fait partie du contrat. Il ne doit pas émuler un décodeur, contourner une liaison d’appareil, extraire des jetons sans autorisation ou casser un contrôle d’accès. En l’absence d’API autorisée, la source est marquée non compatible.

### Normalisation

Toutes les entrées sont converties vers un modèle commun. Les identifiants fournisseurs restent dans une table de mapping interne. Un même film présent sur trois sources devient un seul titre avec trois variantes de lecture classées par qualité et santé.

## 6. Fonctions cibles

### Expérience utilisateur

- accueil éditorial avec hero, tendances, Top 10, nouveautés et rangées personnalisables ;
- navigation Live, Films, Séries, Ma liste et Recherche ;
- filtres genre, pays, langue, année, qualité et classement ;
- fiches riches avec poster, backdrop, bande-annonce, synopsis, casting, durée et classification ;
- saisons/épisodes et bouton épisode suivant ;
- favoris, historique et reprise de lecture ;
- player adaptatif sans choix technique imposé à l’utilisateur ;
- profils et contrôle parental en évolution ;
- abonnements et packs conservés comme contrôle d’accès au catalogue.

### Back-office

- coffre de sources et test de connexion ;
- assistants d’import Xtream/M3U/API autorisée ;
- aperçu, sélection, mapping et règles d’exclusion ;
- gestion des chaînes, films, séries, saisons et épisodes ;
- fusion des doublons et association multi-sources ;
- enrichissement des métadonnées et images ;
- rangées éditoriales, hero, Top 10 manuel/automatique et ordre ;
- publication immédiate ou planifiée ;
- diagnostic des flux et bascule de source ;
- suivi des imports et journal d’audit.

## 7. Ce qui existe déjà

### Réutilisable sans reprise majeure

- monorepo Next.js/NestJS ;
- PostgreSQL, Prisma, Redis, migrations et CI ;
- comptes, sessions, récupération et RBAC ;
- FR/EN/AR et RTL ;
- catégories, chaînes live, droits, prix et packs ;
- publication/planification/archivage ;
- cache catalogue et moteur de prix ;
- traitement des logos WebP ;
- pages chaînes/packs et premier écran admin.

### À étendre

- `Channel` doit rejoindre un catalogue média unifié ;
- les catégories doivent distinguer genres, collections et groupes fournisseurs ;
- les images doivent gérer poster, backdrop, logo et portrait ;
- l’admin JSON actuel doit devenir un assistant graphique ;
- le catalogue public doit passer d’une grille simple à des rangées éditoriales ;
- il faut ajouter films, séries, saisons, épisodes et variantes de lecture.

### Non encore commencé

- connecteurs et imports fournisseurs ;
- résolution multi-sources et player ;
- favoris, historique et reprise ;
- EPG ;
- panier, commandes, abonnements et paiement simulé ;
- métriques de qualité vidéo et exploitation avancée.

## 8. Limites et conformité

Les sites de référence déclarent généralement indexer ou intégrer des sources tierces. Leur présentation UX peut servir d’inspiration, mais cette analyse ne valide ni leur modèle juridique ni leurs sources. Streamly doit importer et diffuser uniquement les contenus que l’exploitant est autorisé à utiliser. Les connecteurs ne doivent jamais servir à contourner une authentification, une restriction d’appareil ou une protection technique.

## 9. Référence technique OwnTV

L’étude d’[OwnTV](https://github.com/ahXN00/OwnTV) et d’[OwnTV Core](https://github.com/ahXN00/OwnTV_Core) confirme le modèle de connecteurs séparés M3U, Xtream et Portal/MAC, le parsing progressif des gros catalogues, les synchronisations par lots et la résolution tardive des liens Portal. Streamly transpose ces concepts dans une architecture web où les secrets et connexions fournisseurs restent exclusivement côté serveur.

Le player Android OwnTV combine Media3/ExoPlayer et libmpv. Pour Streamly Web, l’équivalent retenu est Shaka Player devant une gateway sécurisée, avec remux/transcodage contrôlé et repli multi-variantes borné. L’analyse détaillée et les décisions sont consignées dans `ANALYSE_OWNTV_ARCHITECTURE.md`.

OwnTV étant sous GPL-3.0, il sert de référence de comportement et d’architecture ; aucun code ne doit être copié sans évaluation et respect des obligations de licence.

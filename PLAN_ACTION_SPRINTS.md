# Plan d’action adapté — Streamly Live, Films et Séries

Version 2 — 8 septembre 2026

## 1. Vision révisée

Construire une plateforme internationale de streaming au design proche des références analysées : accueil éditorial, recherche rapide, rangées de contenus, fiches riches, films, séries, saisons, épisodes et télévision en direct.

Le back-office centralise des sources **autorisées** de types API compatible Xtream, M3U/M3U8, HLS/DASH et portail fournisseur documenté. Il importe, normalise, déduplique, enrichit et publie le catalogue. Les détails techniques restent côté serveur.

Les packs et abonnements ne constituent plus l’écran principal du produit : ils contrôlent les droits d’accès derrière une expérience de catalogue moderne.

## 2. Principes structurants

- Un catalogue métier unique sépare le contenu de ses sources techniques.
- Un titre peut avoir plusieurs variantes de lecture ; une source peut disparaître sans supprimer le titre.
- Les secrets fournisseurs sont chiffrés et masqués.
- Le navigateur ne reçoit jamais les identifiants permanents d’une source.
- Le back-office pilote contenus, filtres, collections, rangées et publication.
- Tout import est prévisualisé avant application et peut être annulé logiquement.
- Les mises à jour sont idempotentes et ne créent pas de doublons.
- Les contenus tiers nécessitent une autorisation de redistribution ; aucune émulation ou neutralisation de portail n’est prévue.
- FR, EN et AR/RTL sont présents dans tous les parcours.

## 3. État du projet

| Étape | Statut | Résultat |
|---|---|---|
| Sprint 0 | Terminé | Cadrage, architecture initiale, sécurité et décisions |
| Sprint 1 | Terminé | Next.js, NestJS, PostgreSQL, Redis, auth, i18n, CI/CD |
| Sprint 2A | Terminé | Chaînes, catégories, packs, droits, prix, cache, CRUD |
| Sprint 2B | Terminé | Catalogue Films/Séries, saisons, épisodes, variantes, API et listes responsive |
| Sprint 3 | Terminé | Coffre chiffré, M3U/Xtream/Portal-MAC/Direct, diagnostics, SSRF et interface admin |
| Sprint 4 | Terminé | Import asynchrone, staging, aperçu, sélection, déduplication et application en brouillon |
| Sprint 5 | Terminé | Studio éditorial, collections, accueil, workflows, actions groupées et audit |
| Sprint 6 | Terminé | Accueil premium, rangées, catalogues filtrables et fiches Live/Films/Séries |
| Sprint 7 | Terminé | Recherche globale, favoris, historique, reprise, Top 10 et bibliothèque portable |
| Sprint 8 | Terminé | Shaka Player, sessions opaques, gateway, routage multi-sources, santé et QoE |
| Sprint 9 | Terminé | Panier, commandes immuables, paiement simulé, abonnements, appareils et entitlements |
| Sprint 10 | Terminé | Import XMLTV, mappings, guide TV, mini-player, rappels et disponibilité Live |
| Replanification V2 | Terminée | Analyse des références et nouveau périmètre Live/VOD/Séries |

Le prochain travail est le **Sprint 11 — Paiement réel, e-mails et support**.

---

## Sprint 2B — Modèle média unifié et design UX

### Objectif

Faire évoluer le catalogue actuel sans casser les chaînes et packs existants.

### Fonctionnalités

1. Créer les modèles `MediaTitle`, `Movie`, `Series`, `Season`, `Episode`, `Genre`, `Person`, `Credit`, `MediaImage`, `ExternalId` et `PlaybackVariant`.
2. Conserver `Channel` pour le live et partager genres, langues, pays, images et règles de publication.
3. Gérer poster vertical, backdrop horizontal, logo transparent, bande-annonce, année, durée, note, classification d’âge, qualité et statut de série.
4. Ajouter les relations série → saisons → épisodes avec numéros, durée, résumé et date de diffusion.
5. Définir la clé de déduplication : identifiant externe fiable, puis titre normalisé + année + type avec validation manuelle.
6. Produire les wireframes responsive : accueil, Live, Films, Séries, Recherche, fiche film, fiche série, player, Ma liste et back-office.
7. Définir les composants : hero, rail horizontal, carte portrait/paysage, Top 10, badge, filtre, sélecteur de saison et épisode.
8. Préparer une migration conservant le catalogue live et les packs déjà créés.

### Critères d’acceptation

- Un film et une série complète avec deux saisons peuvent être enregistrés sans duplication.
- Une saison ne peut appartenir qu’à une série et un épisode à une saison.
- Plusieurs variantes de lecture peuvent pointer vers un même contenu.
- Les wireframes couvrent mobile, ordinateur et RTL.
- Les tests et migrations existants restent valides.

### Livrables

- Migration Prisma, API média initiale, schéma documenté, wireframes et tests de compatibilité.

---

## Sprint 3 — Coffre de sources et connecteurs autorisés

### Objectif

Permettre l’enregistrement sécurisé et le test des différentes entrées fournisseurs.

### Fonctionnalités

1. Modèle `SourceAccount` : type `M3U`, `XTREAM`, `PORTAL_MAC` ou `DIRECT`, nom, région, priorité, état, capacité, périmètres de sync et propriétaire.
2. Cycle de vie : brouillon, test, prêt, synchronisation, dégradé, authentification échouée, expiré, hors ligne et désactivé.
3. Secrets externalisés et chiffrés : utilisateur, mot de passe, token, MAC et identité d’appareil autorisée ; l’API ne renvoie que des indicateurs de présence.
4. Contrat commun des adaptateurs : test, capacités, groupes, Live, VOD, séries, EPG, résolution de lecture et renouvellement de session.
5. Connecteur compatible Xtream : état/expiration du compte, limite de connexions, inventaires séparés et parsing JSON progressif.
6. Connecteur M3U : URL ou fichier, sonde légère, parsing ligne par ligne, tags TVG/groupes/catch-up et en-têtes par élément.
7. Connecteur Portal/MAC autorisé : URL, MAC, série/Device IDs/signature optionnels, test de session et inventaire des capacités.
8. Connecteur HLS/DASH direct pour les contenus internes.
9. Protection SSRF : hôtes autorisés, blocage des réseaux internes et metadata cloud, résolution DNS contrôlée, délais, tailles, ports et redirections limités.
10. Écran « Tester la connexion » obligatoire avant activation, sans jamais réafficher les secrets.
11. Journal technique : durée, volumes, progression, erreurs/URL filtrées et dernière réussite.

### Critères d’acceptation

- Les quatre types produisent un résultat normalisé ou une erreur claire avant leur activation.
- Aucun secret n’apparaît dans les API frontend ou les logs.
- Une URL locale, privée ou non autorisée est bloquée.
- Un compte expiré, une authentification refusée et une limite de connexions sont distingués.
- Un Portal conserve une référence distante et non son lien de lecture temporaire.
- Aucun connecteur ne contourne une authentification ou une liaison d’appareil.

### Livrables

- Coffre de sources, connecteurs, tests simulés et écran de diagnostic.

---

## Sprint 4 — Pipeline d’import, normalisation et déduplication

### Objectif

Transformer les catalogues fournisseurs en contenus administrables sans publication automatique incontrôlée.

### Fonctionnalités

1. Jobs d’import asynchrones avec états queued/connecting/downloading/parsing/staging/preview/applying/completed/partial/failed/cancelled.
2. Import séparé des groupes, chaînes live, films, séries, saisons, épisodes et EPG.
3. Stockage brut temporaire pour diagnostic, avec rétention limitée.
4. Mapping des catégories fournisseur vers genres et collections internes.
5. Normalisation titres, dates, langues, pays, qualités et images.
6. Déduplication multi-sources et écran de résolution des conflits.
7. Aperçu des ajouts, mises à jour, suppressions et conflits avant application.
8. Upserts par identifiants distants stables pour Xtream/Portal et empreinte contrôlée pour M3U.
9. Parsing progressif, écritures par lots et chargement différé des détails de séries/épisodes.
10. Réimport idempotent, garde anti-suppression massive et politique d’archivage lorsqu’un élément disparaît.
11. Planification manuelle ou périodique avec verrou anti-chevauchement et annulation propre.
12. Rapport d’import exportable sans credentials, en préservant favoris, historique et progression.

### Critères d’acceptation

- Deux imports identiques ne créent aucun doublon.
- Un film disponible sur deux fournisseurs devient un titre avec deux variantes.
- Un administrateur peut exclure un groupe ou annuler un aperçu.
- Une panne partielle peut être reprise sans recommencer tout le catalogue.

### Livrables

- Workers d’import, aperçu, mapping, déduplication, rapports et tests de gros catalogue.

---

## Sprint 5 — Back-office éditorial complet

### Objectif

Administrer graphiquement tout le catalogue et la page d’accueil.

### Fonctionnalités

1. Tableau catalogue avec recherche, filtres, sélection multiple et actions groupées.
2. Formulaires graphiques pour chaînes, films, séries, saisons et épisodes.
3. Gestion des images, bandes-annonces, traductions, genres, casting et classification.
4. Association ou désassociation des variantes de lecture.
5. Éditeur de saisons/épisodes avec réorganisation et détection des numéros manquants.
6. Collections éditoriales manuelles ou dynamiques : nouveautés, populaires, Top 10, 4K, pays, genre et langue.
7. Gestion du hero et des rangées de l’accueil par pays, langue et période.
8. Brouillon, prévisualisation, publication planifiée, archivage et restauration.
9. Audit avant/après et permissions Content Manager/Technical Admin.

### Critères d’acceptation

- Aucun JSON manuel n’est nécessaire pour gérer le catalogue.
- Une page d’accueil complète peut être composée sans déploiement.
- Les modifications sont prévisualisables dans les trois langues.
- Les actions groupées et imports importants restent auditables.

### Livrables

- Back-office graphique catalogue, éditeur de home et workflows éditoriaux.

---

## Sprint 6 — Expérience publique type service de streaming

### Objectif

Créer l’expérience visuelle inspirée des références, sans copier leur identité graphique.

### Fonctionnalités

1. Accueil avec hero, lecture/informations, Top 10 et rangées horizontales administrables.
2. Sections Live, Films et Séries avec routes et navigation distinctes.
3. Cartes portrait/paysage avec poster, titre, année, note, qualité, type et badges.
4. Pages Films/Séries : filtres genre, année, langue, pays, qualité et tri.
5. Fiche film : backdrop, synopsis, durée, casting, genres, bande-annonce et recommandations.
6. Fiche série : statut, saisons, épisodes, dates, durées, résumés et prochain épisode.
7. Fiche chaîne : programme actuel/suivant si EPG disponible.
8. Skeletons, lazy loading, images responsives et navigation clavier.
9. RTL complet et textes FR/EN/AR.

### Critères d’acceptation

- Le contenu du hero et des rangées correspond au back-office.
- Un utilisateur atteint un film, épisode ou direct en trois interactions maximum.
- Les pages fonctionnent sur mobile, tablette, desktop et RTL.
- Les pages restent utilisables si une image ou une rangée échoue.

### Livrables

- Accueil premium, catalogues Live/Films/Séries et fiches média.

---

## Sprint 7 — Recherche, découverte et bibliothèque personnelle

### Objectif

Permettre de trouver rapidement un contenu et de reprendre son usage.

### Fonctionnalités

1. Recherche globale tolérante sur titres, titres alternatifs, casting, genres et chaînes.
2. Suggestions instantanées et historique local contrôlable.
3. Filtres combinables et URL partageables.
4. Favoris/Ma liste pour chaînes, films et séries.
5. Historique de lecture avec suppression individuelle ou totale.
6. Reprise de lecture et progression par film/épisode.
7. « Continuer à regarder », « Épisode suivant » et contenus similaires.
8. Top 10 fondé sur des événements agrégés, avec possibilité d’override éditorial.
9. Import/export de bibliothèque dans un format interne documenté, sans importer de source vidéo.

### Critères d’acceptation

- La recherche renvoie des résultats pertinents sur les trois types de contenus.
- Une progression est reprise sur un autre appareil connecté.
- Une suppression d’historique est effective et auditée selon le RGPD.
- Les statistiques populaires ne révèlent pas l’historique d’un utilisateur.

### Livrables

- Recherche, watchlist, historique, progression et recommandations de base.

---

## Sprint 8 — Player sécurisé et routage multi-sources

### Objectif

Lire live, film ou épisode avec la meilleure variante disponible sans exposer les sources.

### Fonctionnalités

1. Shaka Player pour HLS/DASH, sous-titres, pistes audio, qualité automatique et plein écran.
2. Autorisation préalable : compte, abonnement, contenu, pays, appareil et concurrence.
3. Token de lecture court lié à l’utilisateur, au contenu, à l’appareil et à la session.
4. Résolution entièrement serveur : Xtream construit tardivement, M3U enrichi avec ses en-têtes et Portal résolu à chaque démarrage/reconnexion sans cache permanent.
5. Résolveur de variantes selon santé, latence, qualité, codec, appareil, région et priorité.
6. Gateway média fermée : proxy de manifestes/segments, réécriture HLS et ajout d’en-têtes ; aucune URL arbitraire fournie par le client.
7. Transmux/remux pour les conteneurs incompatibles et transcodage FFmpeg seulement si nécessaire, autorisé et dimensionné.
8. Health checks actifs et passifs avec anti-flapping et circuit breaker.
9. Échelle de repli bornée par budget de démarrage ; aucune boucle et aucune erreur auth/expiration/limite confondue avec un problème codec.
10. Heartbeat, libération de capacité et expiration des sessions fantômes.
11. Reprise temporelle VOD, épisode suivant et retour au direct.
12. Télémétrie QoE : démarrage, buffering, erreurs, bitrate et abandons.
13. Messages utilisateur simples sans détail fournisseur.

### Critères d’acceptation

- Aucun credential ou URL permanente n’est visible dans le navigateur.
- Une source indisponible est écartée avant le démarrage.
- Les limites simultanées résistent aux requêtes concurrentes.
- Le player couvre les navigateurs cibles et propose un repli documenté.
- Un lien Portal expiré est renouvelé côté serveur sans révéler la MAC ni l’identité du fournisseur.

### Livrables

- Player, gateway, tokens, routeur, failover et dashboard QoE.

---

## Sprint 9 — Panier, commandes, abonnements et paiement simulé

### Objectif

Relier les packs commerciaux aux droits d’accès au catalogue.

### Fonctionnalités

1. Panier persistant, pack/durée, détection des doublons et calcul serveur.
2. Commande immuable avec produit, contenu, pays, devise, taxes et prix figés.
3. États de commande et d’abonnement documentés et testés.
4. Simulateur de paiement hors production : succès, échec, retard, remboursement, contestation et doublon.
5. Webhook signé simulé et idempotence.
6. Activation automatique des entitlements live/VOD/séries.
7. Espace client : offre, expiration, appareils, commandes et renouvellement manuel.
8. Expiration/suspension révoquant les nouvelles sessions de lecture.

### Critères d’acceptation

- Une page de succès ne peut jamais activer un abonnement.
- Dix webhooks identiques produisent un seul effet.
- Un abonnement impayé ne donne aucun accès.
- Le catalogue visible et lisible correspond aux droits du pack.

### Livrables

- Panier, commandes, paiement simulé, abonnements, entitlements et espace client.

---

## Sprint 10 — Live TV et EPG

### Objectif

Offrir une expérience télévision en direct complète.

### Fonctionnalités

1. Import XMLTV ou EPG fournisseur autorisé.
2. Mapping `tvg-id`/chaîne avec écran des correspondances manquantes.
3. Programme actuel, suivant et grille horaire selon fuseau.
4. Navigation rapide par catégorie, pays, langue et favoris.
5. Mini-player et changement de chaîne contrôlé.
6. Rappels de programme si les notifications sont autorisées.
7. Gestion des données EPG périmées et fuseaux incohérents.
8. Mesure de disponibilité par chaîne et source.

### Critères d’acceptation

- Les horaires sont corrects dans les fuseaux pris en charge.
- Une chaîne sans EPG reste lisible sans casser l’interface.
- Les mappings fournisseurs peuvent être corrigés sans réimport complet.

### Livrables

- Import EPG, guide TV, programme actuel/suivant et expérience live.

---

## Sprint 11 — Paiement réel, e-mails et support

### Objectif

Passer du prototype à une exploitation commerciale contrôlée.

### Fonctionnalités

1. Adaptateur du prestataire de paiement retenu et webhooks réels.
2. Factures/reçus, remboursements et réconciliation.
3. E-mails : bienvenue, activation, accès, expiration, renouvellement et échec.
4. Centre d’aide par appareil et type de contenu.
5. Tickets support et diagnostic sans accès aux secrets.
6. Dashboard clients, revenus, paiements, viewers, sources et tickets.
7. Mise en place des mentions légales, CGV, confidentialité et consentements validés.

### Critères d’acceptation

- Tous les scénarios de paiement sont testés en sandbox puis en production contrôlée.
- Les e-mails sont délivrés dans la langue du client sans secret.
- Support et finance respectent strictement leurs rôles.

### Livrables

- Paiement réel, facturation, e-mails, aide, tickets et dashboard métier.

---

## Sprint 12 — Sécurité, performance, résilience et lancement

### Objectif

Valider le service de bout en bout avant ouverture progressive.

### Fonctionnalités

1. Tests E2E import → publication → achat → activation → lecture.
2. Tests de charge API, recherche, import, démarrage vidéo et heartbeat.
3. WAF, rate limiting différencié, 2FA admin, CSP et revue OWASP.
4. Sauvegardes chiffrées, restauration testée et rétention 7/30/90 jours.
5. Haute disponibilité API/workers et files de reprise.
6. Alertes sources, imports, paiements, base, Redis, erreurs et QoE.
7. Objectifs de performance et budgets frontend.
8. Audit des licences par contenu/territoire/appareil avant publication réelle.
9. Alpha interne, bêta fermée, canary et plan de rollback.

### Critères d’acceptation

- Zéro vulnérabilité critique/haute ouverte.
- Restauration et scénarios de panne réussis.
- Aucun secret de source détecté dans les réponses ou bundles.
- Les objectifs de charge et de qualité sont atteints.
- Le go/no-go juridique, sécurité, paiement et exploitation est signé.

### Livrables

- Rapport de recette, audit sécurité, tests de charge, runbooks et version de production.

## 4. Backlog post-lancement

- profils familiaux et contrôle parental ;
- applications Android, iOS, Android TV et Smart TV ;
- Chromecast/AirPlay selon compatibilité ;
- téléchargement hors ligne uniquement si les droits l’autorisent ;
- recommandations personnalisées avancées ;
- multi-région streaming ;
- affiliation, revendeurs et B2B ;
- API partenaires ;
- replay/catch-up uniquement lorsque fourni et licencié.

## 5. Définition de terminé

Un sprint n’est terminé que lorsque toutes ses fonctionnalités sont implémentées, ses migrations versionnées, ses tests nominaux et d’échec réussis, les permissions vérifiées, les secrets masqués, FR/EN/AR contrôlés, la documentation actualisée et les builds de production validés.

Une impossibilité externe est traitée explicitement : les connecteurs utilisent des serveurs simulés jusqu’à disponibilité de comptes fournisseurs autorisés ; les paiements utilisent le simulateur jusqu’au choix du prestataire. Aucun sprint suivant n’est déclaré terminé en masquant cette limite.

## 6. Ordre d’exécution immédiat

1. Sprint 2B : modèle films/séries et wireframes.
2. Sprint 3 : connecteurs de sources autorisées.
3. Sprint 4 : imports et normalisation.
4. Sprint 5 : back-office éditorial.
5. Sprint 6 : expérience publique premium.

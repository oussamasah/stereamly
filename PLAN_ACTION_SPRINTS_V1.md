# Plan d’action par sprints — Plateforme IPTV légale (version 1 archivée)

## 1. Objectif du projet

Créer une plateforme de streaming premium, simple pour le client et administrable depuis un back-office. Le client choisit des chaînes ou un pack, paie en ligne, reçoit automatiquement son accès et peut, lorsque les droits de diffusion le permettent, regarder les chaînes dans un player web.

La plateforme ne vend pas une adresse de serveur ou des identifiants techniques : elle vend un droit d’accès à un catalogue autorisé. Les IP, URL, paramètres, identifiants fournisseurs, capacités et règles de routage restent strictement côté serveur.

## 2. Hypothèses de cadrage

- Durée indicative d’un sprint : 2 semaines.
- Équipe minimale : product owner, designer UI/UX, développeur frontend, développeur backend, DevOps et QA. Certaines fonctions peuvent être cumulées dans une petite équipe.
- Architecture de référence : frontend Next.js, API backend robuste (NestJS, Laravel ou Django), PostgreSQL, Redis, file de tâches asynchrones, stockage objet/CDN et couche de streaming séparée.
- Langues initiales : français, anglais et arabe avec prise en charge RTL.
- Le player web est soumis à la compatibilité des flux, aux DRM éventuels et aux droits de diffusion sur navigateur.
- Les paiements récurrents, essais gratuits et remboursements dépendent des possibilités du prestataire de paiement choisi.
- Le détail des accès aux flux ne doit jamais apparaître dans le HTML, les API publiques, les logs frontend ou les e-mails.

## 3. Principes non négociables

### Légalité et conformité

- Vérifier et documenter les licences de chaque chaîne, territoire, appareil et mode de diffusion avant publication.
- Mettre en place les conditions générales, la politique de confidentialité, les mentions légales et les règles de remboursement.
- Appliquer le RGPD : consentement, minimisation des données, durée de conservation, export et suppression du compte.
- Bloquer automatiquement une offre dans un pays non couvert par les droits.

### Sécurité

- HTTPS partout, cookies sécurisés, protection CSRF/XSS/injections, validation stricte des entrées et limitation de débit.
- Mots de passe clients hachés avec Argon2id ou bcrypt ; secrets fournisseurs chiffrés avec une clé extérieure à la base.
- Authentification à deux facteurs obligatoire pour les administrateurs sensibles.
- Contrôle d’accès par rôle et journal d’audit immuable pour les opérations critiques.
- Webhooks de paiement signés, vérifiés, rejouables sans double activation et protégés contre les doublons.
- Tokens de lecture courts, révocables et liés au compte, à la chaîne et éventuellement à l’appareil.

### Architecture

- Séparer le site, l’API, les paiements et l’administration de la charge vidéo.
- Traiter les e-mails, imports, contrôles de santé et rappels dans des workers asynchrones.
- Concevoir les opérations critiques pour être idempotentes.
- Prévoir métriques, alertes, logs structurés, sauvegardes chiffrées et tests de restauration dès le MVP.

## 4. Découpage des versions

### MVP commercial — sprints 0 à 7

Le MVP comprend le catalogue, les packs et chaînes à la carte, le compte client, le paiement, l’activation, les e-mails, le back-office essentiel, les sources sécurisées, le routage, le player web si autorisé, ainsi que l’exploitation et la sécurité minimales.

### Version 1.1 — sprints 8 à 10

La version 1.1 ajoute les outils métier avancés, le support client, les promotions, les essais, l’analytique financière et l’optimisation commerciale.

### Version 2 — sprint 11 et backlog futur

La version 2 prépare la haute disponibilité, la montée en charge et les produits futurs : applications, EPG, contrôle parental, profils, affiliation, revendeurs et API partenaires.

---

## Sprint 0 — Cadrage légal, produit et architecture

> **Statut : terminé le 7 septembre 2026.** Les livrables validés sont disponibles dans [docs/sprint-0/README.md](docs/sprint-0/README.md). Le développement peut passer au Sprint 1 avec du contenu synthétique et un paiement simulé ; les ventes réelles restent soumises aux portes juridiques et fiscales.

### But

Lever les risques qui peuvent invalider le produit avant de commencer son développement.

### Fonctionnalités et travaux

1. **Matrice des droits de diffusion**
   - Associer chaque chaîne à ses territoires autorisés, appareils permis, période contractuelle et droits de lecture web.
   - Enregistrer une date de début, une date de fin, les justificatifs contractuels et un responsable interne.
   - Empêcher la publication d’une chaîne sans droit valide.

2. **Définition du catalogue commercial**
   - Définir les premiers packs, chaînes à la carte, prix, devises, durées et limites de connexions.
   - Décider du minimum de commande à la carte et des règles d’upsell.
   - Identifier les offres disponibles par pays.

3. **Parcours utilisateurs**
   - Formaliser les parcours visiteur, client, support, finance, content manager, technical admin et super admin.
   - Définir les écrans et états d’erreur : paiement refusé, source indisponible, abonnement expiré, limite d’appareils atteinte.

4. **Architecture et modèle de données**
   - Valider la stack et la séparation entre frontend, API, workers, base, cache et streaming.
   - Définir les entités : utilisateurs, plans, packs, chaînes, sources, commandes, paiements, abonnements, appareils, sessions, factures, coupons, tickets et audits.
   - Définir les états et transitions d’une commande, d’un paiement et d’un abonnement.

5. **Socle conformité**
   - Préparer CGV, politique de confidentialité, consentements, facturation, règles fiscales et procédure RGPD.
   - Définir les durées de conservation des données et logs.

### Critères d’acceptation

- Chaque fonctionnalité MVP possède un propriétaire, une priorité et un critère de réussite.
- La matrice des droits couvre 100 % du catalogue de lancement.
- Les transitions de paiement et d’abonnement sont documentées sans état ambigu.
- L’architecture et le schéma initial de données sont validés par l’équipe.

### Livrables

- Cahier des charges validé, matrice des droits, parcours UX, diagramme d’architecture, schéma de données et backlog priorisé.

---

## Sprint 1 — Socle technique, sécurité et déploiement

> **Statut : terminé le 7 septembre 2026.** Implémentation et rapport dans [docs/sprint-1/README.md](docs/sprint-1/README.md) et [docs/sprint-1/validation-sprint.md](docs/sprint-1/validation-sprint.md).

### But

Obtenir une base déployable et observable sur laquelle toutes les fonctions suivantes pourront s’appuyer.

### Fonctionnalités et travaux

1. **Structure des applications**
   - Créer le frontend public, l’espace client, le back-office, l’API et les workers.
   - Centraliser configuration et variables d’environnement sans secret dans le dépôt.

2. **Base de données et cache**
   - Installer PostgreSQL et les migrations versionnées.
   - Installer Redis pour sessions, cache, rate limiting, verrous et tâches temporaires.

3. **Identité et authentification**
   - Inscription, connexion, déconnexion, vérification d’e-mail et mot de passe oublié.
   - Hachage fort des mots de passe, rotation des sessions et révocation globale.
   - Préparer l’authentification à deux facteurs pour le back-office.

4. **Internationalisation**
   - Installer les traductions FR/EN/AR, choix de langue et mise en page RTL.
   - Stocker la langue et le pays préférés du client.

5. **CI/CD et environnements**
   - Créer les environnements local, test, staging et production.
   - Automatiser lint, tests, build, migrations contrôlées et déploiement.

6. **Observabilité initiale**
   - Logs structurés avec identifiant de corrélation.
   - Mesures de disponibilité, latence API et taux d’erreur.
   - Masquage des mots de passe, tokens et paramètres sensibles dans les logs.

### Critères d’acceptation

- Un utilisateur peut créer et sécuriser son compte dans les trois langues.
- Les pages arabes s’affichent correctement de droite à gauche sur mobile et ordinateur.
- Aucun secret n’est présent dans le dépôt, la réponse API publique ou les logs.
- Un déploiement staging reproductible passe automatiquement les contrôles qualité.

### Livrables

- Applications squelettes, pipeline CI/CD, authentification, base, cache, environnements et tableau de santé initial.

---

## Sprint 2 — Catalogue, chaînes, packs et tarification

> **Statut : terminé le 8 septembre 2026.** Implémentation et résultats dans [docs/sprint-2/README.md](docs/sprint-2/README.md) et [docs/sprint-2/validation-sprint.md](docs/sprint-2/validation-sprint.md).

### But

Permettre aux équipes internes de construire l’offre et aux visiteurs de la parcourir simplement.

### Fonctionnalités et travaux

1. **Gestion des chaînes**
   - CRUD : nom, slug, logo, catégorie, pays, langue, ordre, prix individuel, statut et disponibilité web.
   - Téléversement d’images optimisées en WebP/AVIF avec validation du format.
   - Publication planifiée et aperçu avant publication.

2. **Catégories et filtres**
   - Gestion des catégories, pays et langues.
   - Recherche, filtres combinables et pagination.

3. **Gestion des packs**
   - Création illimitée de packs et association de chaînes.
   - Prix mensuel, 3 mois, 6 mois et annuel ; remise, territoires, appareils et connexions simultanées.
   - Mise en avant d’un pack, ordre d’affichage et badge commercial.

4. **Catalogue public**
   - Pages Chaînes et Packs responsives, accessibles et rapides.
   - Fiches lisibles sans vocabulaire technique IPTV.
   - Cache du catalogue et invalidation automatique après publication admin.

5. **Moteur de prix initial**
   - Calcul côté serveur de la sélection à la carte.
   - Comparaison automatique avec les packs et proposition d’upsell pertinente.
   - Contrôle du pays et de la devise ; le frontend n’est jamais l’autorité du prix.

### Critères d’acceptation

- Un content manager peut publier, modifier, ordonner et désactiver une chaîne ou un pack.
- Le prix affiché correspond toujours au calcul serveur, y compris après modification de sélection.
- Une offre non autorisée dans le pays du visiteur ne peut pas être achetée.
- Les pages catalogue restent utilisables sur mobile et avec navigation clavier.

### Livrables

- Catalogue administrable, pages publiques, filtres, moteur de prix et cache.

---

## Sprint 3 — Panier, commande et abonnement

### But

Transformer une sélection de chaînes ou un pack en commande fiable et traçable.

### Fonctionnalités et travaux

1. **Panier**
   - Ajouter ou retirer chaînes et packs, choisir la durée et voir le total détaillé.
   - Détecter les doublons lorsqu’une chaîne choisie est déjà incluse dans un pack.
   - Conserver temporairement le panier entre les pages et après connexion.

2. **Validation de commande**
   - Vérifier côté serveur le prix, la disponibilité territoriale, les droits actifs et les règles commerciales.
   - Figer un instantané de l’offre et du prix dans la commande afin que les changements futurs du catalogue ne modifient pas l’historique.

3. **Cycle de vie de l’abonnement**
   - États : pending, active, expired, suspended et cancelled.
   - Dates de début/fin calculées selon la durée achetée.
   - Renouvellement manuel initial et préparation du renouvellement automatique.

4. **Espace client initial**
   - Afficher abonnement, chaînes incluses, statut, date d’expiration et commandes.
   - Fournir une action de renouvellement et des messages adaptés à chaque état.

### Critères d’acceptation

- Une commande conserve exactement le produit, la durée, le prix, la devise et les taxes au moment de l’achat.
- Une commande impayée n’accorde aucun accès.
- Les transitions invalides d’abonnement sont refusées et journalisées.
- Le client voit une information cohérente entre panier, commande et espace personnel.

### Livrables

- Panier, commandes, modèle d’abonnement, historique client et règles de transition.

---

## Sprint 4 — Paiement, webhooks et activation automatique

### But

Encaisser de manière sûre et activer l’accès uniquement après confirmation serveur du prestataire.

### Fonctionnalités et travaux

1. **Intégration du prestataire de paiement**
   - Créer une session de paiement à partir d’une commande validée côté backend.
   - Associer les identifiants prestataire, commande, client, montant et devise.

2. **Webhooks sécurisés**
   - Vérifier signature, horodatage, type d’événement et montant.
   - Garantir l’idempotence : un même événement ne crée jamais deux paiements ou deux prolongations.
   - Conserver l’événement utile à l’audit en masquant les données sensibles.

3. **Activation automatique**
   - Paiement confirmé → paiement enregistré → abonnement créé ou prolongé → droits d’accès calculés → e-mail mis en file.
   - Gérer paiements échoués, expirés, remboursés et contestés selon les règles métier.

4. **Factures et reçus**
   - Générer une facture ou un reçu numéroté avec informations fiscales requises.
   - Mettre le document à disposition dans l’espace client.

5. **Réconciliation**
   - Écran finance listant paiements reçus, commandes orphelines et écarts de montant.
   - Action de relance contrôlée d’un traitement échoué sans double effet.

### Critères d’acceptation

- La page « paiement réussi » seule ne peut jamais activer l’abonnement.
- La répétition dix fois du même webhook produit une seule activation.
- Un montant ou une devise inattendus bloquent l’activation et déclenchent une alerte.
- Les cas succès, échec, retard, remboursement et contestation sont couverts par des tests automatisés.

### Livrables

- Paiement opérationnel en sandbox, webhooks, activation, facturation et écran de réconciliation.

---

## Sprint 5 — Sources, secrets, supervision et routage

### But

Administrer plusieurs sources autorisées sans exposer leur complexité ni leurs identifiants au client.

### Fonctionnalités et travaux

1. **Registre des serveurs et sources**
   - CRUD des serveurs : nom interne, région, capacité, priorité, statut et seuils.
   - Types de sources : URL complète, HLS, API fournisseur ou paramètres de connexion autorisés.
   - Associer plusieurs sources à une chaîne avec ordre de secours.

2. **Coffre de secrets**
   - Chiffrer les identifiants récupérables avec des clés séparées de la base.
   - Ne jamais retourner les secrets complets au frontend, même admin.
   - Prévoir rotation, date de dernière modification et accès audité.

3. **Contrôles de santé**
   - Tester disponibilité, latence et réponse des sources par worker.
   - Mettre à jour les états online, degraded et offline avec anti-flapping.
   - Alerter après un seuil configurable.

4. **Moteur de routage**
   - Filtrer par chaîne disponible, droit territorial et état du serveur.
   - Classer par capacité restante, charge, latence, région et priorité.
   - Réserver une connexion de façon atomique dans Redis afin d’éviter le dépassement de capacité.
   - Basculer vers une source secondaire et libérer la réservation à la fin de session.

5. **Écran technique**
   - Voir santé, capacité, connexions actives, dernière vérification et incidents.
   - Limiter l’accès au technical admin et au super admin.

### Critères d’acceptation

- Aucun endpoint client ne contient l’URL source ou les credentials réels.
- Un serveur plein ou offline n’est jamais sélectionné pour une nouvelle session.
- Deux demandes simultanées ne peuvent pas dépasser la capacité déclarée.
- Toute lecture ou modification d’un secret est autorisée par rôle et auditée.

### Livrables

- Administration des sources, stockage sécurisé, health checks, alertes et routage automatique.

---

## Sprint 6 — Player web, sessions temporaires et appareils

### But

Permettre une lecture web sécurisée lorsque la licence et le format du flux l’autorisent.

### Fonctionnalités et travaux

1. **Autorisation de lecture**
   - Vérifier compte, abonnement, chaîne incluse, territoire, appareils, connexions simultanées et disponibilité source.
   - Retourner un motif utilisateur clair sans révéler les détails internes.

2. **Sessions et tokens temporaires**
   - Créer un token opaque, signé ou stocké côté serveur, avec expiration courte.
   - Lier le token au compte, à la chaîne, à la session et éventuellement à l’appareil/IP selon les contraintes.
   - Révoquer le token à la déconnexion, suspension ou dépassement des règles.

3. **Passerelle de lecture**
   - Résoudre la source uniquement côté backend ou couche streaming.
   - Ne jamais rediriger le navigateur vers une URL contenant les vrais identifiants.
   - Prévoir renouvellement contrôlé du token pour les longues lectures.

4. **Player**
   - Lecture/pause, volume, plein écran, qualité si disponible, état de chargement et erreurs accessibles.
   - Compatibilité testée sur les navigateurs cibles et comportement de repli documenté.

5. **Gestion des appareils**
   - Enregistrer un appareil avec nom compréhensible, type, dernière activité et statut.
   - Permettre au client de déconnecter un appareil.
   - Appliquer les limites de l’offre et fournir une procédure de remplacement sécurisée.

6. **Comptage des connexions**
   - Heartbeat de session, expiration automatique des sessions fantômes et libération de capacité.
   - Protection contre les courses lors de connexions simultanées.

### Critères d’acceptation

- Un client non abonné ou non autorisé ne peut obtenir aucune session de lecture.
- Le code source et le trafic API public ne révèlent aucun secret fournisseur permanent.
- La suspension d’un abonnement révoque les sessions actives dans le délai défini.
- Les limites d’appareils et de connexions résistent aux demandes concurrentes.

### Livrables

- Player web, passerelle sécurisée, tokens temporaires, inventaire d’appareils et limites de concurrence.

---

## Sprint 7 — E-mails, dashboard essentiel, qualité et lancement MVP

### But

Finaliser le parcours automatique et rendre le MVP exploitable en production.

### Fonctionnalités et travaux

1. **Service d’e-mails transactionnels**
   - Modèles FR/EN/AR : bienvenue, vérification, paiement confirmé, activation, accès, mot de passe oublié et paiement échoué.
   - Envoi asynchrone, tentatives automatiques, suivi de livraison et gestion des rebonds.
   - Aucun credential de source permanent dans un e-mail.

2. **Rappels d’abonnement**
   - Tâches planifiées à J-7, J-3 et expiration.
   - Protection contre les doublons et prise en compte du fuseau horaire et de la langue du client.

3. **Dashboard MVP**
   - Clients actifs, nouveaux clients, expirations proches, revenu jour/mois, paiements échoués, viewers, charge et serveurs indisponibles.
   - Définitions documentées pour éviter des chiffres contradictoires.

4. **Performance et accessibilité**
   - Cache pages publiques, CDN pour assets, lazy loading, compression Brotli/Gzip et images modernes.
   - Objectifs : accueil sous 2 secondes dans les conditions de test définies ; API usuelles sous 300 ms au percentile convenu.
   - Audit clavier, contrastes, lecteurs d’écran et responsive.

5. **Sécurité et résilience**
   - WAF/CDN, headers de sécurité, rate limiting, 2FA admin et revue des permissions.
   - Sauvegarde quotidienne chiffrée hors serveur principal avec test de restauration.
   - Tests de charge séparés pour l’API et la couche vidéo.

6. **Recette et lancement**
   - Tests end-to-end du parcours accueil → offre → paiement → activation → lecture.
   - Runbook d’incident, retour arrière, support de lancement et critères go/no-go.

### Critères d’acceptation

- Le parcours critique fonctionne de bout en bout sur staging avec un paiement de test confirmé par webhook.
- Les sauvegardes ont été restaurées avec succès dans un environnement isolé.
- Aucun défaut critique de sécurité, paiement ou fuite de secret n’est ouvert.
- Les alertes critiques sont testées et possèdent un destinataire et une procédure d’action.

### Livrables

- MVP production, e-mails automatisés, dashboard, rapport de recette, tests de charge, sauvegardes et runbooks.

---

## Sprint 8 — Back-office complet et permissions

### But

Donner aux équipes métier les outils nécessaires sans leur accorder plus de droits que nécessaire.

### Fonctionnalités et travaux

1. **Gestion des clients**
   - Recherche et filtres sur nom, e-mail, pays, statut et expiration.
   - Vue détaillée : abonnement, paiements, appareils, sessions, dernière connexion et historique.
   - Actions suspendre, prolonger, renouveler ou modifier avec confirmation et motif obligatoire.

2. **Contrôle d’accès par rôle**
   - Super Admin : tous les droits.
   - Finance : paiements, factures, remboursements et indicateurs financiers.
   - Support : clients, diagnostics et tickets, sans accès aux secrets.
   - Content Manager : chaînes, catégories, packs et publication.
   - Technical Admin : sources, serveurs, capacité et incidents.

3. **Journal d’audit**
   - Acteur, action, objet, avant/après filtré, date, IP et identifiant de corrélation.
   - Recherche et export contrôlé ; secrets toujours masqués.

4. **Actions sensibles**
   - Confirmation renforcée pour remboursement, modification de droits ou révélation temporaire strictement nécessaire.
   - Possibilité d’imposer une validation à deux personnes pour certaines opérations financières ou techniques.

### Critères d’acceptation

- Chaque rôle ne voit que ses menus et seules ses API autorisées fonctionnent.
- Un agent support ne peut ni lire ni exporter un secret fournisseur.
- Toute modification d’abonnement par un administrateur est motivée et auditée.

### Livrables

- Back-office métier complet, matrice RBAC et audit exploitable.

---

## Sprint 9 — Support client et guides par appareil

### But

Réduire les demandes répétitives et permettre au support de diagnostiquer sans accès technique excessif.

### Fonctionnalités et travaux

1. **Centre d’aide**
   - Guides illustrés Smart TV, Android TV, Android, iPhone et ordinateur.
   - Sections paiement, connexion, appareils et qualité de lecture.
   - Contenu traduit, recherchable et administrable.

2. **Tickets support**
   - Création par catégorie, priorité, statut, messages et pièces jointes contrôlées.
   - Notifications au client et assignation à un agent.

3. **Diagnostic sécurisé**
   - Afficher au support le statut d’abonnement, les appareils, la dernière session, un code d’erreur et la santé générale.
   - Ne jamais montrer l’URL réelle ou les secrets d’une source.

4. **Qualité de service**
   - Catégoriser les causes de tickets et mesurer délai de première réponse, résolution et réouverture.

### Critères d’acceptation

- Un client trouve un guide adapté à son appareil en moins de trois interactions depuis l’aide.
- Le support peut diagnostiquer les cas courants sans rôle technique.
- Les pièces jointes sont limitées, analysées et non exécutables.

### Livrables

- Centre d’aide multilingue, tickets, diagnostic support et indicateurs SLA.

---

## Sprint 10 — Promotions, renouvellement et pilotage commercial

### But

Améliorer conversion, fidélisation et rentabilité sans fragiliser la facturation.

### Fonctionnalités et travaux

1. **Coupons et promotions**
   - Réduction fixe ou pourcentage, dates, quota, produits/pays admissibles et nombre d’utilisations par client.
   - Validation exclusivement côté serveur et audit des usages.

2. **Essai gratuit**
   - Durée, catalogue limité, appareils et connexions configurables.
   - Prévention des essais répétés selon une politique conforme et proportionnée.

3. **Renouvellement automatique**
   - Consentement explicite, date du prochain débit, annulation simple et rappels requis.
   - Traitement des échecs avec délai de grâce et relances configurables.

4. **Upsell intelligent**
   - Comparer la sélection à la carte avec un pack offrant davantage pour un faible écart de prix.
   - Mesurer affichage, acceptation et revenu incrémental sans interface trompeuse.

5. **Indicateurs financiers**
   - MRR, ARPU, churn, renouvellement, remboursements et marge brute estimée.
   - Saisie ou import des coûts contenu, streaming, paiement, support, marketing et infrastructure.
   - Définition et période de calcul visibles pour chaque indicateur.

### Critères d’acceptation

- Un coupon expiré, hors territoire ou au-delà de son quota est refusé côté serveur.
- Le client peut connaître et arrêter son renouvellement automatique sans contacter le support.
- Les indicateurs peuvent être rapprochés des paiements et abonnements sources.

### Livrables

- Promotions, essais, renouvellement automatique, upsell mesuré et dashboard financier.

---

## Sprint 11 — Haute disponibilité et montée en charge

### But

Préparer la croissance sans qu’un pic de viewers bloque le site, le paiement ou l’administration.

### Fonctionnalités et travaux

1. **Redondance applicative**
   - Au moins deux instances backend derrière un load balancer.
   - Health checks, redémarrage automatique et déploiement progressif.

2. **Résilience des données**
   - Stratégie de réplication PostgreSQL selon le besoin, plan de bascule et objectifs RPO/RTO.
   - Redis hautement disponible si le niveau de service le justifie.

3. **Résilience des workers**
   - Files avec retries bornés, dead-letter queue et outils de reprise.
   - Déduplication des tâches de paiement, e-mail et expiration.

4. **Capacité et tests de panne**
   - Scénarios de pic catalogue, paiement, connexion et démarrage simultané de lecture.
   - Simuler perte d’une source, d’une instance API, de Redis et indisponibilité temporaire du prestataire de paiement.

5. **Supervision avancée**
   - Alertes CPU, RAM, disque, bande passante, latence, erreurs, paiements, base, sources et sessions.
   - Tableaux par service et objectifs de niveau de service.

### Critères d’acceptation

- La perte d’une instance backend n’interrompt pas le parcours client.
- Une source indisponible provoque la bascule prévue sans exposer d’erreur technique sensible.
- Les objectifs RPO/RTO définis sont vérifiés lors d’un exercice documenté.

### Livrables

- Architecture redondante, tests de chaos contrôlés, plan de reprise et tableaux d’exploitation.

---

## 5. Backlog postérieur à la version 2

Ces éléments doivent être anticipés dans le modèle mais ne doivent pas retarder le MVP :

- EPG/programme TV et recherche dans les programmes ;
- favoris et historique de lecture ;
- profils familiaux et contrôle parental par code PIN ;
- recommandations respectueuses de la vie privée ;
- applications Android, iOS, Android TV et Smart TV ;
- mode multi-devices avancé ;
- affiliation et suivi des commissions ;
- portail revendeurs/B2B avec quotas et tarification séparée ;
- API partenaires avec OAuth, scopes, quotas et audit ;
- DRM et CDN vidéo avancé lorsque les licences ou volumes l’exigent.

## 6. Dépendances critiques

| Dépendance | Bloque | Décision attendue au plus tard |
|---|---|---|
| Licences de diffusion par territoire et appareil | Publication, vente, player | Sprint 0 |
| Prestataire de paiement, pays et devises | Paiement et renouvellement | Sprint 1 |
| Formats et stabilité des sources autorisées | Routage et player | Sprint 2 |
| Fournisseur d’e-mails et domaine authentifié | Activation et notifications | Sprint 3 |
| Hébergement, CDN/WAF et région des données | Mise en production | Sprint 1 |
| Politique appareils/connexions | Packs et player | Sprint 2 |
| Règles fiscales, facture et remboursement | Commande et paiement | Sprint 1 |

## 7. Stratégie de tests transversale

- **Tests unitaires** : prix, durées, transitions, permissions et score de routage.
- **Tests d’intégration** : PostgreSQL, Redis, workers, fournisseur e-mail, paiement et sources simulées.
- **Tests contractuels** : schémas des webhooks et API fournisseurs.
- **Tests end-to-end** : inscription, achat, activation, lecture, renouvellement et suspension.
- **Tests de concurrence** : capacité serveur, nombre de connexions et idempotence des webhooks.
- **Tests de sécurité** : contrôle d’accès, fuite de secrets, injection, CSRF/XSS, rate limiting et sessions.
- **Tests de performance** : accueil, catalogue, API courantes et création de sessions.
- **Tests d’accessibilité** : clavier, focus, contrastes, annonces d’erreur et RTL.
- **Tests de reprise** : restauration de base, reprise des workers et bascule d’une source.

Une fonctionnalité critique ne peut être terminée sans test automatisé de son chemin nominal et de ses principaux échecs.

## 8. Définition de “terminé” commune à tous les sprints

Une fonctionnalité est terminée lorsque :

- ses critères d’acceptation sont validés par le product owner ;
- les règles d’autorisation et de territoire sont appliquées côté serveur ;
- les textes FR/EN/AR et le RTL sont vérifiés ;
- les tests automatiques pertinents passent ;
- les erreurs sont journalisées sans données sensibles ;
- les métriques et alertes nécessaires existent ;
- la documentation utilisateur et/ou d’exploitation est mise à jour ;
- la migration de données et le retour arrière sont prévus ;
- la revue de sécurité ne signale aucun défaut bloquant ;
- la fonctionnalité fonctionne sur les appareils et navigateurs cibles.

## 9. Priorités en cas de contrainte de délai

1. Ne jamais réduire les contrôles légaux, la sécurité des secrets ou la fiabilité du paiement.
2. Conserver un catalogue et un achat de pack simples avant les fonctions commerciales avancées.
3. Reporter le player web si les droits, les formats ou la protection des sources ne sont pas suffisamment maîtrisés.
4. Reporter essais, coupons, recommandations, applications et portail revendeur après stabilisation du cœur.
5. Lancer sur un nombre limité de pays et de chaînes autorisées plutôt que publier un catalogue juridiquement ou techniquement incertain.

## 10. Indicateurs de réussite du lancement

- Taux de paiement confirmé transformé en abonnement actif supérieur à 99,9 % hors refus bancaires.
- Zéro activation basée uniquement sur le retour navigateur du paiement.
- Zéro credential fournisseur exposé au client ou dans les logs non restreints.
- Disponibilité et latence mesurées séparément pour site, API et lecture.
- Taux de démarrage réussi des flux et temps moyen de démarrage suivis par chaîne et appareil.
- Taux de délivrance des e-mails transactionnels et rebonds surveillés.
- Conversion visite → achat, panier moyen, MRR, ARPU, churn et marge suivis avec une définition stable.
- Volume de tickets, délai de première réponse et motifs principaux suivis après lancement.

## 11. Ordre recommandé de lancement

1. Lancement interne avec sources de test et paiement sandbox.
2. Alpha avec employés et comptes autorisés.
3. Bêta fermée dans un seul territoire licencié et sur un catalogue réduit.
4. Ouverture progressive avec limites de capacité et surveillance renforcée.
5. Ajout des territoires, chaînes et appareils uniquement après validation juridique, technique et opérationnelle.

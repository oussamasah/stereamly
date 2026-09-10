# Architecture et modèle de données

## Stack proposée

- **Frontend** : Next.js + TypeScript, applications publiques, client et admin séparées logiquement.
- **Backend** : NestJS + TypeScript, API REST documentée. Choix à valider avant Sprint 1.
- **Données** : PostgreSQL.
- **Cache et coordination** : Redis.
- **Workers** : file de tâches compatible Redis pour e-mails, webhooks, santé et expirations.
- **Assets** : stockage objet et CDN.
- **Player web** : Shaka Player, HLS adaptatif prioritaire, DASH et DRM lorsque requis.
- **Streaming** : passerelle séparée de l’API métier ; aucune source directe exposée ; failover contrôlé entre sources compatibles.
- **Infrastructure** : AWS région Europe (Paris) `eu-west-3`, conteneurs, staging et production séparés, CDN/WAF Cloudflare en frontal.
- **Secrets** : AWS Secrets Manager avec KMS, politiques IAM minimales et rotation.
- **E-mails** : Amazon SES dans une région compatible retenue lors du déploiement, avec SPF, DKIM et DMARC.

## Vue logique

```text
Client web
   |
CDN / WAF
   |---------------- Frontend
   |---------------- API métier
                         |--- PostgreSQL
                         |--- Redis
                         |--- Workers --- Paiement / E-mails
                         |
                         +--- Autorisation de lecture
                                  |
                           Passerelle streaming
                                  |
                        Sources autorisées A/B/C
```

La passerelle streaming est isolée afin qu’un pic vidéo ne dégrade pas l’inscription, le paiement ou le back-office.

## Modules backend

- Identity : comptes, sessions, vérification, récupération et 2FA admin.
- Catalog : chaînes, catégories, langues, pays et publication.
- Pricing : packs, prix, durées, devises et calcul serveur.
- Orders : paniers, instantanés et commandes.
- Billing : paiements, webhooks, factures, remboursements et réconciliation.
- Subscriptions : droits, dates, renouvellement et suspension.
- Entitlements : décision d’accès par client, chaîne, territoire et appareil.
- Devices : appareils approuvés et révocation.
- Streaming : sessions temporaires, heartbeat et capacité.
- Sources : serveurs, secrets chiffrés, health checks et routage.
- Notifications : modèles, langues, envoi et suivi.
- Admin/RBAC : permissions et actions privilégiées.
- Audit : événements critiques avec données sensibles filtrées.
- Reporting : métriques opérationnelles et financières.
- Payment Adapter : interface commune entre simulateur hors production et futur prestataire réel.

## Entités principales

| Entité | Rôle | Données clés |
|---|---|---|
| `users` | Identité client/admin | email normalisé, hash, locale, pays, statut |
| `roles`, `permissions` | Autorisations admin | rôle, permission, associations |
| `channels` | Catalogue | nom, logo, catégorie, pays, langue, statut |
| `channel_rights` | Droits contractuels | territoire, appareils, dates, preuve, statut juridique |
| `packages` | Offre groupée | nom, publication, limites |
| `package_channels` | Composition | package, chaîne, période de validité éventuelle |
| `prices` | Tarification | produit, durée, devise, montant, taxes |
| `orders` | Achat | client, état, totaux, devise, instantané |
| `order_items` | Lignes figées | produit, quantité, prix et contenu au moment d’achat |
| `payments` | Transactions | prestataire, référence, état, montant, devise |
| `payment_events` | Idempotence/audit | event ID unique, type, résultat, date |
| `subscriptions` | Contrat d’accès | client, offre, état, début, fin et limites |
| `entitlements` | Chaînes accessibles | abonnement, chaîne, origine pack/à la carte |
| `devices` | Appareils client | empreinte pseudonyme, nom, statut, dernière activité |
| `stream_sessions` | Lecture | client, chaîne, appareil, état, début, fin |
| `servers` | Capacité technique | région, priorité, capacité, santé |
| `server_credentials` | Secrets chiffrés | ciphertext, key version, rotation ; accès restreint |
| `channel_sources` | Mapping chaîne/source | type, serveur, priorité, statut |
| `invoices` | Document financier | numéro, commande, taxes, stockage |
| `notifications` | Envoi transactionnel | modèle, canal, statut, tentatives |
| `audit_logs` | Traçabilité | acteur, action, objet, avant/après filtré, corrélation |

## Contraintes essentielles

- Unicité de `users.email_normalized`.
- Unicité de `(payment_provider, provider_event_id)` dans `payment_events`.
- Montants stockés en plus petite unité monétaire entière, jamais en flottant.
- Dates stockées en UTC ; présentation selon le fuseau utilisateur.
- Clés étrangères et index sur états, dates d’expiration et recherches métier.
- Soft delete seulement lorsque l’audit l’exige ; anonymisation pour le droit à l’effacement.
- Les instantanés de commande sont immuables.
- Les secrets ne figurent jamais dans `channel_sources` en clair.

## Décisions techniques encore ouvertes

- Dimensionnement AWS exact et comptes de facturation.
- Prestataire de paiement de production et exigences PCI associées ; le prototype utilise un simulateur hors production.
- Prestataire e-mail et hébergement des factures.
- Besoin DRM par chaîne et stratégie proxy/CDN vidéo ; HLS est prioritaire et DASH pris en charge.
- Objectifs contractuels RPO, RTO et disponibilité.
- Politique d’identification des appareils respectueuse du RGPD.

## Disponibilité internationale

- Le code accepte une liste ISO de pays et des traductions extensibles depuis le backend.
- La langue d’interface et le pays de commercialisation sont deux notions séparées.
- La politique par défaut est `deny` : aucun contenu tiers n’est publié sans territoire explicitement autorisé.
- Le socle métier est hébergé initialement à Paris ; l’ajout de régions de streaming dépendra des mesures de latence et des droits.
- Cloudflare protège et accélère les pages et assets ; la vidéo suit une politique CDN distincte adaptée au volume et aux contrats.

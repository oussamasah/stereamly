# Registre des décisions à valider

## Décisions bloquantes

| ID | Question | Responsable attendu | Échéance | Statut |
|---|---|---|---|---|
| D-001 | Quelle société exploite le service et dans quels pays vend-elle ? | Fondateur/Juridique | Avant production | Prototype international sous identité provisoire ; identité légale obligatoire avant vente réelle |
| D-002 | Quelles chaînes disposent de quels droits par pays et appareil ? | Juridique/Contenu | Avant ajout de chaque chaîne | Politique deny-by-default ; prototype limité au contenu synthétique interne |
| D-003 | Quels packs, prix, devises, durées et taxes au lancement ? | Produit/Finance | Sprint 0 | Grille prototype EUR retenue ; taxes calculées avant production |
| D-004 | Combien d’appareils enregistrés et de lectures simultanées par offre ? | Produit | Sprint 0 | Retenu : 1/1, 3/2 et 5/3 |
| D-005 | Quel prestataire de paiement couvre les pays, devises et abonnements visés ? | Finance/Tech | Sprint 0 | Simulateur hors production retenu ; prestataire réel différé |
| D-006 | Le player web est-il autorisé pour chaque chaîne et quel DRM est requis ? | Juridique/Tech | Sprint 0 | Shaka/HLS-DASH retenu ; droits et DRM à valider par chaîne |
| D-007 | Quelle stack backend est retenue : NestJS, Laravel ou Django ? | Tech lead | Sprint 0 | Retenu : NestJS + TypeScript |
| D-008 | Quel hébergeur, quelles régions et quelles règles de résidence des données ? | Tech/Juridique | Sprint 0 | Retenu : AWS Paris eu-west-3, Cloudflare en frontal |

## Décisions importantes non bloquantes pour le début technique

| ID | Question | Responsable attendu | Échéance | Statut |
|---|---|---|---|---|
| D-009 | Renouvellement manuel uniquement dans le MVP ? | Produit/Finance | Sprint 2 | Proposition : oui |
| D-010 | Quel prestataire d’e-mails transactionnels ? | Tech/Marketing | Sprint 2 | À valider |
| D-011 | Quelle politique de remboursement et de contestation ? | Juridique/Finance | Sprint 2 | À valider |
| D-012 | Quel minimum de commande pour l’offre à la carte ? | Produit | Sprint 2 | À valider |
| D-013 | Quels navigateurs et modèles TV seront officiellement supportés ? | Produit/QA | Sprint 4 | À valider |
| D-014 | Quels objectifs RPO, RTO et disponibilité ? | Direction/Tech | Sprint 5 | À valider |

## Décisions actées le 7 septembre 2026

- La plateforme est internationale et multilingue ; les territoires ne sont pas codés en dur.
- Les chaînes, packs, contenus, prix et statuts sont administrés depuis le backend.
- Le paiement est simulé pendant la construction ; le simulateur est techniquement interdit en production.
- Le player de référence est Shaka Player avec HLS adaptatif prioritaire et DASH/DRM selon les droits et sources.
- Le routage choisit automatiquement la meilleure source disponible et prévoit un failover compatible.
- La grille prototype est Essentiel 6,99 €, Famille 11,99 € et Premium 17,99 € par mois, avec remises de durée.
- L’infrastructure de référence est AWS Paris avec Cloudflare, Secrets Manager et KMS.


## Informations nécessaires pour compléter la matrice des droits

Pour chaque chaîne : nom officiel, fournisseur, référence du contrat, emplacement sécurisé de la preuve, pays autorisés, langues, appareils/modes autorisés, dates, renouvellement, DRM, géoblocage et responsable interne.

## Règle de décision

Une décision validée doit préciser la date, le décideur, le choix, sa justification et les documents concernés. Tout changement affectant droits, paiement, sécurité ou données personnelles doit faire l’objet d’une nouvelle entrée traçable.

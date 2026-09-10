# Backlog MVP priorisé

Priorités : **P0** indispensable au lancement, **P1** importante dans le MVP, **P2** reportable si nécessaire.

| ID | Priorité | Fonctionnalité | Propriétaire | Critère de réussite | Sprint |
|---|---|---|---|---|---|
| LEG-01 | P0 | Matrice des droits par chaîne/territoire/appareil | Juridique/PO | 100 % du catalogue publié possède un droit valide | 0 |
| PRD-01 | P0 | Valider packs, durées, prix et limites | PO | Grille approuvée et sans champ obligatoire vide | 0 |
| ARC-01 | P0 | Valider stack et architecture | Tech lead | Architecture approuvée avec risques consignés | 0 |
| IAM-01 | P0 | Inscription et connexion | Backend | Parcours E2E réussi et mots de passe fortement hachés | 1 |
| IAM-02 | P0 | Vérification et récupération e-mail | Backend | Tokens courts, à usage unique et révocables | 1 |
| I18N-01 | P1 | FR/EN/AR et RTL | Frontend | Écrans MVP vérifiés dans les trois langues | 1-7 |
| OPS-01 | P0 | CI/CD staging | DevOps | Build, tests et déploiement reproductibles | 1 |
| CAT-01 | P0 | CRUD chaînes et catégories | Full-stack | Publication/refus selon les règles définies | 2 |
| CAT-02 | P0 | CRUD packs et composition | Full-stack | Packs administrables avec prix et limites | 2 |
| CAT-03 | P1 | Catalogue public filtrable | Frontend | Utilisable sur mobile et navigation clavier | 2 |
| PRI-01 | P0 | Calcul de prix serveur | Backend | Aucun prix client ne peut forcer le total | 2 |
| ORD-01 | P0 | Panier et commande immuable | Full-stack | Instantané complet enregistré avant paiement | 3 |
| SUB-01 | P0 | Cycle de vie abonnement | Backend | Toutes les transitions sont testées | 3 |
| CUS-01 | P1 | Espace client initial | Frontend | Statut, contenu, expiration et commandes visibles | 3 |
| PAY-01 | P0 | Session de paiement | Backend | Montant/devise issus de la commande serveur | 4 |
| PAY-02 | P0 | Webhook signé et idempotent | Backend | Dix répétitions causent un seul effet | 4 |
| PAY-03 | P0 | Activation automatique | Backend | Activation uniquement après confirmation valide | 4 |
| INV-01 | P1 | Facture/reçu | Finance/Backend | Document conforme accessible au client | 4 |
| SRC-01 | P0 | Registre sources/serveurs | Backend | Sources configurables sans secret exposé | 5 |
| SEC-01 | P0 | Chiffrement et rotation des secrets | Security/Backend | Secret absent des API/logs et accès audité | 5 |
| ROU-01 | P0 | Routage et capacité atomique | Backend | Aucun dépassement sous test concurrent | 5 |
| MON-01 | P0 | Health checks des sources | DevOps | Offline détecté et alerté dans le délai cible | 5 |
| ENT-01 | P0 | Autorisation de lecture | Backend | Tous les droits et limites sont vérifiés serveur | 6 |
| STR-01 | P0 conditionnel | Token et passerelle streaming | Streaming | Aucune URL/credential permanent côté client | 6 |
| PLY-01 | P1 conditionnel | Player web | Frontend | Lecture stable sur navigateurs licenciés/cibles | 6 |
| DEV-01 | P1 | Gestion des appareils | Full-stack | Limites et révocation fonctionnent en concurrence | 6 |
| EML-01 | P0 | E-mails transactionnels | Backend | Envoi, retries et rebonds mesurés | 7 |
| EML-02 | P1 | Rappels J-7/J-3/expiration | Backend | Aucun doublon et langue correcte | 7 |
| ADM-01 | P0 | Dashboard d’exploitation | Full-stack | Indicateurs critiques définis et cohérents | 7 |
| BAK-01 | P0 | Sauvegarde et restauration | DevOps | Restauration testée et documentée | 7 |
| SEC-02 | P0 | RBAC, 2FA, WAF et rate limiting | Security | Revue sécurité sans défaut bloquant | 7 |
| QA-01 | P0 | Recette E2E et charge | QA | Go/no-go approuvé sur preuves | 7 |

Les propriétaires sont des rôles provisoires. Des personnes nommées doivent les remplacer avant la fin du Sprint 0.


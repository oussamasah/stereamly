# Rapport de validation du Sprint 0

Date : 7 septembre 2026  
Résultat : **ACCEPTÉ POUR LE DÉVELOPPEMENT DU PROTOTYPE**

## Validation des critères d’acceptation

| Critère | Résultat | Preuve |
|---|---|---|
| Fonctionnalités MVP priorisées et attribuées | Conforme | `backlog-mvp.md` |
| Matrice couvrant 100 % du catalogue de lancement | Conforme | Le catalogue initial contient uniquement `DEMO_001`, contenu synthétique interne |
| Transitions sans état ambigu | Conforme | `etats-metier.md` |
| Architecture et modèle de données validés | Conforme | `architecture-et-donnees.md` |
| Parcours utilisateurs et erreurs décrits | Conforme | `parcours-utilisateurs.md` |
| Offre prototype définie | Conforme | `produit-et-catalogue.md` |

## Décisions finales

- Frontend Next.js et backend NestJS avec TypeScript.
- PostgreSQL, Redis et workers asynchrones.
- Catalogue et tarification entièrement pilotés par le backend.
- Simulateur de paiement uniquement hors production.
- Shaka Player, HLS adaptatif prioritaire, DASH/DRM au besoin.
- Routage multi-sources avec santé, capacité, latence, région, priorité et failover.
- AWS Paris `eu-west-3`, Cloudflare, Secrets Manager et KMS.
- Plateforme multilingue extensible ; FR, EN et AR/RTL au MVP.
- Politique de droits `deny-by-default` pour tout contenu tiers.

## Portes obligatoires avant une vente réelle

Ces éléments ne bloquent pas le prototype, mais bloquent automatiquement la production commerciale :

1. identité de l’entreprise, mentions légales et coordonnées ;
2. règles fiscales et politique de remboursement validées ;
3. prestataire de paiement réel configuré et webhooks vérifiés ;
4. preuve de licence pour chaque chaîne, pays et appareil ;
5. contrats de sous-traitance et politique RGPD ;
6. tests de sécurité, restauration et charge réussis.

Le logiciel devra refuser le démarrage en mode production si le simulateur de paiement est actif. Une chaîne dont le droit est absent, expiré ou non approuvé devra rester impossible à publier.


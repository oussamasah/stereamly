# États métier et transitions

## Commande

| État | Signification | Transitions autorisées |
|---|---|---|
| `draft` | Panier non finalisé | `pending_payment`, `cancelled` |
| `pending_payment` | Session de paiement créée | `paid`, `payment_failed`, `cancelled`, `expired` |
| `paid` | Paiement confirmé et rapproché | `fulfilled`, `refunded`, `disputed` |
| `fulfilled` | Abonnement activé/prolongé | `refunded`, `disputed` |
| `payment_failed` | Paiement refusé ou échoué | `pending_payment`, `cancelled`, `expired` |
| `expired` | Délai de paiement dépassé | aucune ; créer une nouvelle commande |
| `cancelled` | Commande abandonnée/annulée | aucune |
| `refunded` | Montant remboursé selon la règle | aucune |
| `disputed` | Paiement contesté | traitement manuel contrôlé |

Règle : `paid` n’est accessible que par un webhook valide ou une réconciliation serveur authentifiée et auditée.

## Paiement

| État | Signification | Transitions autorisées |
|---|---|---|
| `created` | Paiement initialisé | `processing`, `succeeded`, `failed`, `cancelled` |
| `processing` | Confirmation asynchrone attendue | `succeeded`, `failed`, `cancelled` |
| `succeeded` | Fonds confirmés | `partially_refunded`, `refunded`, `disputed` |
| `failed` | Paiement échoué | terminal pour cette tentative |
| `cancelled` | Paiement annulé | terminal pour cette tentative |
| `partially_refunded` | Remboursement partiel | `refunded`, `disputed` |
| `refunded` | Total remboursé | `disputed` si le prestataire le permet |
| `disputed` | Contestation ouverte | `succeeded`, `refunded` selon issue |

Chaque événement porte une clé d’idempotence unique du prestataire.

## Abonnement

| État | Signification | Transitions autorisées |
|---|---|---|
| `pending` | Paiement ou activation en cours | `active`, `cancelled` |
| `active` | Accès autorisé jusqu’à la date de fin | `suspended`, `expired`, `cancelled` |
| `suspended` | Accès bloqué temporairement | `active`, `expired`, `cancelled` |
| `expired` | Date de fin dépassée | `active` via renouvellement payé |
| `cancelled` | Résiliation enregistrée | `active` uniquement via nouvel achat validé |

Règles complémentaires :

- une prolongation conserve l’historique précédent ;
- aucune date ne doit être modifiée silencieusement ;
- suspension et réactivation administratives nécessitent un motif ;
- l’expiration est déterminée côté serveur selon une convention de fuseau documentée ;
- un remboursement ne modifie l’accès qu’en appliquant une politique approuvée.

## Source

`unknown` → `online` / `degraded` / `offline` / `disabled`.

- `disabled` est une décision administrative et interdit tout nouveau routage ;
- `offline` résulte des contrôles de santé ;
- plusieurs succès/échecs consécutifs sont requis pour éviter les changements d’état rapides ;
- les sessions existantes et nouvelles peuvent avoir des politiques de bascule distinctes.

## Session de lecture

`requested` → `authorized` → `active` → `ended` ou `expired` ou `revoked`.

Une réservation de capacité doit être atomique. Toute session sans heartbeat au-delà du délai défini expire et libère sa capacité.


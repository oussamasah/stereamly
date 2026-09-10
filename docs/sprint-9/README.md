# Sprint 9 — Commerce et paiement simulé

Le sprint relie les packs publiés aux droits de lecture. Le panier est persistant par utilisateur, pays et devise. Le serveur relit le tarif actif, calcule les taxes en unités mineures et crée une commande dont les instantanés produit/contenu et les montants ne sont plus recalculés.

Le simulateur, automatiquement désactivé en production, couvre `SUCCEEDED`, `FAILED`, `DELAYED`, `REFUNDED` et `DISPUTED`. Le webhook alternatif est signé par HMAC-SHA256 via `x-payment-signature`; `externalId` est unique et rend son traitement idempotent. Seul un événement `SUCCEEDED` active abonnement et entitlements. La page de retour navigateur ne déclenche aucune activation.

Une souscription active accorde VOD et séries, ainsi que les chaînes du pack. Expiration, remboursement et contestation désactivent ces droits et ferment les sessions actives. Le lecteur contrôle également les plafonds appareils et flux simultanés du pack.

Interface : `/[locale]/packages` pour panier/commande/simulation et `/[locale]/account` pour offre, expiration, appareils et historique des commandes.

Limite volontaire : aucune transaction financière réelle n’est exécutée avant le Sprint 11.

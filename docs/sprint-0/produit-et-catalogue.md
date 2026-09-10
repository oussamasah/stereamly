# Cadrage produit et catalogue

## Proposition de valeur

Une plateforme de streaming légal permettant à un client non technique de choisir une offre, payer, recevoir son activation et regarder les chaînes autorisées sans voir les mécanismes techniques des fournisseurs.

## Public cible initial

- Particuliers francophones, anglophones et arabophones.
- Utilisation sur mobile, ordinateur, tablette et navigateur Smart TV lorsque compatible.
- Portée commerciale internationale, sans liste de pays codée en dur.
- L’ouverture reste contrôlée pays par pays et chaîne par chaîne selon les contrats de diffusion.

## Parcours principal

Accueil → Catalogue → Pack ou chaînes à la carte → Panier → Compte → Paiement → Activation → Regarder ou consulter le guide d’installation.

## Périmètre MVP

### Inclus

- Catalogue visuel de chaînes et packs.
- Filtres par catégorie, pays et langue.
- Achat d’un pack ou d’une sélection à la carte.
- Durées mensuelle, trimestrielle, semestrielle et annuelle si validées.
- Compte client et récupération de mot de passe.
- Paiement en ligne confirmé exclusivement par webhook signé.
- Activation et e-mails automatiques.
- Espace client : abonnement, commandes, factures, appareils et sessions.
- Back-office essentiel : catalogue, clients, abonnements, paiements et sources.
- Routage automatique entre sources autorisées.
- Player web uniquement pour les chaînes disposant de droits et formats compatibles.
- FR, EN et AR avec RTL.

### Hors MVP

- Applications natives mobiles et TV.
- EPG avancé, replay et vidéo à la demande.
- Profils familiaux et contrôle parental.
- Affiliation, revendeurs et API partenaires.
- Recommandations personnalisées.
- Coupons, essais et renouvellement automatique, prévus après stabilisation du MVP.

## Offre commerciale à valider

| Élément | Proposition de travail | Décision requise |
|---|---|---|
| Modèle | Packs + chaînes à la carte | Confirmer |
| Packs de départ | Essentiel, Famille, Premium et packs thématiques/pays administrables | Retenu |
| Durées | 1, 3, 6 et 12 mois | Retenu |
| Devises | EUR au prototype ; architecture multidevise | Retenu |
| Appareils | 1 / 3 / 5 selon le pack | Retenu |
| Connexions simultanées | 1 / 2 / 3 selon le pack | Retenu |
| Minimum à la carte | 3 chaînes | Retenu |
| Essai | Hors MVP | Retenu |
| Renouvellement | Manuel dans le MVP | Retenu |
| Taxes | Calculées selon société et pays du client | Validation comptable requise |

### Grille tarifaire initiale du prototype

| Offre | 1 mois | 3 mois (-5 %) | 6 mois (-10 %) | 12 mois (-20 %) | Appareils | Simultanées |
|---|---:|---:|---:|---:|---:|---:|
| Essentiel | 6,99 € | 19,92 € | 37,75 € | 67,10 € | 1 | 1 |
| Famille | 11,99 € | 34,17 € | 64,75 € | 115,10 € | 3 | 2 |
| Premium | 17,99 € | 51,27 € | 97,15 € | 172,70 € | 5 | 3 |

Une chaîne à la carte coûte initialement 1,49 €/mois avec un minimum de trois chaînes. Tous ces montants sont configurables depuis le backend et servent de valeurs de démonstration, pas d’engagement commercial définitif.


## Administration dynamique du catalogue

Le catalogue, les packs et les tarifs sont intégralement fournis par l’API. Aucun contenu commercial ne doit être codé en dur dans le frontend.

Depuis le back-office, un utilisateur autorisé peut :

- ajouter, modifier, archiver et réordonner une chaîne ;
- ajouter, modifier, archiver et dupliquer un pack ;
- associer ou retirer des chaînes d’un pack ;
- gérer traductions, logos, catégories, langues et pays ;
- définir les prix par durée et devise ;
- définir les limites d’appareils et de connexions simultanées ;
- préparer un brouillon, prévisualiser puis publier ;
- voir pourquoi une chaîne est bloquée avant publication.

La suppression physique est interdite lorsqu’une chaîne ou un pack est présent dans une ancienne commande. Dans ce cas, l’élément est archivé afin de conserver l’historique financier.

## Paiement du prototype

Le MVP technique commence avec un **simulateur de paiement interne**, actif exclusivement en local, dans les tests et sur staging. Il reproduit les événements `succeeded`, `failed`, `delayed`, `refunded` et `disputed`, y compris les doublons de webhook.

Le simulateur est interdit en production par une vérification bloquante au démarrage. L’intégration d’un véritable prestataire utilisera ensuite la même interface de paiement et les mêmes transitions métier.

## Player retenu

Le choix de référence est **Shaka Player**, avec HLS adaptatif comme format prioritaire et DASH lorsque la source ou le DRM l’exige. Ce choix offre une couche commune pour HLS, DASH et plusieurs DRM dans les navigateurs compatibles.

La fiabilité ne dépend pas uniquement du player. Elle repose sur :

- plusieurs qualités adaptatives fournies par la source ;
- un buffer configuré et mesuré selon le type de connexion ;
- des tentatives réseau bornées avec backoff ;
- le choix serveur selon santé, charge, latence, région et priorité ;
- un failover vers une source secondaire compatible ;
- des tokens courts sans identifiants fournisseurs ;
- des mesures de démarrage, buffering, erreurs et changements de qualité.

Une diffusion « sans aucune coupure » ne peut pas être garantie techniquement, mais l’architecture doit minimiser les coupures et mesurer objectivement la qualité.

## Règles métier proposées

1. Une chaîne ne peut être publiée que si elle possède une source active et un droit valide pour au moins un territoire.
2. Une offre n’est visible et achetable que dans les territoires couverts.
3. Le prix final est toujours recalculé par le backend ; le prix du navigateur n’est jamais fiable.
4. Une sélection à la carte ne facture pas deux fois une chaîne déjà incluse dans un pack.
5. La commande conserve un instantané du contenu, du prix, de la devise et des taxes.
6. Un abonnement n’est activé qu’après webhook de paiement vérifié.
7. Les limites d’appareils et de connexions simultanées sont indépendantes.
8. Une chaîne sans droit de lecture web peut être incluse dans une offre uniquement si un autre mode d’accès légal et documenté existe.
9. Aucun nom de serveur, IP, URL source ou identifiant fournisseur n’est communiqué au client.
10. Une expiration ou suspension révoque les nouvelles autorisations de lecture et les sessions actives selon le délai de sécurité défini.

## Indicateurs du MVP

- Conversion visiteur → commande payée.
- Paiements confirmés → abonnements activés.
- Temps entre webhook confirmé et activation.
- Taux de délivrance des e-mails.
- Taux de démarrage réussi et temps de démarrage du player.
- Sources disponibles, charge et échecs de bascule.
- Nombre de clients actifs, MRR et expirations proches.
- Tickets par motif et appareil.

# Parcours utilisateurs

## 1. Visiteur et achat

1. Le visiteur arrive sur l’accueil dans la langue détectée, qu’il peut modifier.
2. Il choisit son pays de résidence si celui-ci ne peut pas être déterminé avec certitude.
3. Le catalogue ne présente que les offres juridiquement disponibles dans ce pays.
4. Il filtre les chaînes ou consulte les packs.
5. Il sélectionne une durée et voit le prix total, les appareils et connexions inclus.
6. Il crée un compte ou se connecte.
7. Le backend revalide pays, droits, contenu et prix avant de créer la commande.
8. Le visiteur paie sur le parcours sécurisé du prestataire.
9. La page de retour affiche « confirmation en cours » tant que le webhook n’est pas reçu.
10. Le webhook vérifié active l’abonnement et déclenche l’e-mail.
11. Le client accède à son espace et, si autorisé, au bouton « Regarder maintenant ».

### Erreurs prévues

- **Paiement refusé** : commande conservée temporairement, aucune activation, nouvelle tentative possible.
- **Webhook retardé** : statut « confirmation en cours », réconciliation automatique et support possible.
- **Prix modifié** : nouvelle validation explicite avant paiement.
- **Territoire non autorisé** : achat bloqué avec message non technique.
- **Compte déjà existant** : proposer connexion ou récupération du mot de passe.

## 2. Lecture d’une chaîne

1. Le client sélectionne une chaîne incluse.
2. Le backend valide compte, abonnement, territoire, appareils et connexions simultanées.
3. Le routeur choisit une source disponible sans intervention du client.
4. Une session temporaire révocable est créée.
5. Le player démarre et envoie un heartbeat limité.
6. À l’arrêt ou à l’expiration, la capacité est libérée.

### Erreurs prévues

- **Abonnement expiré** : bouton de renouvellement.
- **Chaîne non incluse** : retour au catalogue avec option d’achat.
- **Limite d’appareils atteinte** : liste des appareils et déconnexion possible.
- **Limite de connexions atteinte** : afficher les sessions existantes et une action sûre.
- **Source indisponible** : bascule automatique ; message générique si toutes les sources échouent.
- **Lecture web interdite** : guide du mode d’accès autorisé, sans exposition de credentials permanents.

## 3. Support

1. Recherche le client par e-mail ou identifiant de commande.
2. Consulte abonnement, paiement, appareils, code d’erreur et état global du service.
3. Suit une procédure de diagnostic sans voir les secrets fournisseurs.
4. Peut renvoyer un e-mail, révoquer une session ou ouvrir un ticket selon ses droits.
5. Toute modification manuelle d’abonnement demande un motif et produit un audit.

## 4. Finance

1. Consulte commandes, paiements, remboursements et écarts.
2. Réconcilie un événement fournisseur avec une commande.
3. Peut relancer un traitement idempotent, jamais créer une activation libre sans permission dédiée.
4. Exporte les données comptables autorisées ; les secrets techniques n’apparaissent jamais.

## 5. Content Manager

1. Crée catégories, chaînes et packs.
2. Associe les contenus, prix, pays et langues.
3. Demande la publication.
4. Le système contrôle droit valide, prix et source active.
5. La publication invalide le cache du catalogue.

## 6. Technical Admin

1. Enregistre un serveur ou une source autorisée.
2. Les secrets sont saisis dans un canal sécurisé et chiffrés.
3. Configure capacité, priorité, région et source de secours.
4. Consulte santé, latence, charge et incidents.
5. Effectue une rotation de secret auditée sans l’exposer au support ou au content manager.

## 7. Super Admin

Supervise les rôles et paramètres globaux. Les actions critiques exigent 2FA, confirmation, motif et journal d’audit. Les secrets restent masqués par défaut, y compris pour ce rôle.


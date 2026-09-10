# Analyse d’OwnTV et architecture d’ingestion/lecture pour Streamly

Version — 8 septembre 2026

## 1. Conclusion

OwnTV est une excellente référence pour comprendre les **formats d’entrée**, la synchronisation de gros catalogues et la stratégie de lecture. Il s’agit toutefois d’une application Android locale, alors que Streamly est une plateforme web centralisée. Nous devons donc reprendre les concepts, mais déplacer les connexions fournisseurs, les secrets et la résolution des flux dans le backend.

La cible retenue est :

```text
Back-office -> Coffre chiffré -> Adaptateur de source -> Import/normalisation
                                                       |
Utilisateur -> Autorisation -> Session opaque -> Gateway média -> Player web
                                                       |
                                      résolution fraîche du flux fournisseur
```

Le navigateur ne reçoit ni utilisateur/mot de passe Xtream, ni MAC, ni identité Portal, ni URL permanente contenant ces valeurs.

## 2. Ce qu’OwnTV apporte comme référence

Le dépôt prend en charge :

- playlist M3U distante ou fichier local ;
- compte compatible Xtream avec URL, utilisateur et mot de passe ;
- Portal/Stalker avec URL et adresse MAC, plus identité avancée optionnelle ;
- Live, films, séries, saisons et épisodes ;
- EPG XMLTV, favoris, historique et reprise ;
- parsing progressif de gros fichiers/réponses ;
- choix Media3/ExoPlayer pour le direct rapide et libmpv/FFmpeg pour la compatibilité ;
- repli borné entre moteur et format HLS/TS ;
- résolution tardive des liens Portal de courte durée ;
- en-têtes par flux, sous-titres et propriétés DRM déclarées par la source.

Point important : OwnTV et OwnTV Core sont sous licence GPL-3.0. Streamly peut étudier leurs comportements et concevoir sa propre implémentation, mais ne doit pas copier leur code si le projet ne souhaite pas respecter les obligations GPL applicables à une œuvre dérivée distribuée.

## 3. Modèle de source recommandé

### 3.1 Données générales

`SourceAccount` contient :

- `id`, `name`, `type` : `M3U`, `XTREAM`, `PORTAL_MAC`, `DIRECT` ;
- `baseUrl`, `enabled`, `region`, `priority` ;
- périmètres `syncLive`, `syncMovies`, `syncSeries`, `syncEpg` ;
- `userAgent`, `epgUrl`, fréquence de synchronisation ;
- capacité déclarée et `maxConcurrentStreams` ;
- préférences `preferHls`, profil buffer/latence ;
- états `DRAFT`, `TESTING`, `READY`, `SYNCING`, `DEGRADED`, `AUTH_FAILED`, `EXPIRED`, `OFFLINE`, `DISABLED` ;
- dernière vérification, dernière synchronisation, prochaine exécution et erreur assainie.

### 3.2 Secrets séparés et chiffrés

`SourceSecret` stocke dans un coffre :

- Xtream : utilisateur et mot de passe ;
- Portal/MAC : MAC, numéro de série, Device ID 1/2 et signature, uniquement si fournis et autorisés ;
- token/API key et en-têtes privés éventuels.

Les réponses API utilisent seulement `hasUsername`, `hasPassword`, `hasMac`, etc. Une valeur déjà enregistrée n’est jamais renvoyée au frontend. Toute rotation est auditée.

### 3.3 Contrat commun des adaptateurs

Chaque connecteur implémente :

1. `testConnection()` ;
2. `discoverCapabilities()` ;
3. `syncGroups()` ;
4. `syncLive()` ;
5. `syncMovies()` ;
6. `syncSeries()` et chargement différé des épisodes ;
7. `syncEpg()` ;
8. `resolvePlayback()` ;
9. `refreshSession()` si nécessaire.

Le résultat est converti vers les mêmes objets internes : groupe fournisseur, élément distant, titre média, chaîne, épisode, image, EPG et `PlaybackVariant`.

## 4. Lecture et import par type

### 4.1 M3U/M3U8

Le test lit seulement le début du flux pour vérifier `#EXTM3U`, avec délai, taille et redirections limités. L’import traite le fichier ligne par ligne afin de ne jamais charger une très grosse playlist entièrement en mémoire.

Le parseur reconnaît au minimum :

- `tvg-id`, `tvg-name`, `tvg-logo`, `tvg-chno` ;
- `group-title`, type de contenu et nom affiché ;
- paramètres catch-up ;
- en-têtes `EXTVLCOPT`, `EXTHTTP`, propriétés Kodi et suffixes d’URL ;
- pistes ou propriétés DRM uniquement lorsqu’elles sont explicitement fournies et autorisées.

Comme les identifiants M3U sont parfois instables, une empreinte interne combine source, URL normalisée, `tvg-id`, groupe et nom. La synchronisation utilise une zone de staging et une garde anti-suppression massive avant de remplacer les données actives.

### 4.2 Xtream

Le test vérifie l’état du compte, son expiration et, si disponible, la limite de connexions. Les réponses volumineuses sont lues en streaming. Les catégories et listes Live/VOD/Séries sont importées séparément ; les détails d’une série et ses épisodes peuvent être chargés à la demande ou par lots différés.

Les identifiants distants stables servent aux upserts. Les URL finales contenant les credentials ne sont jamais persistées dans une API publique : le backend conserve une référence technique et les construit/résout seulement pour une session autorisée.

### 4.3 Portal + MAC

Le formulaire accepte URL du portail, MAC et, en mode avancé, série/Device IDs/signature fournis par l’opérateur. Le backend teste la session et les capacités avant activation.

Le catalogue conserve l’identifiant ou la commande distante, pas le lien final temporaire. À chaque démarrage ou reconnexion, l’adaptateur obtient un lien frais côté serveur. Ce lien ne doit pas être mis en cache comme URL permanente.

Cette intégration sert uniquement aux portails que l’exploitant est autorisé à utiliser. Elle ne doit pas contourner une authentification, inventer une identité d’appareil ou neutraliser une limitation du fournisseur.

### 4.4 Flux direct

Pour HLS/DASH interne, la source référence un manifeste maîtrisé. Le test valide protocole, MIME, codecs, durée de réponse et accessibilité depuis la gateway.

## 5. Pipeline de synchronisation

Chaque exécution suit :

```text
QUEUED -> CONNECTING -> DOWNLOADING -> PARSING -> STAGING
       -> PREVIEW -> APPLYING -> COMPLETED
                        |             |
                    CANCELLED       PARTIAL/FAILED
```

Règles :

- lots limités et upserts idempotents ;
- progression par type et possibilité d’annulation ;
- exclusion des groupes configurés avant publication ;
- aperçu des ajouts, modifications, disparitions et conflits ;
- seuil anti-prune si la source renvoie soudainement un catalogue vide ou très réduit ;
- conservation des favoris, historiques et progressions lors d’un réimport ;
- journal sans secret et avec URL assainies ;
- verrou empêchant deux synchronisations simultanées de la même source.

## 6. Architecture de lecture web

Le double moteur Android d’OwnTV ne peut pas être transposé directement au navigateur. Streamly utilisera trois niveaux :

1. lecture HLS/DASH compatible directement par Shaka Player via une session sécurisée ;
2. transmux/remux dans la gateway pour un conteneur incompatible mais des codecs compatibles ;
3. transcodage FFmpeg contrôlé uniquement si nécessaire, autorisé et dimensionné.

Séquence complète :

1. l’utilisateur demande de lire un contenu interne ;
2. le backend vérifie abonnement, pack, pays, appareil et concurrence ;
3. le routeur classe les variantes par santé, compatibilité, latence, qualité, région et priorité ;
4. l’adaptateur résout la variante choisie côté serveur ;
5. le backend émet un token opaque, court et lié à la session ;
6. la gateway ajoute les credentials/en-têtes fournisseur et réécrit manifestes et segments si nécessaire ;
7. Shaka lit l’URL Streamly, jamais l’URL secrète ;
8. télémétrie et heartbeat pilotent capacité et reprise ;
9. un lien Portal expiré est résolu à nouveau avant un éventuel repli.

### Échelle de repli bornée

Le routeur essaie chaque combinaison une seule fois dans un budget de démarrage : variante principale compatible, format alternatif, puis variante secondaire. Une erreur `401/403`, compte expiré ou limite de connexions n’est pas traitée comme une erreur de codec. Cela évite les boucles et protège les fournisseurs.

## 7. Sécurité indispensable

- autoriser explicitement les hôtes sources et revalider DNS après redirection ;
- bloquer localhost, IP privées, metadata cloud et ports non prévus ;
- chiffrer les secrets avec rotation de clé ;
- masquer credentials dans chemins, query strings, traces et rapports ;
- limiter taille, temps, débit, redirections et connexions par source ;
- ne faire les retries automatiques qu’avant lecture du corps ou sur erreurs transitoires ;
- fermer systématiquement réponses et jobs annulés ;
- appliquer quotas, circuit breaker et limite fournisseur ;
- ne jamais exposer de proxy générique acceptant une URL fournie par le navigateur.

## 8. Décision pour Streamly

OwnTV devient une référence fonctionnelle pour les connecteurs et la robustesse, pas une dépendance copiée. Le **Sprint 3** construit le coffre, les tests et les adaptateurs. Le **Sprint 4** construit le parsing/sync à grande échelle. Le **Sprint 8** réalise la résolution serveur, la gateway et le player. Une application Android TV native pourra plus tard reprendre le principe Media3 + mpv derrière une interface de lecture commune.

## 9. Sources étudiées

- OwnTV : <https://github.com/ahXN00/OwnTV>
- OwnTV Core : <https://github.com/ahXN00/OwnTV_Core>
- Guide utilisateur OwnTV : <https://github.com/ahXN00/OwnTV/blob/main/extras/USER_GUIDE.md>
- Description du player : <https://github.com/ahXN00/OwnTV/blob/main/extras/player.html>

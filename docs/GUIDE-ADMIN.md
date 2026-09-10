# Guide d’utilisation du back-office Streamly

Ce guide accompagne les administrateurs dans l’utilisation de l’interface Streamly. Il décrit uniquement les fonctions actuellement disponibles dans l’interface.

> Utilisez exclusivement des flux, médias et grilles EPG pour lesquels vous disposez des droits de diffusion nécessaires. Ne partagez jamais les identifiants d’une source.

## 1. Accéder au back-office

1. Démarrez l’application web, l’API, PostgreSQL et Redis.
2. Connectez-vous avec un compte disposant d’un rôle administrateur autorisé.
3. Ouvrez `http://localhost:3000/fr/admin`.

Les variantes linguistiques sont également accessibles via `/en/admin` et `/ar/admin`.

Si la page s’affiche mais que les données ne se chargent pas, vérifiez que l’API répond sur `http://localhost:4000/api/v1` et que votre session est encore valide.

## 2. Navigation

La page **Back-office** donne accès à quatre espaces :

| Espace | Utilisation |
|---|---|
| Catalogue | Créer et organiser les films, séries, collections et contenus de l’accueil. |
| Sources IPTV | Ajouter, tester, activer ou suspendre une source. |
| Imports | Prévisualiser les changements d’une source avant de les appliquer. |
| Guide EPG | Importer une grille XMLTV et associer ses chaînes au catalogue. |

Dans une sous-page, utilisez **← Admin home** pour revenir au tableau de bord. La barre secondaire permet de passer directement d’un espace administrateur à un autre.

## 3. Droits d’accès

Les autorisations sont contrôlées par l’API, même si une page est visible dans le navigateur.

| Fonction | CONTENT_MANAGER | TECHNICAL_ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|
| Catalogue éditorial et accueil | Oui | Oui | Oui |
| Sources IPTV | Non | Oui | Oui |
| Imports | Non | Oui | Oui |
| EPG et mappings | Oui | Oui | Oui |
| Création technique de médias | Oui | Non | Oui |

Les rôles `CUSTOMER`, `SUPPORT` et `FINANCE` n’autorisent pas les opérations de ce back-office. Une réponse **401** indique généralement une session absente ou expirée. Une réponse **403** signifie que le compte connecté n’a pas le rôle requis.

## 4. Catalogue et accueil

### Catalogue

Le catalogue réunit les médias et les chaînes. Utilisez la recherche et le filtre de statut, cochez les éléments concernés, puis choisissez une action :

- **Publier médias** : rend visibles les films ou séries sélectionnés.
- **Publier chaînes** : rend visibles les chaînes sélectionnées.
- **Archiver** : retire les éléments de la publication sans les supprimer.
- **Restaurer** : replace les éléments sélectionnés en brouillon.

Vérifiez toujours la sélection avant une action groupée.

### Nouveau film ou série

- **Type** : `MOVIE` pour un film, `SERIES` pour une série.
- **Slug** : identifiant lisible utilisé dans l’URL, par exemple `mon-film-2026`. Utilisez des lettres minuscules, des chiffres et des tirets.
- **Titres FR, EN et AR** : noms affichés selon la langue de l’utilisateur.
- **Année** : année de sortie.
- **Durée** : durée du film en secondes.
- **Poster URL** : image verticale de couverture.
- **Backdrop URL** : grande image horizontale utilisée dans les zones éditoriales.
- **Genres** : catégories éditoriales associées au contenu.

**Créer le brouillon** enregistre le média sans le rendre public. Il doit ensuite être vérifié et publié depuis le catalogue.

### Collections

Une collection est une liste manuelle et ordonnée de médias ou de chaînes, utilisée pour créer une rangée éditoriale. Renseignez un slug, les trois traductions et cochez les contenus dans l’ordre souhaité. La collection est créée en brouillon.

### Accueil

Cette section compose une version de l’accueil pour une langue et un pays :

- **Langue** : `fr`, `en` ou `ar`.
- **Pays** : code ISO à deux lettres, par exemple `FR`, ou `ALL` pour tous les pays.
- **Collection** : collection affichée dans la rangée de l’accueil.

L’enregistrement crée une configuration en brouillon comprenant un hero et une rangée de collection.

## 5. Sources IPTV

### Ajouter une source

Pour une source M3U, deux méthodes sont disponibles : une URL distante ou le téléversement d’un fichier local `.m3u`/`.m3u8` de 10 Mo maximum. Le fichier doit commencer par `#EXTM3U`, contenir au moins une entrée `#EXTINF` et son contenu est conservé chiffré côté serveur.

1. Donnez un nom interne clair à la source.
2. Choisissez son type.
3. Indiquez l’URL de base et les hôtes autorisés.
4. Ajoutez les identifiants uniquement lorsqu’ils sont requis.
5. Choisissez les contenus à synchroniser.
6. Cliquez sur **Enregistrer puis tester**.

Types pris en charge :

| Type | Description | Informations principales |
|---|---|---|
| M3U | Liste de lecture contenant des chaînes ou médias. | URL de base. |
| XTREAM | API compatible Xtream Codes. | URL, utilisateur et mot de passe. |
| PORTAL_MAC | Portail identifié par une adresse MAC. | URL, MAC et éventuellement identité avancée. |
| DIRECT | Référence directe vers une source autorisée. | URL de base. |

### Champs techniques

- **Hôtes autorisés** : domaines que le serveur est autorisé à contacter. Si le champ est vide, l’hôte de l’URL de base est utilisé automatiquement.
- **URL EPG** : adresse facultative de la grille des programmes.
- **User-Agent** : identité HTTP demandée par certains opérateurs.
- **Device ID, Device ID 2, signature et numéro de série** : valeurs fournies par l’opérateur pour certains portails MAC.
- **Live / Movies / Series / EPG** : catégories incluses dans les prochains imports.

Les secrets sont envoyés à l’API et stockés chiffrés. Ils ne doivent néanmoins jamais être copiés dans une capture d’écran, un ticket ou un journal.

### Actions et statuts

- **Tester** vérifie la connexion sans importer de contenu.
- **Activer** autorise les prochains imports. Cette action n’est disponible qu’après un test réussi et un statut `READY`.
- **Désactiver** suspend les nouveaux imports sans supprimer la source ni son historique.

Statuts courants :

| Statut | Signification | Action recommandée |
|---|---|---|
| READY | Source testée et prête. | Activer si la configuration est validée. |
| AUTH_FAILED | Authentification refusée. | Vérifier les identifiants ou la MAC. |
| EXPIRED | Compte fournisseur expiré. | Contacter l’opérateur autorisé. |
| OFFLINE | Source injoignable. | Vérifier l’URL et la disponibilité distante. |
| DEGRADED | Source accessible mais instable. | Retester et examiner la latence ou l’erreur. |
| DISABLED | Source suspendue administrativement. | Réactiver uniquement après vérification. |

## 6. Imports

Seules les sources **activées** et au statut **READY** peuvent lancer un import.

### Procédure recommandée

1. Cliquez sur **Importer** pour la source voulue.
2. Attendez que l’exécution atteigne le statut `PREVIEW`.
3. Ouvrez l’exécution dans la liste.
4. Examinez les compteurs et les changements proposés.
5. Décochez les éléments qui ne doivent pas être appliqués.
6. Cliquez sur **Enregistrer la sélection**.
7. Cliquez sur **Appliquer en brouillon**.
8. Contrôlez les nouveaux éléments dans **Catalogue**, puis publiez-les séparément.

Appliquer un import ne publie pas directement les contenus : les nouvelles chaînes, films et séries sont créés en `DRAFT`.

### Types de changement

| Type | Signification |
|---|---|
| ADD | Nouvel élément détecté. |
| UPDATE | Élément existant modifié dans la source. |
| REMOVE | Élément disparu de la source ; son lien importé sera désactivé si la modification est appliquée. |
| UNCHANGED | Aucun changement détecté. |
| CONFLICT | Plusieurs correspondances sont possibles ; l’élément n’est pas sélectionnable automatiquement. |
| EXCLUDED | Élément ignoré par une règle d’import. |

Une protection automatique désélectionne les suppressions lorsque l’import semble retirer brutalement plus de la moitié d’un catalogue existant important. Vérifiez la source avant toute application dans ce cas.

### Statuts d’exécution

`QUEUED` → `CONNECTING` → `PARSING` → `STAGING` → `PREVIEW` → `APPLYING` → `COMPLETED`

- **PREVIEW** : les différences sont prêtes à être contrôlées.
- **FAILED** : l’import a échoué avant son application.
- **PARTIAL** : une partie seulement des changements a été appliquée.
- **CANCELLED** : l’exécution a été annulée.

## 7. Guide EPG / XMLTV

L’EPG (*Electronic Program Guide*) est la grille horaire des programmes. XMLTV est le format de fichier utilisé pour l’échanger.

1. Copiez l’identifiant interne de la source dans **ID source**.
2. Renseignez une **URL XMLTV autorisée**.
3. Cliquez sur **Importer**.
4. Cliquez sur **Charger les mappings** pour afficher les associations.
5. Pour corriger une association, saisissez l’identifiant de la chaîne cible. La modification est enregistrée lorsque le champ perd le focus.

Un **mapping** associe l’identifiant de chaîne présent dans le XMLTV à la chaîne correspondante du catalogue Streamly. `Non associé` signifie qu’aucune chaîne cible n’est encore définie.

## 8. Glossaire rapide

| Terme | Définition simple |
|---|---|
| API | Service serveur utilisé par l’interface pour lire et modifier les données. |
| Back-office | Interface réservée à l’administration de la plateforme. |
| Brouillon / DRAFT | Donnée enregistrée mais non visible publiquement. |
| Catalogue | Ensemble des chaînes, films et séries connus de Streamly. |
| EPG | Guide électronique des programmes. |
| Hero | Grande mise en avant située en haut de l’accueil. |
| Import | Lecture d’une source externe et préparation de ses changements. |
| Mapping | Association entre deux identifiants représentant la même chaîne. |
| M3U | Format texte de liste de lecture. |
| Publication | Passage d’un contenu vérifié vers l’état visible par les utilisateurs. |
| Rail / rangée | Ligne horizontale de contenus sur l’accueil. |
| Slug | Identifiant lisible et stable utilisé dans une URL. |
| Source | Fournisseur ou point d’entrée technique des contenus. |
| XMLTV | Format XML décrivant une grille de programmes TV. |

## 9. Résolution des problèmes

### « API indisponible »

- Vérifiez que l’API fonctionne sur le port 4000.
- Vérifiez `NEXT_PUBLIC_API_URL` dans l’environnement.
- Contrôlez que PostgreSQL et Redis sont démarrés.

### Les données ne se chargent pas

- Reconnectez-vous pour renouveler la session.
- Vérifiez le rôle du compte.
- Ouvrez les outils développeur du navigateur et contrôlez les réponses 401, 403 ou 500.

### Une source ne peut pas être activée

- Lancez d’abord **Tester**.
- Corrigez l’erreur affichée jusqu’à obtenir le statut `READY`.
- Vérifiez les hôtes autorisés et les identifiants.

### Aucun bouton Importer n’apparaît

La page n’affiche que les sources activées et `READY`. Revenez dans **Sources IPTV**, testez la source puis activez-la.

### Un contenu importé n’est pas visible sur le site

L’import crée les contenus en brouillon. Ouvrez **Catalogue**, contrôlez les métadonnées, sélectionnez le contenu puis publiez-le.

## 10. Checklist avant publication

- Les droits de diffusion et territoires sont confirmés.
- Le titre et les images sont corrects dans les trois langues.
- Le type, l’année, la durée et les genres sont vérifiés.
- La lecture utilise une source testée et autorisée.
- Les associations EPG sont correctes.
- Les retraits et conflits d’import ont été examinés.
- Le contenu a été prévisualisé avant sa publication.

---

Dernière vérification du guide : 9 septembre 2026. Mettez ce document à jour lorsque les rôles, statuts ou écrans du back-office évoluent.

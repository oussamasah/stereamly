# Sprint 8 — Lecture sécurisée

La lecture utilise Shaka Player et une gateway fermée. Le navigateur obtient un token aléatoire de 256 bits valable 15 minutes et une URL Streamly ; il ne reçoit jamais URL fournisseur, credentials Xtream, MAC ou en-têtes privés.

Le routeur classe les variantes selon protocole, priorité, santé, latence et circuit breaker. Les sessions imposent la concurrence, expirent sans heartbeat et enregistrent les événements QoE. La gateway résout les références au dernier moment, valide chaque URL/redirection avec la politique SSRF, relaie les Range requests et réécrit les manifestes HLS avec des jetons de ressources chiffrés.

Les références M3U sont déchiffrées côté serveur. Les URLs Xtream sont construites tardivement. Un portail doit fournir son adaptateur autorisé de renouvellement ; aucun lien Portal temporaire n’est persisté.

Interface : `/[locale]/watch/:type/:id`. API : `/api/v1/playback/sessions/*` et `/api/v1/playback/gateway/*`.

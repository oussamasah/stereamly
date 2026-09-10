# Sprint 5 — Studio éditorial

Le formulaire JSON principal est remplacé par un studio graphique : catalogue filtrable, sélection multiple, publication, archivage, restauration, création de films/séries, genres, images, collections et composition de l’accueil.

Le backend ajoute les collections manuelles ou dynamiques, les éléments ordonnés, les layouts par langue/pays, le hero, les rangées Live/Films/Séries/Top 10/Collection, la publication immédiate ou planifiée et un audit avant/après. L’API média prend aussi en charge casting, personnes, variantes, saisons et épisodes. Les routes éditoriales sont limitées aux rôles Content Manager, Technical Admin et Super Admin.

Routes principales : `/api/v1/admin/editorial/studio`, `/collections`, `/home-layouts`, `/workflow`, `/audit` et `/api/v1/home/:locale/:country`. Interface : `/[locale]/admin/catalog`.

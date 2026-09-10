# Sprint 6 — Expérience publique streaming

L’accueil public consomme les layouts publiés du studio éditorial : hero, collections et rangées horizontales. Un fallback premium reste disponible tant qu’aucun layout n’est publié.

Les sections Live, Films et Séries sont distinctes. Les catalogues disposent de recherche, genre, année et tri. Les cartes affichent image, année, note, qualité et nombre d’épisodes. Les fiches détaillées présentent backdrop, poster, synopsis, genres, casting, durée, classification, saisons et épisodes. Les références secrètes de lecture ne sont jamais renvoyées par ces API.

L’interface est responsive, RTL, navigable au clavier, avec skeletons et fallback d’images. Routes : `/[locale]`, `/movies`, `/series`, `/channels` et leurs fiches par slug.

# ARIA Web v1.5.3 — Démarrage vierge

Cette version isole ARIA du profil Edge normal.

## Au lancement

ARIA ne lit pas :

- `localStorage` ;
- `sessionStorage` ;
- IndexedDB ;
- les anciens PDF locaux ;
- l’ancien historique ;
- les anciennes analyses ;
- les anciennes préférences vocales.

ARIA n’ouvre pas non plus l’ancienne base IndexedDB.

## Conséquence volontaire

Après chaque fermeture complète du navigateur, la session locale repart vide.
Le code d’accès doit être ressaisi et le PDF doit être ajouté à nouveau.

Les données privées déjà présentes dans ARIA Core et BRAIN ne sont pas
supprimées.

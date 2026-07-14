# ARIA Web v1.1.4 — Correction d’affichage et de cache

## Correction principale

Les ressources utilisent maintenant un numéro de version dans leur URL :

```text
style.css?v=1.1.4
config.js?v=1.1.4
sketch.js?v=1.1.4
```

Le navigateur ne peut donc plus combiner un ancien HTML avec un nouveau
JavaScript après une mise à jour GitHub Pages.

## Résultat garanti

Après l’analyse, ARIA force explicitement l’affichage du bloc de résultat.

En cas d’échec, la carte affiche directement :

- le message ;
- l’étape ;
- un code de diagnostic.

Le bouton reste utilisable pour relancer l’analyse.

# ARIA Web v1.1.3 — Progression et diagnostic

## Téléversement

La carte PDF apparaît dès le début de l’upload et affiche :

- le nom du fichier ;
- une barre de progression réelle ;
- le pourcentage réellement envoyé vers Vercel Blob.

## Analyse

La carte documentaire affiche une barre d’avancement par étapes :

1. préparation ;
2. chargement de BRAIN Knowledge ;
3. lecture des pages ;
4. extraction des métadonnées ;
5. validation des codes ;
6. construction du nom.

Cette progression est estimée jusqu’à la réponse finale, car le moteur renvoie
le classement complet en une seule réponse.

## Erreurs

ARIA affiche désormais l’étape technique ayant échoué, par exemple :

```text
Étape : pdf_download
Étape : openai_request
Étape : structured_output
```

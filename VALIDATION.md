# Validation locale — ARIA Web v1.5.0

Tests réalisés avant création de l’archive :

- syntaxe JavaScript de `config.js`, `sketch.js` et `electrical.js` ;
- correspondance de tous les identifiants HTML utilisés par JavaScript ;
- absence d’identifiants HTML dupliqués ;
- conservation des fonctions stables de classement, mémoire et téléchargement ;
- rendu Chromium de la carte avec une préanalyse TDH01 simulée :
  - 13 caractéristiques principales ;
  - 8 comptages ;
  - 10 contrôles de validation ;
  - propositions de métadonnées ;
- test Chromium du choix des propositions fiables ;
- test Chromium de l’enregistrement avec réponses Core simulées ;
- contrôle de l’absence de secret dans l’archive.

La préanalyse d’un PDF réel doit être validée après le déploiement d’ARIA Core
v0.12.0.

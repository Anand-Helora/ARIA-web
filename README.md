# ARIA Web — v0.2.0

Interface publique de démonstration d’ARIA.

## Nouveautés

- conversation sous forme de messages ;
- historique local dans le navigateur ;
- dictée vocale avec gestion des erreurs ;
- partage d’écran avec aperçu strictement local ;
- mode local de démonstration ;
- préparation d’un futur appel à un backend sécurisé.

## Sécurité

Ne jamais placer de clé API, mot de passe ou jeton secret dans `config.js`, `sketch.js` ou tout autre fichier de ce dépôt public.

Le mode `remote` ne devra être activé qu’après création d’un backend HTTPS sécurisé. Le navigateur appellera ce backend, et le backend conservera les secrets côté serveur.

## Publication

Les cinq fichiers doivent se trouver directement à la racine du dépôt GitHub Pages :

- `index.html`
- `style.css`
- `sketch.js`
- `config.js`
- `README.md`

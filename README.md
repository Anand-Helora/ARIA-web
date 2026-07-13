# ARIA Web v0.3.0

Interface publique d’ARIA reliée à **ARIA Core** sur Vercel.

## Déploiement

Téléverser à la racine du dépôt GitHub Pages :

- `index.html`
- `style.css`
- `config.js`
- `sketch.js`

## Connexion

Au premier démarrage, cliquer sur **Se connecter** puis saisir la valeur
`ARIA_ACCESS_TOKEN` enregistrée dans Vercel.

Le code est conservé dans `sessionStorage` uniquement :

- il n’est jamais écrit dans GitHub ;
- il n’est pas conservé dans l’historique de conversation ;
- il disparaît à la fermeture de la session du navigateur.

## Backend

Endpoint configuré :

`https://aria-core-kappa.vercel.app/api/chat`

## Confidentialité actuelle

- la conversation est mémorisée localement dans le navigateur ;
- les messages sont envoyés à ARIA Core puis à l’API OpenAI ;
- le partage d’écran reste local et n’est pas encore analysé ;
- aucune clé OpenAI n’est présente dans le dépôt public.

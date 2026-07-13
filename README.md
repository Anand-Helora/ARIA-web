# ARIA Web v0.6.0

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


## Signature

Le pied de page affiche discrètement :

`Créé par Reckem Anand`

La signature est intégrée dans l’interface publique et reste responsive sur téléphone,
tablette et ordinateur.


## Affichage de la discussion

L’utilisateur peut masquer ou réafficher la conversation textuelle avec le bouton
`Masquer la discussion`.

- l’historique n’est pas supprimé ;
- les nouveaux échanges continuent d’être mémorisés ;
- le choix d’affichage est conservé localement sur l’appareil ;
- cette fonction prépare l’interface à un futur mode vocal uniquement.


## Interface épurée après connexion

Lorsque `ARIA_ACCESS_TOKEN` est actif dans la session :

- le grand panneau d’état est masqué ;
- le panneau `ARIA Core` est masqué ;
- le bouton compact `Moteur connecté` reste visible dans l’en-tête ;
- ce bouton permet de se déconnecter ;
- les deux grands panneaux réapparaissent automatiquement après déconnexion.

Cette adaptation prépare l’interface au futur fonctionnement vocal uniquement.


## Mode vocal v0.6

Après connexion à ARIA Core, l’interface affiche un grand bouton central :

1. appuyer pour démarrer l’écoute ;
2. parler naturellement ;
3. appuyer de nouveau pour envoyer immédiatement, ou marquer une pause ;
4. ARIA répond par texte et lit automatiquement sa réponse.

Fonctions incluses :

- interruption immédiate de la lecture vocale ;
- état visuel `écoute`, `réflexion` et `réponse` ;
- sélection d’une voix française disponible dans le navigateur ;
- réglage de la vitesse ;
- activation ou désactivation de la lecture automatique ;
- clavier masqué par défaut, mais accessible ;
- conversation masquée par défaut sur un nouvel appareil ;
- aucune conservation de fichier audio par ARIA Web.

La qualité et la disponibilité des voix dépendent du navigateur et du système d’exploitation.

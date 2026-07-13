# ARIA Web v0.7.3 — Saisie en bas de conversation

Cette version permet à ARIA de proposer une information durable à mémoriser.

## Fonctionnement

Après une réponse, ARIA peut afficher une carte :

- titre de la mémoire ;
- synthèse proposée ;
- catégorie ;
- raison de la proposition ;
- boutons `Mémoriser` et `Ignorer`.

Aucune information n’est enregistrée sans validation explicite.

## Commandes vocales

Lorsqu’une proposition est affichée, Anand peut dire :

- `mémorise`
- `retiens-le`
- `ajoute à BRAIN`
- `ignore`
- `ne retiens pas`

## Consultation

Le bouton compact `BRAIN` dans l’en-tête permet de :

- consulter les mémoires validées ;
- actualiser la liste ;
- supprimer une mémoire.

## Stockage

Les mémoires sont stockées dans un Vercel Blob privé par ARIA Core.

Le dépôt public ARIA Web ne contient aucun souvenir, aucune clé API et aucun
identifiant de stockage.


## Correctifs v0.7.1

- La zone de saisie texte est de nouveau visible par défaut après connexion.
- Le bouton `Masquer le clavier` permet toujours de passer en mode vocal uniquement.
- Une nouvelle clé de préférence locale évite de conserver l’ancien état masqué.
- La carte indique clairement si le stockage BRAIN Vercel n’est pas détecté.
- Les phrases explicites comme `Mémorise que…` déclenchent systématiquement une proposition.


## Correctif clavier v0.7.2

- La zone de saisie est déplacée directement sous le mode vocal.
- Elle n’est plus placée sous l’historique de conversation.
- Elle est visible même avant la connexion.
- Elle est automatiquement réaffichée après chaque connexion.
- Un bouton permanent `Clavier affiché / Afficher le clavier` est ajouté dans l’en-tête.
- Le bouton `Masquer le clavier` du mode vocal reste disponible.


## Placement de la saisie v0.7.3

L’ordre de l’interface conversationnelle devient :

1. historique de la discussion ;
2. proposition BRAIN éventuelle ;
3. zone de saisie et bouton Envoyer.

La zone texte reste accessible par le bouton `Clavier` de l’en-tête et par le
bouton du mode vocal. Lorsqu’elle est réaffichée, la page revient
automatiquement vers la zone de saisie.

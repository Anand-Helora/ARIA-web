# ARIA Web v0.7.1 — Mémoire assistée corrigée

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

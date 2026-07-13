# ARIA Web v0.7.0 — Mémoire assistée

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

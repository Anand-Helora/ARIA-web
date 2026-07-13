# ARIA Web v0.8.0 — Vision contrôlée et voix activable

## Réponses vocales

Les réponses audio sont désormais désactivées par défaut.

Le bouton de l’en-tête permet de basculer entre :

- `Voix désactivée`
- `Voix activée`

Le microphone reste utilisable pour dicter ou parler à ARIA, même lorsque la
lecture audio est désactivée.

La préférence est mémorisée localement sur l’appareil.

## Analyse d’image

Deux méthodes sont disponibles :

1. `Ajouter une image` : JPEG, PNG ou WebP ;
2. `Joindre l’écran partagé` : capture ponctuelle de l’aperçu local.

Avant l’envoi, ARIA Web affiche :

- une miniature ;
- le nom ;
- la provenance ;
- les dimensions ;
- la taille compressée ;
- un bouton `Retirer`.

## Confidentialité

- aucune capture continue ;
- l’écran partagé reste local ;
- seule la capture explicitement jointe est envoyée ;
- l’image est envoyée uniquement avec le prochain message ;
- l’image n’est pas mémorisée dans BRAIN ;
- après l’envoi, la pièce jointe est retirée de l’interface.

## Compression

ARIA Web convertit localement les images en JPEG et limite leur résolution et
leur taille avant envoi à ARIA Core.

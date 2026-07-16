# ARIA Web v1.5.2 — Démarrage sécurisé

## Cause corrigée

ARIA pouvait restaurer automatiquement un PDF complet depuis IndexedDB à
chaque réouverture. La reconstruction d’un gros objet `File` et la création
immédiate de son URL `blob:` pouvaient bloquer le processus Edge.

## Nouveau démarrage

```text
Réouverture d’ARIA
→ restauration des métadonnées
→ restauration du classement et des corrections
→ aucun octet PDF chargé
→ page immédiatement utilisable
```

Le PDF source est demandé uniquement lorsque le téléchargement en a besoin.

## Mémoire conservée

- analyse documentaire ;
- corrections humaines ;
- nom proposé ;
- préanalyse électrique ;
- décisions enregistrées.

## Mémoire volontairement non persistée

- octets du PDF local.

Le PDF original reste disponible sur l’ordinateur et peut être réassocié par un
sélecteur natif.

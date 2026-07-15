# ARIA Web v1.3.7 — Téléchargement local et cartes synchronisées

## Téléchargement

Le PDF sélectionné est maintenant conservé en mémoire dans le navigateur
pendant la session.

```text
Ajouter le PDF
→ analyser
→ corriger
→ Télécharger la copie renommée
```

Le téléchargement utilise directement le fichier local et modifie uniquement
le nom de la copie. Aucun appel ARIA Core n’est nécessaire.

Après une actualisation de la page, le navigateur ne peut pas restaurer un
objet `File`. ARIA demande alors de sélectionner de nouveau le PDF source. Ce
fichier n’est pas téléversé une seconde fois : il sert uniquement à créer la
copie locale.

## Synchronisation des cartes

Après une analyse ou l’enregistrement de corrections, ARIA actualise :

- le titre compact ;
- le résumé compact ;
- le nom proposé ;
- la carte du PDF actif ;
- le statut de validation ;
- le libellé du bouton de téléchargement.

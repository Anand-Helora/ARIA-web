# ARIA Web v1.4.1 — Stabilisation documentaire

Base : ARIA Web v1.4.0, conservée comme version stable.

## Ajouts

- bouton `Nouveau document` ;
- confirmation avant retrait de la fiche active ;
- état visible du PDF local :
  - disponible ;
  - restauration en cours ;
  - à réassocier ;
  - absent ;
- comparaison du nom original et du nom final ;
- checklist du parcours en cinq étapes ;
- diagnostic intégré copiable ;
- référence copiable pour chaque erreur ;
- bouton de relance de la restauration locale ;
- persistance des métadonnées dans `localStorage` ;
- restauration du PDF depuis `IndexedDB` ;
- correction : réinitialiser l’analyse ne supprime plus le PDF local.

## Checklist

```text
PDF analysé
Métadonnées complètes
Corrections mémorisées
Nom validé
PDF disponible au téléchargement
```

## Sécurité

- aucune clé OpenAI dans ARIA Web ;
- le PDF local reste dans le navigateur ;
- le PDF original n’est jamais renommé ni supprimé ;
- le bouton `Nouveau document` demande une confirmation.

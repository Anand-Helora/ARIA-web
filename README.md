# ARIA Web v1.3.8 — Enregistrer sous et cartes actualisées

## Bug du PDF local corrigé

Lorsqu’un ancien PDF était déjà actif, ARIA enregistrait la nouvelle référence
locale puis supprimait l’ancien document. Cette suppression effaçait également
la nouvelle référence locale.

L’ordre est maintenant :

```text
supprimer l’ancien PDF
→ conserver le nouveau fichier local
→ téléverser le nouveau PDF
```

## Enregistrement

Lorsque le PDF local est disponible, le bouton affiche :

```text
Enregistrer sous…
```

Sur Edge/Chrome, ARIA utilise la fenêtre native du navigateur pour choisir
l’emplacement et le nom du fichier.

Un bouton local `Enregistrer le PDF` reste disponible comme solution de secours.

## Synchronisation des cartes

Après l’enregistrement des corrections, ARIA remplace directement :

- `document_category.code` ;
- `document_category.label` ;
- `summary` ;
- `metadata` ;
- le nom proposé ;
- le nom de la carte PDF ;
- le statut de la carte PDF.

Les cartes sont ensuite rendues deux fois sur deux cycles d’affichage et une
brève bordure confirme visuellement leur actualisation.

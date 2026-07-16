# ARIA Web v1.4.0 — corrections autoritaires et PDF restauré

## Diagnostic confirmé par la console

L’état réel montrait :

```text
filename_complete = false
type_document = vide
PDF local = absent
lien = masqué
bouton d’association = masqué
```

## Corrections

- une réponse ARIA Core vide ne peut plus effacer une valeur saisie ;
- les valeurs soumises sont la source autoritaire ;
- la carte est actualisée même si le nom reste incomplet ;
- si ARIA Core échoue, les corrections restent enregistrées localement avec un avertissement visible ;
- le bouton `Associer le PDF source` reste visible lorsque le fichier local manque ;
- le PDF local est conservé dans IndexedDB après son ajout ou sa réassociation ;
- lors d’un prochain rechargement, ARIA tente de restaurer automatiquement ce PDF local ;
- le lien direct apparaît dès que le PDF local et toutes les métadonnées sont disponibles.

# ARIA Web v1.3.0 — Knowledge Manager et carte éditable

## Knowledge Manager

Dans `BRAIN → Connaissances`, ARIA permet maintenant de gérer :

- les types de documents ;
- les disciplines ;
- les techniques ;
- les alias ;
- l’état actif ou inactif.

Le cycle est :

```text
Modification locale
→ Enregistrer le brouillon
→ Publier les changements
```

Une publication devient immédiatement disponible dans le classificateur et
dans les combobox. Aucun nouveau ZIP ARIA Core n’est requis pour ces opérations.

## Carte documentaire

Après l’analyse, la carte reste compacte :

```text
[Éditer] [Copier le nom] [Télécharger] [Relancer] [Retirer]
```

Au clic sur `Éditer`, la carte passe en mode formulaire et présélectionne toutes
les valeurs détectées.

Les champs `Type`, `Discipline` et `Technique` utilisent des combobox. Le bouton
`+` ouvre directement le Knowledge Manager avec le code courant prérempli.

## Nomenclature

```text
Phase_Pôle_Site_Bloc_Étage_Numéro_Type_Discipline_Technique#Indice_Date_Description
```

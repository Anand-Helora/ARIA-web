# ARIA Web v1.5.0 — Electrical Analyst

Base conservée : ARIA Web v1.4.1.

Le classement, le renommage, la mémorisation des corrections et le
téléchargement local restent inchangés.

## Utilisation

1. ajouter un PDF ;
2. lancer l’analyse et le classement documentaire ;
3. ouvrir la carte `Préanalyse électrique` ;
4. lancer l’analyse approfondie ;
5. examiner les valeurs, comptages, preuves, contradictions et points à
   vérifier ;
6. accepter, corriger ou ignorer les propositions ;
7. sélectionner les valeurs techniques à mémoriser ;
8. cliquer sur `Enregistrer les décisions`.

## Contenu de la carte

- identification et caractéristiques du tableau ;
- configuration Normal / Normal secours / UPS-ASI ;
- comptage des protections, disjoncteurs, départs et réserves ;
- calibres, câbles, tableaux aval et circuits remarquables ;
- propositions pour les métadonnées manquantes ;
- confiance, preuves, contradictions et origine de chaque valeur ;
- état de la mémoire d’apprentissage.

## Validation humaine

Le bouton `Accepter les propositions fiables` sélectionne les propositions dont
la confiance atteint au moins 85 %, mais aucune valeur n’est enregistrée sans le
clic final de l’utilisateur.

Le remplissage automatique est volontairement désactivé dans cette version.
Les validations serviront à mesurer les futures règles fiables.

## Déploiement

Déployer d’abord ARIA Core v0.12.0, vérifier `/api/health`, puis publier les
fichiers de cette archive dans le dépôt `ARIA-web`.

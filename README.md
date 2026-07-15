# ARIA Web v1.3.3 — Téléchargement direct

## Nouveau parcours

Le navigateur ne récupère plus le PDF privé avec `fetch()` pour fabriquer un
objet local.

ARIA Web demande au Core une copie temporaire portant le nom validé, puis lance
son téléchargement direct à l’aide d’un lien privé signé.

## Résultat

- meilleure compatibilité avec Edge et les navigateurs mobiles ;
- aucun changement du PDF original ;
- nom officiel conservé ;
- pas de popup ;
- pas de nouvel onglet ;
- message visible lorsque le téléchargement est lancé.

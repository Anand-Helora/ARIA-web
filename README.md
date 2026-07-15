# ARIA Web v1.3.5 — Téléchargement explicite

## Causes corrigées

- le lien manuel avait été inséré dans la fenêtre BRAIN au lieu de la carte ;
- le navigateur pouvait ignorer une navigation déclenchée automatiquement
  après une requête asynchrone.

## Nouveau parcours

```text
Préparer le téléchargement
→ lien sécurisé reçu
→ panneau visible dans la carte
→ Télécharger maintenant
```

Le second clic est un geste utilisateur direct.

Le lien ouvre la route ARIA Core dans un nouvel onglet. Si le serveur renvoie
une erreur, son message reste visible dans cet onglet sans fermer ARIA.

Aucune mise à jour ARIA Core n’est nécessaire.

# ARIA Web v1.3.6 — PDF reçu avant enregistrement

## Parcours

```text
Préparer le fichier
→ téléchargement authentifié depuis ARIA Core
→ progression réelle
→ contrôle du type et de la taille du fichier
→ création d’une URL locale blob:
→ Enregistrer le PDF
```

Le bouton final ne contacte aucun serveur. Il enregistre un fichier déjà reçu
dans le navigateur.

Cette version n’utilise ni iframe, ni nouvel onglet, ni ticket dans l’URL, ni
URL Vercel Blob côté navigateur.

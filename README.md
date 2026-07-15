# ARIA Core v0.11.2 — Téléchargement PDF en flux

## Cause corrigée

La version précédente utilisait une iframe invisible pour ouvrir une URL Blob.
Vercel Blob bloque volontairement l’intégration dans une iframe avec
`X-Frame-Options: DENY`.

## Nouveau parcours

1. ARIA Web demande un ticket de téléchargement valable cinq minutes.
2. Le navigateur ouvre `/api/pdf?ticket=...`.
3. ARIA Core vérifie la signature du ticket.
4. ARIA Core récupère le PDF privé avec `get()`.
5. Le fichier est transmis en flux avec :

```text
Content-Type: application/pdf
Content-Disposition: attachment
Cache-Control: private, no-store
```

Le nom validé est imposé par l’en-tête HTTP. Le PDF original reste inchangé.

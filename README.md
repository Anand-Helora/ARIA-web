# ARIA Web v1.3.9 — Lien direct et commit des cartes

## Téléchargement

Le contrôle principal est un véritable lien HTML `a download` relié à une URL
locale `blob:`. Le clic utilisateur agit directement sur le fichier, sans
fonction JavaScript de téléchargement, fenêtre native ou nouvel onglet.

Après une actualisation de page, `Associer le PDF source` recrée le lien local.

## Cartes

L'enregistrement utilise un commit centralisé qui actualise les données
primaires, le titre, le résumé, le nom proposé, la carte PDF et le lien de
téléchargement. Une confirmation visible indique l'heure et la révision.

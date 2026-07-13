# ARIA Web v0.9.0 — PDF privé temporaire

## Ajouter un PDF

Le bouton `Ajouter un PDF` accepte un seul document de 45 Mo maximum.

ARIA vérifie localement :

- l’extension `.pdf` ;
- la taille ;
- la signature `%PDF-`.

Le navigateur demande ensuite une URL d’upload temporaire à ARIA Core et
envoie directement le fichier vers Vercel Blob privé.

## Session documentaire

Le PDF reste actif pour plusieurs questions successives.

La carte affiche :

- le nom ;
- la taille ;
- le statut privé ;
- le bouton `Retirer et supprimer`.

Le document est supprimé lors :

- du retrait ;
- du remplacement par un autre PDF ;
- de l’ajout d’une image ;
- de la réinitialisation d’ARIA.

Les fichiers abandonnés sont nettoyés après 24 heures lors d’un nouvel upload.

## Confidentialité

- aucune URL privée durable dans GitHub ;
- aucun PDF dans localStorage ;
- seule la référence temporaire est conservée dans sessionStorage ;
- aucun contenu du PDF n’est ajouté automatiquement à BRAIN ;
- les réponses OpenAI sont demandées avec `store: false`.

## Limites initiales

- un PDF actif ;
- pas de PDF protégé par mot de passe ;
- 45 Mo maximum ;
- analyse `detail: auto`.

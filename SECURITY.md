# Sécurité ARIA Core

- La clé OpenAI reste dans les variables d’environnement Vercel.
- Le code d’accès ARIA reste dans les variables d’environnement Vercel.
- BRAIN ne doit contenir aucun mot de passe, jeton, clé API ou donnée médicale nominative.
- La mémoire est volontairement en lecture seule pour ARIA v0.4.
- Toute modification de BRAIN passe par une validation et un commit GitHub.


- Les fichiers audio générés sont renvoyés sans mise en cache.
- Le texte vocal est limité à 4096 caractères.
- La voix OpenAI est générée uniquement après authentification ARIA.


- La mémoire permanente utilise un Vercel Blob privé.
- Une proposition doit être validée explicitement avant stockage.
- Les secrets évidents, clés, jetons et données bancaires sont rejetés.
- Chaque mémoire est stockée dans un fichier JSON distinct pour éviter les conflits d’écriture.


- En mode Vercel OIDC, ARIA Core ne lit ni ne journalise le jeton OIDC.
- Le SDK `@vercel/blob` récupère automatiquement le jeton temporaire depuis
  le contexte d’exécution Vercel.


- Les captures d’écran ne sont jamais envoyées automatiquement.
- Une image doit être explicitement jointe à la prochaine demande.
- Les images sont limitées à JPEG, PNG ou WebP et environ 2 Mo.
- Les images ne sont ni mémorisées dans BRAIN ni stockées dans Vercel Blob.
- ARIA ne doit pas identifier les personnes visibles ni déduire leurs attributs sensibles.


## PDF privés temporaires

- Les uploads passent par des URL PUT signées et limitées à `application/pdf`.
- La taille maximale est limitée côté navigateur et côté URL signée.
- Les chemins sont aléatoires et confinés au préfixe `aria-temp/pdfs/`.
- Les lectures OpenAI utilisent une URL GET privée à durée limitée.
- Aucun PDF n’est ajouté automatiquement à BRAIN.
- Le document est supprimé lors du retrait, du remplacement ou de la réinitialisation.
- Les documents abandonnés depuis plus de 24 heures sont nettoyés opportunément.


## Classement documentaire

- L’endpoint `/api/document` exige le même jeton privé ARIA.
- Seuls les PDF temporaires du préfixe autorisé peuvent être analysés.
- Les sorties OpenAI sont contraintes par un JSON Schema strict.
- Le nom proposé est construit côté serveur après normalisation.
- Les valeurs absentes restent vides et génèrent des marqueurs explicites.
- Aucun classement n’est mémorisé automatiquement dans BRAIN.


## BRAIN Knowledge

- Les paquets sont envoyés directement vers Vercel Blob avec une URL PUT signée.
- Aucun jeton Blob à long terme n’est transmis au navigateur.
- Les imports temporaires utilisent le préfixe `aria-temp/knowledge-imports/`.
- Les archives sont contrôlées contre les chemins interdits et les ZIP bombs.
- Les empreintes SHA-256 des modules sont comparées au manifest.
- Seuls les paquets actifs, validés et sans problème non résolu sont activables.
- Les versions sont immuables par numéro de version et empreinte.
- Le pointeur actif est mis à jour après la publication complète des modules.
- Une ancienne version reste disponible pour retour arrière.
- Les référentiels officiels priment sur les souvenirs conversationnels.

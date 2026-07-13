"use strict";

/**
 * Configuration publique de l'interface ARIA.
 * Ne place jamais de clé API, mot de passe ou jeton secret dans ce fichier :
 * il est publié avec GitHub Pages et peut être lu par tout le monde.
 */
window.ARIA_CONFIG = Object.freeze({
  version: "0.2.0",
  mode: "local", // "local" ou "remote"
  apiUrl: "", // Plus tard : URL HTTPS d'un backend sécurisé, sans secret dans le navigateur.
  requestTimeoutMs: 30000,
  maxHistoryMessages: 20,
  localStorageKey: "aria.web.conversation.v0.2"
});

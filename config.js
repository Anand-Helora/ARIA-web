"use strict";

/**
 * Configuration PUBLIQUE d'ARIA Web.
 * Ne jamais placer de clé OpenAI, de mot de passe ou de secret dans ce fichier.
 */
window.ARIA_CONFIG = Object.freeze({
  version: "0.3.0",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  requestTimeoutMs: 45000,
  maxHistoryMessages: 20,
  localStorageKey: "aria.web.conversation.v0.3",
  sessionTokenKey: "aria.web.access-token.session.v0.3"
});

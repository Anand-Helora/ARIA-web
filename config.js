"use strict";

/**
 * Configuration PUBLIQUE d'ARIA Web.
 * Ne jamais placer de clé OpenAI, de mot de passe ou de secret dans ce fichier.
 */
window.ARIA_CONFIG = Object.freeze({
  version: "0.8.1",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  speechApiUrl: "https://aria-core-kappa.vercel.app/api/speech",
  memoryApiUrl: "https://aria-core-kappa.vercel.app/api/memory",
  requestTimeoutMs: 45000,
  speechRequestTimeoutMs: 45000,
  memoryRequestTimeoutMs: 30000,
  maxHistoryMessages: 20,
  maxImageDimension: 1440,
  maxImageDataUrlChars: 2500000,
  imageJpegQuality: 0.78,
  localStorageKey: "aria.web.conversation.v0.3",
  sessionTokenKey: "aria.web.access-token.session.v0.3",
  conversationVisibilityKey: "aria.web.conversation-visible.v0.6",
  textInputVisibilityKey: "aria.web.text-input-visible.v0.7.2",
  autoSpeakKey: "aria.web.voice-output-enabled.v0.8",
  speechRateKey: "aria.web.speech-rate.v0.6",
  speechVoiceKey: "aria.web.speech-voice.v0.6.1"
});

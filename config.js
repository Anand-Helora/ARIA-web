"use strict";

/**
 * Configuration PUBLIQUE d'ARIA Web.
 * Ne jamais placer de clé OpenAI, de mot de passe ou de secret dans ce fichier.
 */
window.ARIA_CONFIG = Object.freeze({
  version: "1.10.0",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  speechApiUrl: "https://aria-core-kappa.vercel.app/api/speech",
  memoryApiUrl: "https://aria-core-kappa.vercel.app/api/memory",
  pdfApiUrl: "https://aria-core-kappa.vercel.app/api/pdf",
  documentApiUrl: "https://aria-core-kappa.vercel.app/api/document",
  electricalApiUrl: "https://aria-core-kappa.vercel.app/api/electrical",
  roomsApiUrl: "https://aria-core-kappa.vercel.app/api/rooms",
  knowledgeApiUrl: "https://aria-core-kappa.vercel.app/api/knowledge",
  requestTimeoutMs: 180000,
  speechRequestTimeoutMs: 45000,
  memoryRequestTimeoutMs: 30000,
  pdfRequestTimeoutMs: 30000,
  pdfUploadTimeoutMs: 300000,
  documentRequestTimeoutMs: 180000,
  electricalRequestTimeoutMs: 210000,
  roomsRequestTimeoutMs: 210000,
  features: Object.freeze({
    electricalAnalyst: false,
    roomIntelligence: true
  }),
  restoreLocalPdfOnStartup: false,
  cleanBootMode: true,
  restoreBrowserStateOnStartup: false,
  autoLoadKnowledgeOnStartup: false,
  reduceMotionOnStartup: true,
  cacheLocalPdfBytes: false,
  knowledgeRequestTimeoutMs: 120000,
  knowledgeUploadTimeoutMs: 300000,
  maxHistoryMessages: 20,
  maxImageDimension: 1440,
  maxImageDataUrlChars: 2500000,
  imageJpegQuality: 0.78,
  maxPdfBytes: 47185920,
  maxKnowledgePackageBytes: 10485760,
  localStorageKey: "aria.web.clean.v1.5.3.conversation",
  sessionTokenKey: "aria.web.clean.v1.5.3.access-token.session",
  conversationVisibilityKey: "aria.web.clean.v1.5.3.conversation-visible",
  textInputVisibilityKey: "aria.web.clean.v1.5.3.text-input-visible",
  autoSpeakKey: "aria.web.clean.v1.5.3.voice-output-enabled",
  pdfSessionKey: "aria.web.clean.v1.5.3.pending-pdf.session",
  pdfPersistentKey: "aria.web.clean.v1.5.3.pending-pdf.persistent",
  documentAnalysisSessionKey: "aria.web.clean.v1.5.3.document-analysis.session",
  documentAnalysisPersistentKey: "aria.web.clean.v1.5.3.document-analysis.persistent",
  electricalAnalysisSessionKey: "aria.web.clean.v1.5.3.electrical-analysis.session",
  electricalAnalysisPersistentKey: "aria.web.clean.v1.5.3.electrical-analysis.persistent",
  speechRateKey: "aria.web.clean.v1.5.3.speech-rate",
  speechVoiceKey: "aria.web.clean.v1.10.0.speech-voice",
  roomAnalysisSessionKey: "aria.web.clean.v1.10.0.room-analysis.session"
});

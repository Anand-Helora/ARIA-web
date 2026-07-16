"use strict";

/**
 * Configuration PUBLIQUE d'ARIA Web.
 * Ne jamais placer de clé OpenAI, de mot de passe ou de secret dans ce fichier.
 */
window.ARIA_CONFIG = Object.freeze({
  version: "1.5.0",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  speechApiUrl: "https://aria-core-kappa.vercel.app/api/speech",
  memoryApiUrl: "https://aria-core-kappa.vercel.app/api/memory",
  pdfApiUrl: "https://aria-core-kappa.vercel.app/api/pdf",
  documentApiUrl: "https://aria-core-kappa.vercel.app/api/document",
  electricalApiUrl: "https://aria-core-kappa.vercel.app/api/electrical",
  knowledgeApiUrl: "https://aria-core-kappa.vercel.app/api/knowledge",
  requestTimeoutMs: 180000,
  speechRequestTimeoutMs: 45000,
  memoryRequestTimeoutMs: 30000,
  pdfRequestTimeoutMs: 30000,
  pdfUploadTimeoutMs: 300000,
  documentRequestTimeoutMs: 180000,
  electricalRequestTimeoutMs: 210000,
  knowledgeRequestTimeoutMs: 120000,
  knowledgeUploadTimeoutMs: 300000,
  maxHistoryMessages: 20,
  maxImageDimension: 1440,
  maxImageDataUrlChars: 2500000,
  imageJpegQuality: 0.78,
  maxPdfBytes: 47185920,
  maxKnowledgePackageBytes: 10485760,
  localStorageKey: "aria.web.conversation.v0.3",
  sessionTokenKey: "aria.web.access-token.session.v0.3",
  conversationVisibilityKey: "aria.web.conversation-visible.v0.6",
  textInputVisibilityKey: "aria.web.text-input-visible.v0.7.2",
  autoSpeakKey: "aria.web.voice-output-enabled.v0.8",
  pdfSessionKey: "aria.web.pending-pdf.session.v0.9",
  pdfPersistentKey: "aria.web.pending-pdf.persistent.v1.4.1",
  documentAnalysisSessionKey: "aria.web.document-analysis.session.v1.0",
  documentAnalysisPersistentKey: "aria.web.document-analysis.persistent.v1.4.1",
  electricalAnalysisSessionKey: "aria.web.electrical-analysis.session.v1.5.0",
  electricalAnalysisPersistentKey: "aria.web.electrical-analysis.persistent.v1.5.0",
  speechRateKey: "aria.web.speech-rate.v0.6",
  speechVoiceKey: "aria.web.speech-voice.v0.6.1"
});

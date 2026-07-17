"use strict";

const config = window.ARIA_CONFIG || {
  version: "1.11.0",
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
  electricalRequestTimeoutMs: 270000,
  roomsRequestTimeoutMs: 210000,
  features: { electricalAnalyst: false, roomIntelligence: true },
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
  documentAnalysisSessionKey: "aria.web.document-analysis.session.v1.2",
  electricalAnalysisSessionKey: "aria.web.electrical-analysis.session.v1.5.0",
  electricalAnalysisPersistentKey: "aria.web.electrical-analysis.persistent.v1.5.0",
  speechRateKey: "aria.web.speech-rate.v0.6",
  speechVoiceKey: "aria.web.speech-voice.v0.6.1"
};

const ariaState = {
  mode: "idle",
  message: "ARIA est prête.",
  detail: "Connecte-toi au moteur privé pour commencer.",
  stream: null,
  recognition: null,
  isListening: false,
  isBusy: false,
  history: [],
  accessToken: "",
  isConversationVisible: false,
  isTextInputVisible: true,
  recognitionMode: null,
  voiceTranscript: "",
  recognitionFailed: false,
  speechSupported: false,
  isSpeaking: false,
  speechQueue: [],
  currentUtterance: null,
  remoteAudio: null,
  remoteAudioUrl: "",
  speechRequestController: null,
  autoSpeak: false,
  speechRate: 1,
  preferredVoiceName: "openai:coral",
  pendingImage: null,
  imageBusy: false,
  pendingPdf: null,
  pendingPdfLocalFile: null,
  pendingPdfLocalFileValidated: false,
  pdfBusy: false,
  pdfUploadName: "",
  pdfUploadProgress: 0,
  documentAnalysis: null,
  documentAnalysisBusy: false,
  documentAnalysisProgress: 0,
  documentAnalysisStage: "",
  documentAnalysisProgressTimer: null,
  documentAnalysisError: null,
  documentAnalysisDiagnostics: null,
  documentEditorReferences: null,
  documentEditorMetadata: null,
  documentEditorSiteId: "",
  documentEditorBusy: false,
  documentEditorLoadBusy: false,
  documentEditorNormalizationTimer: null,
  documentDownloadBusy: false,
  documentDownloadUrl: "",
  documentDownloadFilename: "",
  documentDownloadObjectUrl: "",
  documentDownloadSourceKey: "",
  documentDownloadProgress: 0,
  documentCardCommitRevision: 0,
  documentCardCommittedAt: "",
  documentSaveSource: "",
  documentSaveWarning: "",
  lastDiagnosticCode: "",
  lastDiagnosticMessage: "",
  lastDiagnosticDetail: "",
  lastDiagnosticAt: "",
  newDocumentBusy: false,
  localPdfRestoreBusy: false,
  localPdfRestoreError: "",
  documentDownloadFallbackTimer: null,
  documentEditMode: false,
  documentEditSnapshot: null,
  documentEditorDirty: false,
  pendingMemory: null,
  savedMemories: [],
  memoryBusy: false,
  memoryStorageConfigured: null,
  brainActiveTab: "memory",
  knowledgeStatus: null,
  knowledgeVersions: [],
  knowledgePreview: null,
  knowledgeBusy: false,
  knowledgeUploadProgress: 0,
  knowledgeManager: null,
  knowledgeManagerData: null,
  knowledgeManagerTab: "documentTypes",
  knowledgeManagerSearch: "",
  knowledgeManagerEditing: null,
  knowledgeManagerDirty: false,
  knowledgeManagerBusy: false,
  electricalModuleLoaded: false,
  electricalModuleLoading: false,
  electricalModuleInitialized: false,
  electricalModuleError: "",
  electricalBootstrapBusy: false,
  roomModuleLoaded: false,
  roomModuleLoading: false,
  roomModuleInitialized: false,
  roomModuleError: "",
  roomBootstrapBusy: false,
  roomAnalysis: null,
  roomAnalysisBusy: false,
  roomVoiceCaptureHandler: null
};

const stateVisuals = {
  idle: { speed: 0.018, amplitude: 10 },
  listening: { speed: 0.04, amplitude: 18 },
  observing: { speed: 0.06, amplitude: 24 },
  thinking: { speed: 0.09, amplitude: 30 },
  speaking: { speed: 0.055, amplitude: 21 },
  error: { speed: 0.025, amplitude: 7 }
};

let phase = 0;
let domReady = false;

function setup() {
  const stage = document.getElementById("visual-stage");
  if (!stage) return;

  const maxWidth = Math.min(420, Math.max(260, window.innerWidth - 36));
  const canvas = createCanvas(maxWidth, Math.round(maxWidth * 0.72));
  canvas.parent("visual-stage");
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  noFill();
  strokeCap(ROUND);
  document.body.classList.add("p5-ready");

  if (
    config.cleanBootMode === true &&
    config.reduceMotionOnStartup === true &&
    typeof noLoop === "function"
  ) {
    window.requestAnimationFrame(() => {
      redraw();
      noLoop();
    });
  }
}

function draw() {
  const visual = stateVisuals[ariaState.mode] || stateVisuals.idle;
  clear();
  phase += visual.speed;
  translate(width / 2, height / 2);
  drawAmbientRings(visual);
  drawCore();
}

function drawAmbientRings(visual) {
  for (let index = 0; index < 5; index += 1) {
    const pulse = sin(phase + index * 0.7) * visual.amplitude;
    const diameter = 135 + index * 27 + pulse;
    const alpha = 48 - index * 6;
    stroke(96, 215, 232, alpha);
    strokeWeight(1.2);
    ellipse(0, 0, diameter, diameter);
  }
}

function drawCore() {
  const pulse = sin(phase * 1.4) * 8;
  const diameter = 94 + pulse;
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = "rgba(96, 215, 232, 0.65)";
  stroke(140, 235, 244, 210);
  strokeWeight(2.2);
  ellipse(0, 0, diameter, diameter);
  drawingContext.shadowBlur = 0;
  stroke(238, 246, 248, 170);
  strokeWeight(1);
  arc(0, 0, diameter + 24, diameter + 24, phase, phase + PI * 1.25);
}

function windowResized() {
  if (typeof resizeCanvas !== "function") return;
  const maxWidth = Math.min(420, Math.max(260, window.innerWidth - 36));
  resizeCanvas(maxWidth, Math.round(maxWidth * 0.72));
}

function initializeInterface() {
  if (domReady) return;
  domReady = true;

  getElement("send-button").addEventListener("click", handleCommand);
  getElement("command-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCommand();
    }
  });

  getElement("voice-button").addEventListener("click", toggleVoiceRecognition);
  getElement("voice-main-button").addEventListener("click", handleMainVoiceButton);
  getElement("stop-speech-button").addEventListener("click", cancelSpeech);
  getElement("text-mode-button").addEventListener("click", toggleTextInputVisibility);
  getElement("auto-speak-toggle").addEventListener("change", saveVoiceSettings);
  getElement("speech-rate-select").addEventListener("change", saveVoiceSettings);
  getElement("speech-voice-select").addEventListener("change", saveVoiceSettings);
  getElement("share-button").addEventListener("click", startScreenShare);
  getElement("stop-button").addEventListener("click", () => stopScreenShare(true));
  getElement("voice-output-indicator").addEventListener("click", toggleVoiceOutput);
  getElement("add-image-button").addEventListener("click", () => {
    if (!ariaState.accessToken) {
      setState(
        "idle",
        "Connexion requise.",
        "Connecte ARIA Core avant d’ajouter une pièce jointe."
      );
      openAccessDialog();
      return;
    }
    getElement("image-file-input").click();
  });
  getElement("image-file-input").addEventListener(
    "change",
    handleImageFileSelection
  );
  getElement("add-pdf-button").addEventListener("click", () => {
    if (!ariaState.accessToken) {
      setState(
        "idle",
        "Connexion requise.",
        "Connecte ARIA Core avant d’ajouter un PDF."
      );
      openAccessDialog();
      return;
    }
    getElement("pdf-file-input").click();
  });
  getElement("pdf-file-input").addEventListener(
    "change",
    handlePdfFileSelection
  );
  getElement("pdf-download-source-input").addEventListener(
    "change",
    handleDownloadPdfSourceSelection
  );
  getElement("remove-pdf-button").addEventListener(
    "click",
    () => discardPendingPdf(true)
  );
  getElement("new-document-button").addEventListener(
    "click",
    startNewDocument
  );
  getElement("copy-document-diagnostics").addEventListener(
    "click",
    copyDocumentDiagnostics
  );
  getElement("retry-local-pdf-restore").addEventListener(
    "click",
    retryLocalPdfRestore
  );
  getElement("copy-status-diagnostic").addEventListener(
    "click",
    copyLastDiagnosticCode
  );
  getElement("classify-pdf-button").addEventListener(
    "click",
    classifyPendingPdf
  );
  getElement("run-electrical-analysis-button").addEventListener(
    "click",
    handleElectricalBootstrapRun
  );
  getElement("run-room-analysis-button").addEventListener(
    "click",
    handleRoomBootstrapRun
  );
  getElement("copy-document-filename-button").addEventListener(
    "click",
    copySuggestedDocumentFilename
  );
  getElement("download-renamed-pdf-button").addEventListener(
    "click",
    requestLocalPdfSource
  );
  getElement("download-renamed-pdf-link").addEventListener(
    "click",
    () => {
      setState(
        "idle",
        "Téléchargement demandé.",
        "Le clic agit directement sur la copie locale portant le nom validé."
      );
    }
  );
  getElement("document-download-fallback").addEventListener(
    "click",
    () => {
      setState(
        "idle",
        "Téléchargement de secours demandé.",
        "Le navigateur enregistre la copie locale portant le nom validé."
      );
    }
  );
  getElement("document-metadata-editor").addEventListener(
    "input",
    handleDocumentEditorInput
  );
  getElement("document-metadata-editor").addEventListener(
    "change",
    handleDocumentEditorInput
  );
  getElement("capture-screen-button").addEventListener(
    "click",
    captureSharedScreen
  );
  getElement("remove-image-button").addEventListener(
    "click",
    () => clearPendingImage(true)
  );
  getElement("reset-button").addEventListener("click", resetAriaState);
  getElement("clear-button").addEventListener("click", clearConversation);
  getElement("toggle-conversation-button").addEventListener("click", toggleConversationVisibility);
  getElement("show-conversation-button").addEventListener("click", () => setConversationVisibility(true));
  getElement("connect-button").addEventListener("click", handleConnectionButton);
  getElement("connection-indicator").addEventListener("click", handleConnectionButton);
  getElement("brain-indicator").addEventListener("click", openBrainDialog);
  getElement("keyboard-indicator").addEventListener("click", toggleTextInputVisibility);
  getElement("approve-memory-button").addEventListener("click", approvePendingMemory);
  getElement("dismiss-memory-button").addEventListener("click", dismissPendingMemory);
  getElement("brain-dialog-close").addEventListener("click", closeBrainDialog);
  getElement("brain-dialog-done").addEventListener("click", closeBrainDialog);
  getElement("refresh-brain-button").addEventListener("click", loadBrainMemories);
  getElement("brain-memory-tab").addEventListener(
    "click",
    () => setBrainTab("memory")
  );
  getElement("brain-knowledge-tab").addEventListener(
    "click",
    () => setBrainTab("knowledge")
  );
  getElement("refresh-knowledge-button").addEventListener(
    "click",
    loadKnowledgeStatus
  );
  getElement("import-knowledge-button").addEventListener(
    "click",
    openKnowledgePackagePicker
  );
  getElement("knowledge-package-input").addEventListener(
    "change",
    handleKnowledgePackageSelection
  );
  getElement("activate-knowledge-button").addEventListener(
    "click",
    activateKnowledgePreview
  );
  getElement("cancel-knowledge-preview-button").addEventListener(
    "click",
    clearKnowledgePreview
  );
  getElement("knowledge-manager-types-tab").addEventListener(
    "click",
    () => setKnowledgeManagerTab("documentTypes")
  );
  getElement("knowledge-manager-disciplines-tab").addEventListener(
    "click",
    () => setKnowledgeManagerTab("disciplines")
  );
  getElement("knowledge-manager-techniques-tab").addEventListener(
    "click",
    () => setKnowledgeManagerTab("techniques")
  );
  getElement("knowledge-manager-search").addEventListener(
    "input",
    (event) => {
      ariaState.knowledgeManagerSearch =
        event.target.value || "";
      renderKnowledgeManager();
    }
  );
  getElement("knowledge-manager-add-button").addEventListener(
    "click",
    () => openKnowledgeManagerForm()
  );
  getElement("knowledge-manager-form").addEventListener(
    "submit",
    saveKnowledgeManagerForm
  );
  getElement("knowledge-manager-form-close").addEventListener(
    "click",
    closeKnowledgeManagerForm
  );
  getElement("knowledge-manager-form-cancel").addEventListener(
    "click",
    closeKnowledgeManagerForm
  );
  getElement("knowledge-manager-save-draft").addEventListener(
    "click",
    saveKnowledgeManagerDraft
  );
  getElement("knowledge-manager-publish").addEventListener(
    "click",
    publishKnowledgeManager
  );
  getElement("knowledge-manager-discard").addEventListener(
    "click",
    discardKnowledgeManagerDraft
  );
  getElement("edit-document-button").addEventListener(
    "click",
    startDocumentEditMode
  );
  getElement("document-edit-save").addEventListener(
    "click",
    () => finishDocumentEditMode(false)
  );
  getElement("document-edit-save-download").addEventListener(
    "click",
    () => finishDocumentEditMode(true)
  );
  getElement("document-edit-cancel").addEventListener(
    "click",
    cancelDocumentEditMode
  );
  for (
    const button
    of document.querySelectorAll(
      ".document-add-reference"
    )
  ) {
    button.addEventListener(
      "click",
      () =>
        openKnowledgeManagerFromDocument(
          button.dataset.referenceKind
        )
    );
  }

  getElement("access-form").addEventListener("submit", saveAccessToken);
  getElement("dialog-close").addEventListener("click", closeAccessDialog);
  getElement("cancel-access").addEventListener("click", closeAccessDialog);
  getElement("toggle-token").addEventListener("click", toggleTokenVisibility);

  // DÉMARRAGE VIERGE v1.5.3
  // Aucune lecture de localStorage, sessionStorage ou IndexedDB.
  ariaState.accessToken = "";
  ariaState.history = [];
  ariaState.pendingPdf = null;
  ariaState.pendingPdfLocalFile = null;
  ariaState.pendingPdfLocalFileValidated = false;
  ariaState.documentAnalysis = null;
  ariaState.documentEditorMetadata = null;
  ariaState.documentEditorSiteId = "";
  ariaState.pendingMemory = null;
  ariaState.savedMemories = [];
  ariaState.electricalModuleLoaded = false;
  ariaState.electricalModuleLoading = false;
  ariaState.electricalModuleInitialized = false;
  ariaState.electricalModuleError = "";
  ariaState.electricalBootstrapBusy = false;

  ariaState.isConversationVisible = false;
  ariaState.isTextInputVisible = true;
  ariaState.autoSpeak = false;
  ariaState.speechRate = 1;
  ariaState.preferredVoiceName = "openai:coral";

  const autoSpeakToggle =
    document.getElementById("auto-speak-toggle");
  const speechRateSelect =
    document.getElementById("speech-rate-select");
  const speechVoiceSelect =
    document.getElementById("speech-voice-select");

  if (autoSpeakToggle) {
    autoSpeakToggle.checked = false;
  }
  if (speechRateSelect) {
    speechRateSelect.value = "1";
  }
  if (speechVoiceSelect) {
    speechVoiceSelect.value = "openai:coral";
  }

  initializeVoiceRecognition();
  initializeSpeechSynthesis();
  updateInterface();
  updateConnectionIndicator();

  setState(
    "idle",
    "ARIA est prête en démarrage vierge.",
    "Connecte ARIA Core. Les anciennes données du navigateur ne sont pas lues."
  );

  getElement("command-input").focus();
}

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément d'interface introuvable : #${id}`);
  return element;
}

function updateElectricalBootstrapInterface() {
  if (!domReady) return;

  const card =
    document.getElementById(
      "electrical-analysis-card"
    );
  const runButton =
    document.getElementById(
      "run-electrical-analysis-button"
    );
  const empty =
    document.getElementById(
      "electrical-analysis-empty"
    );

  if (
    !card ||
    !runButton ||
    !empty
  ) {
    return;
  }

  const documentReady =
    Boolean(
      ariaState.pendingPdf &&
      ariaState.documentAnalysis
    );

  card.hidden =
    !documentReady;

  if (!documentReady) {
    return;
  }

  if (
    ariaState.electricalModuleLoaded &&
    typeof updateElectricalAnalystInterface ===
      "function"
  ) {
    updateElectricalAnalystInterface();
    return;
  }

  empty.hidden = false;
  runButton.disabled =
    ariaState.electricalModuleLoading ||
    ariaState.electricalBootstrapBusy ||
    ariaState.documentAnalysisBusy;

  if (
    ariaState.electricalModuleLoading
  ) {
    runButton.textContent =
      "Chargement du module électrique…";
  } else if (
    ariaState.electricalModuleError
  ) {
    runButton.textContent =
      "Réessayer le chargement du module";
  } else {
    runButton.textContent =
      "Lancer la préanalyse électrique";
  }
}


function updateRoomBootstrapInterface() {
  const card = document.getElementById("room-intelligence-card");
  const empty = document.getElementById("room-analysis-empty");
  const runButton = document.getElementById("run-room-analysis-button");

  if (!card || !empty || !runButton) return;

  const featureEnabled =
    config.features?.roomIntelligence !== false;

  card.hidden =
    !featureEnabled ||
    !ariaState.pendingPdf ||
    !ariaState.documentAnalysis;

  if (card.hidden) return;

  if (
    ariaState.roomModuleLoaded &&
    typeof updateRoomIntelligenceInterface === "function"
  ) {
    updateRoomIntelligenceInterface();
    return;
  }

  empty.hidden = false;
  runButton.disabled =
    ariaState.roomModuleLoading ||
    ariaState.roomBootstrapBusy ||
    ariaState.documentAnalysisBusy;

  if (ariaState.roomModuleLoading) {
    runButton.textContent = "Chargement du module Listing Elements…";
  } else if (ariaState.roomModuleError) {
    runButton.textContent = "Réessayer le chargement";
  } else {
    runButton.textContent = "Analyser les locaux";
  }
}

function loadRoomModule() {
  if (
    ariaState.roomModuleLoaded &&
    typeof runRoomAnalysis === "function"
  ) {
    return Promise.resolve();
  }

  if (window.__ariaRoomModulePromise) {
    return window.__ariaRoomModulePromise;
  }

  ariaState.roomModuleLoading = true;
  ariaState.roomModuleError = "";
  updateRoomBootstrapInterface();

  window.__ariaRoomModulePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `rooms.js?v=${encodeURIComponent(
      config.version || "1.11.0"
    )}`;
    script.async = true;
    script.dataset.ariaRoomModule = "true";

    script.addEventListener("load", () => {
      try {
        if (
          typeof initializeRoomIntelligence !== "function" ||
          typeof runRoomAnalysis !== "function"
        ) {
          throw new Error(
            "Le module Listing Elements ne fournit pas les fonctions attendues."
          );
        }

        if (!ariaState.roomModuleInitialized) {
          initializeRoomIntelligence();
          ariaState.roomModuleInitialized = true;
        }

        ariaState.roomModuleLoaded = true;
        ariaState.roomModuleLoading = false;
        ariaState.roomModuleError = "";
        updateRoomBootstrapInterface();
        resolve();
      } catch (error) {
        ariaState.roomModuleLoading = false;
        ariaState.roomModuleError = getReadableError(error);
        window.__ariaRoomModulePromise = null;
        updateRoomBootstrapInterface();
        reject(error);
      }
    }, { once: true });

    script.addEventListener("error", () => {
      const error = new Error(
        "Le fichier rooms.js n’a pas pu être chargé."
      );
      ariaState.roomModuleLoading = false;
      ariaState.roomModuleError = error.message;
      window.__ariaRoomModulePromise = null;
      updateRoomBootstrapInterface();
      reject(error);
    }, { once: true });

    document.body.append(script);
  });

  return window.__ariaRoomModulePromise;
}

async function handleRoomBootstrapRun(event) {
  event?.preventDefault();
  event?.stopImmediatePropagation();

  if (ariaState.roomBootstrapBusy) return;

  if (!ariaState.pendingPdf || !ariaState.documentAnalysis) {
    setState(
      "error",
      "Classement initial requis.",
      "Analyse et classe d’abord le PDF."
    );
    return;
  }

  ariaState.roomBootstrapBusy = true;
  updateRoomBootstrapInterface();

  try {
    await loadRoomModule();
    await runRoomAnalysis();
  } catch (error) {
    console.error("Room module loading failed:", error);
    setState(
      "error",
      "Le module Listing Elements n’a pas pu démarrer.",
      getReadableError(error)
    );
  } finally {
    ariaState.roomBootstrapBusy = false;
    updateRoomBootstrapInterface();
  }
}

function loadElectricalModule() {
  if (
    ariaState.electricalModuleLoaded &&
    typeof runElectricalAnalysis ===
      "function"
  ) {
    return Promise.resolve();
  }

  if (
    window.__ariaElectricalModulePromise
  ) {
    return window.__ariaElectricalModulePromise;
  }

  ariaState.electricalModuleLoading =
    true;
  ariaState.electricalModuleError =
    "";
  updateElectricalBootstrapInterface();

  window.__ariaElectricalModulePromise =
    new Promise(
      (resolve, reject) => {
        const script =
          document.createElement(
            "script"
          );

        script.src =
          `electrical.js?v=${encodeURIComponent(
            config.version ||
            "1.5.1"
          )}`;
        script.async = true;
        script.dataset
          .ariaElectricalModule =
          "true";

        script.addEventListener(
          "load",
          () => {
            try {
              if (
                typeof initializeElectricalAnalyst !==
                  "function" ||
                typeof runElectricalAnalysis !==
                  "function"
              ) {
                throw new Error(
                  "Le module électrique ne fournit pas les fonctions attendues."
                );
              }

              if (
                !ariaState
                  .electricalModuleInitialized
              ) {
                initializeElectricalAnalyst();
                ariaState
                  .electricalModuleInitialized =
                  true;
              }

              ariaState
                .electricalModuleLoaded =
                true;
              ariaState
                .electricalModuleLoading =
                false;
              ariaState
                .electricalModuleError =
                "";

              updateElectricalBootstrapInterface();
              resolve();
            } catch (error) {
              ariaState
                .electricalModuleLoading =
                false;
              ariaState
                .electricalModuleError =
                getReadableError(error);
              window
                .__ariaElectricalModulePromise =
                null;
              updateElectricalBootstrapInterface();
              reject(error);
            }
          },
          {
            once: true
          }
        );

        script.addEventListener(
          "error",
          () => {
            const error =
              new Error(
                "Le fichier electrical.js n’a pas pu être chargé."
              );

            ariaState
              .electricalModuleLoading =
              false;
            ariaState
              .electricalModuleError =
              error.message;
            window
              .__ariaElectricalModulePromise =
              null;
            updateElectricalBootstrapInterface();
            reject(error);
          },
          {
            once: true
          }
        );

        document.body.append(
          script
        );
      }
    );

  return window
    .__ariaElectricalModulePromise;
}

async function handleElectricalBootstrapRun(
  event
) {
  event?.preventDefault();
  event?.stopImmediatePropagation();

  if (
    ariaState.electricalBootstrapBusy
  ) {
    return;
  }

  if (
    !ariaState.pendingPdf ||
    !ariaState.documentAnalysis
  ) {
    setState(
      "error",
      "Classement initial requis.",
      "Analyse et classe d’abord le PDF."
    );
    return;
  }

  ariaState.electricalBootstrapBusy =
    true;
  updateElectricalBootstrapInterface();

  try {
    await loadElectricalModule();
    await runElectricalAnalysis();
  } catch (error) {
    console.error(
      "Electrical module loading failed:",
      error
    );

    setState(
      "error",
      "Electrical Analyst n’a pas pu démarrer.",
      getReadableError(error)
    );
  } finally {
    ariaState.electricalBootstrapBusy =
      false;
    updateElectricalBootstrapInterface();
  }
}

async function handleCommand(options = {}) {
  if (ariaState.isBusy) return;

  const source = options.source === "voice" ? "voice" : "text";
  const input = getElement("command-input");
  const imageToSend = ariaState.pendingImage;
  const pdfToSend = ariaState.pendingPdf;

  if (imageToSend && pdfToSend) {
    setState(
      "error",
      "Deux pièces jointes actives.",
      "Retire l’image ou le PDF avant l’envoi."
    );
    return;
  }

  const command =
    input.value.trim() ||
    (
      pdfToSend
        ? "Analyse ce PDF. Résume son contenu, relève les informations importantes, signale les points incertains et propose les prochaines actions utiles."
        : imageToSend
          ? "Analyse précisément l’image jointe. Décris ce qui est visible, relève les éléments importants et signale les détails incertains."
          : ""
    );

  if (!command) {
    setState(
      "error",
      "Instruction vide.",
      "Écris, dicte ou joins une image ou un PDF avant de l’envoyer."
    );
    if (ariaState.isTextInputVisible) input.focus();
    return;
  }

  if (!ariaState.accessToken) {
    setState("idle", "Connexion requise.", "Saisis ton code d’accès ARIA Core.");
    openAccessDialog();
    return;
  }

  input.value = "";
  ariaState.voiceTranscript = "";

  const displayedCommand = pdfToSend
    ? `${command}\n\n📄 PDF actif : ${pdfToSend.name}`
    : imageToSend
      ? `${command}\n\n📎 Image jointe : ${imageToSend.name}`
      : command;

  addMessage("user", displayedCommand, true);

  if (imageToSend) {
    clearPendingImage(false);
  }

  setBusy(true);
  setState("thinking", "ARIA réfléchit…", "La demande est transmise à ARIA Core.");
  const typingId = addTypingMessage();
  let answerToSpeak = "";

  try {
    const result = await requestRemoteAria(imageToSend, pdfToSend);
    removeMessageElement(typingId);
    addMessage("assistant", result.answer, true);
    ariaState.memoryStorageConfigured =
      result.memoryStorageConfigured;
    setPendingMemory(result.memoryProposal);
    answerToSpeak = result.memoryProposal
      ? `${result.answer} Cette information semble utile pour BRAIN. Dis mémorise ou ignore, ou utilise les boutons affichés.`
      : result.answer;
    setState("idle", "Réponse terminée.", "Le moteur privé ARIA Core est connecté.");

    if (ariaState.isTextInputVisible) {
      window.requestAnimationFrame(() => {
        getElement("command-panel").scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      });
    }
  } catch (error) {
    console.error("ARIA request failed:", error);
    removeMessageElement(typingId);

    if (imageToSend && !ariaState.pendingImage) {
      ariaState.pendingImage = imageToSend;
      updateImageAttachmentInterface();
    }

    if (error.status === 401) {
      clearAccessToken();
      addMessage("error", "Le code d’accès ARIA est invalide ou a été modifié.", false);
      setState("error", "Connexion refusée.", "Reconnecte-toi avec la valeur ARIA_ACCESS_TOKEN de Vercel.");
      openAccessDialog();
    } else {
      addMessage("error", getReadableError(error), false);
      setState("error", "Erreur de traitement.", getReadableError(error));
    }
  } finally {
    setBusy(false);
    if (ariaState.isTextInputVisible && source !== "voice") {
      input.focus();
    }
  }

  if (answerToSpeak && ariaState.autoSpeak) {
    speakText(answerToSpeak);
  }
}

async function requestRemoteAria(image = null, pdf = null) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.requestTimeoutMs) || 180000
  );

  const messages = ariaState.history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-(Number(config.maxHistoryMessages) || 20))
    .map(({ role, content }) => ({ role, content }));

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ariaState.accessToken}`
      },
      body: JSON.stringify({
        messages,
        image: image
          ? {
              dataUrl: image.dataUrl,
              mimeType: image.mimeType,
              name: image.name,
              source: image.source
            }
          : null,
        pdf: pdf
          ? {
              pathname: pdf.pathname,
              name: pdf.name,
              size: pdf.size,
              detail: pdf.detail || "auto"
            }
          : null,
        client: {
          name: "ARIA-web",
          version: config.version || "1.5.3"
        }
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : `ARIA Core a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      error.requestId = data.requestId || null;
      throw error;
    }

    const answer = typeof data.answer === "string" ? data.answer.trim() : "";
    if (!answer) {
      throw new Error("ARIA Core n’a renvoyé aucune réponse exploitable.");
    }

    return {
      answer,
      memoryProposal:
        data.memoryProposal &&
        typeof data.memoryProposal === "object"
          ? data.memoryProposal
          : null,
      memoryStorageConfigured:
        typeof data.brain?.storageConfigured === "boolean"
          ? data.brain.storageConfigured
          : null
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function handleConnectionButton() {
  if (ariaState.accessToken) {
    const confirmed = window.confirm(
      "Déconnecter ARIA Core pour cette session de navigateur ?"
    );
    if (confirmed) {
      clearAccessToken();
      setState("idle", "ARIA est déconnectée.", "Le code d’accès de session a été supprimé.");
    }
    return;
  }

  openAccessDialog();
}

function openAccessDialog() {
  const dialog = getElement("access-dialog");
  const tokenInput = getElement("access-token");
  tokenInput.value = "";

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    window.setTimeout(() => tokenInput.focus(), 30);
  } else {
    const token = window.prompt("Saisis le code ARIA_ACCESS_TOKEN :");
    if (token && token.trim()) {
      setAccessToken(token.trim());
      setState("idle", "ARIA Core est connecté.", "Le code est conservé uniquement pour cette session.");
    }
  }
}

function closeAccessDialog() {
  const dialog = getElement("access-dialog");
  if (dialog.open) dialog.close();
  getElement("access-token").value = "";
  getElement("access-token").type = "password";
  getElement("toggle-token").textContent = "Afficher";
}

function saveAccessToken(event) {
  event.preventDefault();
  const token = getElement("access-token").value.trim();

  if (token.length < 12) {
    setState("error", "Code d’accès trop court.", "Vérifie la valeur ARIA_ACCESS_TOKEN enregistrée dans Vercel.");
    return;
  }

  setAccessToken(token);
  closeAccessDialog();
  setState("idle", "ARIA Core est connecté.", "Envoie une instruction pour vérifier la connexion au modèle.");
  getElement("command-input").focus();
}

function setAccessToken(token) {
  ariaState.accessToken = token;

  try {
    sessionStorage.setItem(config.sessionTokenKey, token);
  } catch (error) {
    console.warn("Session storage unavailable:", error);
  }

  // Après chaque connexion, rendre la saisie texte immédiatement visible.
  ariaState.isTextInputVisible = true;

  try {
    localStorage.setItem(
      config.textInputVisibilityKey,
      "true"
    );
  } catch (error) {
    console.warn("Unable to persist keyboard visibility:", error);
  }

  updateConnectionIndicator();
  updateTextInputVisibility();

  loadKnowledgeStatus().catch((error) => {
    console.warn(
      "Chargement initial de BRAIN Knowledge impossible.",
      error
    );
  });
}

function loadAccessToken() {
  try {
    ariaState.accessToken = sessionStorage.getItem(config.sessionTokenKey) || "";
  } catch (error) {
    console.warn("Unable to restore access token:", error);
    ariaState.accessToken = "";
  }
}

function clearAccessToken() {
  if (ariaState.isListening && ariaState.recognition) {
    try {
      ariaState.recognition.abort();
    } catch {}
  }
  cancelSpeech(false);
  ariaState.pendingMemory = null;
  ariaState.savedMemories = [];
  ariaState.memoryStorageConfigured = null;
  ariaState.knowledgeStatus = null;
  ariaState.knowledgeVersions = [];
  ariaState.knowledgePreview = null;
  ariaState.knowledgeBusy = false;
  updateMemoryProposalCard();
  updateKnowledgeInterface();
  ariaState.accessToken = "";
  try {
    sessionStorage.removeItem(config.sessionTokenKey);
  } catch (error) {
    console.warn("Unable to clear access token:", error);
  }
  updateConnectionIndicator();
}

function toggleTokenVisibility() {
  const input = getElement("access-token");
  const button = getElement("toggle-token");
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  button.textContent = isPassword ? "Masquer" : "Afficher";
}


function loadConversationVisibility() {
  try {
    const storedValue = localStorage.getItem(config.conversationVisibilityKey);

    if (storedValue === null) {
      ariaState.isConversationVisible = false;
      return;
    }

    ariaState.isConversationVisible = storedValue === "true";
  } catch (error) {
    console.warn("Unable to restore conversation visibility:", error);
    ariaState.isConversationVisible = false;
  }
}

function toggleConversationVisibility() {
  setConversationVisibility(!ariaState.isConversationVisible);
}

function setConversationVisibility(isVisible) {
  ariaState.isConversationVisible = Boolean(isVisible);

  try {
    localStorage.setItem(
      config.conversationVisibilityKey,
      String(ariaState.isConversationVisible)
    );
  } catch (error) {
    console.warn("Unable to save conversation visibility:", error);
  }

  updateConversationVisibility();
}

function updateConversationVisibility() {
  if (!domReady) return;

  const isVisible = ariaState.isConversationVisible;
  const conversationBody = getElement("conversation-body");
  const hiddenCard = getElement("conversation-hidden-card");
  const toggleButton = getElement("toggle-conversation-button");

  conversationBody.hidden = !isVisible;
  hiddenCard.hidden = isVisible;

  toggleButton.textContent = isVisible
    ? "Masquer la discussion"
    : "Afficher la discussion";

  toggleButton.setAttribute("aria-expanded", String(isVisible));

  if (isVisible) {
    scrollConversationToBottom();
  }
}


function loadTextInputVisibility() {
  try {
    const storedValue = localStorage.getItem(config.textInputVisibilityKey);
    ariaState.isTextInputVisible =
      storedValue === null ? true : storedValue === "true";
  } catch (error) {
    console.warn("Unable to restore text input visibility:", error);
    ariaState.isTextInputVisible = true;
  }
}

function toggleTextInputVisibility() {
  setTextInputVisibility(!ariaState.isTextInputVisible);
}

function setTextInputVisibility(isVisible) {
  ariaState.isTextInputVisible = Boolean(isVisible);

  try {
    localStorage.setItem(
      config.textInputVisibilityKey,
      String(ariaState.isTextInputVisible)
    );
  } catch (error) {
    console.warn("Unable to save text input visibility:", error);
  }

  updateTextInputVisibility();
}

function updateTextInputVisibility() {
  if (!domReady) return;

  const panel = getElement("command-panel");
  const voiceButton = getElement("text-mode-button");
  const headerButton = getElement("keyboard-indicator");
  const isVisible = ariaState.isTextInputVisible;

  panel.hidden = !isVisible;

  voiceButton.textContent = isVisible
    ? "Masquer le clavier"
    : "Afficher le clavier";
  voiceButton.setAttribute(
    "aria-pressed",
    String(isVisible)
  );

  headerButton.textContent = isVisible
    ? "Clavier affiché"
    : "Afficher le clavier";
  headerButton.classList.toggle("connected", isVisible);
  headerButton.setAttribute(
    "aria-pressed",
    String(isVisible)
  );
  headerButton.title = isVisible
    ? "Cliquer pour masquer la zone de saisie"
    : "Cliquer pour afficher la zone de saisie";

  if (isVisible && document.activeElement !== getElement("command-input")) {
    window.requestAnimationFrame(() => {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }
}



function setBrainTab(tabName) {
  const tab =
    tabName === "knowledge"
      ? "knowledge"
      : "memory";

  ariaState.brainActiveTab = tab;

  const memoryTab =
    getElement("brain-memory-tab");
  const knowledgeTab =
    getElement("brain-knowledge-tab");
  const memoryPanel =
    getElement("brain-memory-panel");
  const knowledgePanel =
    getElement("brain-knowledge-panel");

  const memoryActive =
    tab === "memory";

  memoryTab.classList.toggle(
    "active",
    memoryActive
  );
  memoryTab.setAttribute(
    "aria-selected",
    String(memoryActive)
  );
  knowledgeTab.classList.toggle(
    "active",
    !memoryActive
  );
  knowledgeTab.setAttribute(
    "aria-selected",
    String(!memoryActive)
  );

  memoryPanel.hidden =
    !memoryActive;
  knowledgePanel.hidden =
    memoryActive;
}

async function knowledgeApiRequest(
  method,
  body = null
) {
  const controller =
    new AbortController();
  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      Number(
        config.knowledgeRequestTimeoutMs
      ) || 120000
    );

  try {
    const response = await fetch(
      config.knowledgeApiUrl,
      {
        method,
        headers: {
          "Content-Type":
            "application/json",
          "Authorization":
            `Bearer ${ariaState.accessToken}`
        },
        body:
          body
            ? JSON.stringify(body)
            : undefined,
        signal:
          controller.signal
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const validationErrors =
        Array.isArray(
          data?.validation?.errors
        )
          ? ` ${data.validation.errors.join(" ")}`
          : "";

      const error = new Error(
        (
          typeof data.error ===
            "string" &&
          data.error.trim()
            ? data.error
            : `BRAIN Knowledge a répondu avec le statut ${response.status}.`
        ) + validationErrors
      );

      error.status =
        response.status;
      error.validation =
        data.validation || null;
      throw error;
    }

    return data;
  } finally {
    window.clearTimeout(
      timeoutId
    );
  }
}

function isZipSignature(bytes) {
  if (
    !bytes ||
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b
  ) {
    return false;
  }

  return (
    (
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    ) ||
    (
      bytes[2] === 0x05 &&
      bytes[3] === 0x06
    ) ||
    (
      bytes[2] === 0x07 &&
      bytes[3] === 0x08
    )
  );
}

async function readZipSignature(
  file
) {
  const buffer = await file
    .slice(0, 4)
    .arrayBuffer();

  return new Uint8Array(
    buffer
  );
}

function uploadKnowledgePackage(
  file,
  uploadUrl,
  onProgress
) {
  return new Promise(
    (resolve, reject) => {
      const request =
        new XMLHttpRequest();

      request.open(
        "PUT",
        uploadUrl,
        true
      );
      request.timeout =
        Number(
          config.knowledgeUploadTimeoutMs
        ) || 300000;
      request.setRequestHeader(
        "Content-Type",
        "application/zip"
      );

      request.upload.addEventListener(
        "progress",
        (event) => {
          if (
            !event.lengthComputable
          ) {
            return;
          }

          const percent =
            Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (
                    event.loaded /
                    event.total
                  ) * 100
                )
              )
            );

          onProgress(percent);
        }
      );

      request.addEventListener(
        "load",
        () => {
          if (
            request.status >= 200 &&
            request.status < 300
          ) {
            onProgress(100);
            resolve();
            return;
          }

          reject(
            new Error(
              `Le stockage privé a refusé le paquet (${request.status}).`
            )
          );
        }
      );

      request.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "La connexion au stockage privé BRAIN Knowledge a échoué."
            )
          );
        }
      );

      request.addEventListener(
        "timeout",
        () => {
          reject(
            new Error(
              "Le téléversement du paquet Knowledge a dépassé le délai autorisé."
            )
          );
        }
      );

      request.send(file);
    }
  );
}

function openKnowledgePackagePicker() {
  if (!ariaState.accessToken) {
    openAccessDialog();
    return;
  }

  if (ariaState.knowledgeBusy) {
    return;
  }

  getElement(
    "knowledge-package-input"
  ).click();
}

function setKnowledgeUploadProgress(
  percent,
  title =
    "Téléversement sécurisé"
) {
  const normalized =
    Math.max(
      0,
      Math.min(
        100,
        Number(percent) || 0
      )
    );

  ariaState.knowledgeUploadProgress =
    normalized;

  const container =
    getElement(
      "knowledge-upload-progress"
    );
  container.hidden =
    !ariaState.knowledgeBusy;

  getElement(
    "knowledge-upload-title"
  ).textContent = title;
  getElement(
    "knowledge-upload-percent"
  ).textContent =
    `${Math.round(normalized)} %`;
  getElement(
    "knowledge-upload-bar"
  ).value = normalized;
}

async function discardKnowledgeImport(
  preview
) {
  if (
    !preview?.pathname ||
    !ariaState.accessToken
  ) {
    return;
  }

  await knowledgeApiRequest(
    "POST",
    {
      action:
        "discard_import",
      pathname:
        preview.pathname
    }
  ).catch((error) => {
    console.warn(
      "Suppression du paquet temporaire impossible.",
      error
    );
  });
}

async function clearKnowledgePreview(
  options = {}
) {
  const preview =
    ariaState.knowledgePreview;

  ariaState.knowledgePreview =
    null;
  updateKnowledgeInterface();

  if (
    options.deleteRemote !== false
  ) {
    await discardKnowledgeImport(
      preview
    );
  }
}

async function handleKnowledgePackageSelection(
  event
) {
  const input =
    event.currentTarget;
  const [file] =
    input.files || [];
  input.value = "";

  if (!file) return;

  const maxBytes =
    Number(
      config.maxKnowledgePackageBytes
    ) || 10 * 1024 * 1024;

  if (
    !file.name
      .toLowerCase()
      .endsWith(".zip") ||
    file.size <= 0 ||
    file.size > maxBytes
  ) {
    setState(
      "error",
      "Paquet Knowledge non autorisé.",
      file.size > maxBytes
        ? "Le paquet doit faire moins de 10 Mo."
        : "Choisis l’archive ZIP BRAIN Knowledge active."
    );
    return;
  }

  ariaState.knowledgeBusy =
    true;
  ariaState.knowledgeUploadProgress =
    0;
  updateKnowledgeInterface();
  setKnowledgeUploadProgress(
    0,
    "Contrôle du paquet"
  );

  let preparedUpload = null;

  try {
    const signature =
      await readZipSignature(file);

    if (
      !isZipSignature(signature)
    ) {
      throw new Error(
        "Le fichier sélectionné n’est pas une archive ZIP valide."
      );
    }

    await clearKnowledgePreview();

    setState(
      "thinking",
      "Préparation de l’import Knowledge…",
      "ARIA crée une autorisation d’upload privée et temporaire."
    );

    const prepared =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "prepare_upload",
          name:
            file.name,
          size:
            file.size,
          mimeType:
            "application/zip"
        }
      );

    preparedUpload =
      prepared.upload;

    if (
      !preparedUpload?.uploadUrl ||
      !preparedUpload?.pathname
    ) {
      throw new Error(
        "ARIA Core n’a pas renvoyé d’autorisation d’upload exploitable."
      );
    }

    setKnowledgeUploadProgress(
      0,
      "Téléversement sécurisé"
    );

    await uploadKnowledgePackage(
      file,
      preparedUpload.uploadUrl,
      (percent) => {
        setKnowledgeUploadProgress(
          percent,
          "Téléversement sécurisé"
        );
        setState(
          "thinking",
          `Import Knowledge : ${percent} %`,
          "Le paquet va directement vers le stockage privé Vercel."
        );
      }
    );

    setKnowledgeUploadProgress(
      100,
      "Validation du manifest"
    );

    const previewResponse =
      await knowledgeApiRequest(
        "POST",
        {
          action: "preview",
          pathname:
            preparedUpload.pathname,
          name:
            preparedUpload.name ||
            file.name,
          size:
            preparedUpload.size ||
            file.size
        }
      );

    ariaState.knowledgePreview = {
      ...previewResponse.preview,
      name:
        preparedUpload.name ||
        file.name,
      size:
        preparedUpload.size ||
        file.size
    };

    setState(
      "idle",
      "Paquet Knowledge contrôlé.",
      "Vérifie la version et les modules avant l’activation."
    );

    setBrainTab(
      "knowledge"
    );
    updateKnowledgeInterface();
  } catch (error) {
    console.error(
      "Knowledge import preview failed:",
      error
    );

    if (
      preparedUpload?.pathname
    ) {
      await discardKnowledgeImport({
        pathname:
          preparedUpload.pathname
      });
    }

    setState(
      "error",
      "Import Knowledge impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeBusy =
      false;
    ariaState.knowledgeUploadProgress =
      0;
    updateKnowledgeInterface();
  }
}

async function activateKnowledgePreview() {
  const preview =
    ariaState.knowledgePreview;

  if (
    !preview ||
    ariaState.knowledgeBusy
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      [
        `Activer BRAIN Knowledge v${preview.packageVersion} ?`,
        "",
        `${preview.moduleCount} module(s) seront utilisés comme référentiels officiels.`,
        "La version actuellement active restera disponible dans l’historique."
      ].join("\n")
    );

  if (!confirmed) return;

  ariaState.knowledgeBusy =
    true;
  updateKnowledgeInterface();

  setState(
    "thinking",
    "Activation de BRAIN Knowledge…",
    "ARIA publie les modules puis met à jour le pointeur actif."
  );

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "activate_import",
          pathname:
            preview.pathname,
          name:
            preview.name,
          size:
            preview.size,
          packageSha256:
            preview.packageSha256
        }
      );

    ariaState.knowledgeStatus =
      result.status || null;
    ariaState.knowledgeVersions =
      Array.isArray(
        result.status?.versions
      )
        ? result.status.versions
        : [];
    ariaState.knowledgePreview =
      null;

    const activatedVersion =
      result.active?.version ||
      preview.packageVersion;

    getElement(
      "knowledge-dialog-status"
    ).textContent =
      `Version officielle active : ${activatedVersion}.`;

    setState(
      "idle",
      `BRAIN Knowledge v${activatedVersion} activé.`,
      "Les référentiels officiels ont maintenant priorité dans ARIA."
    );

    updateBrainIndicator();
  } catch (error) {
    console.error(
      "Knowledge activation failed:",
      error
    );

    setState(
      "error",
      "Activation Knowledge impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeBusy =
      false;
    updateKnowledgeInterface();
  }
}

async function activateStoredKnowledgeVersion(
  version
) {
  if (
    !version ||
    ariaState.knowledgeBusy
  ) {
    return;
  }

  const activeVersion =
    ariaState.knowledgeStatus
      ?.active?.version;

  if (version === activeVersion) {
    return;
  }

  if (
    !window.confirm(
      `Réactiver BRAIN Knowledge v${version} ?`
    )
  ) {
    return;
  }

  ariaState.knowledgeBusy =
    true;
  updateKnowledgeInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "activate_version",
          version
        }
      );

    ariaState.knowledgeStatus =
      result.status || null;
    ariaState.knowledgeVersions =
      Array.isArray(
        result.status?.versions
      )
        ? result.status.versions
        : [];

    getElement(
      "knowledge-dialog-status"
    ).textContent =
      `Version officielle active : ${version}.`;

    setState(
      "idle",
      `BRAIN Knowledge v${version} réactivé.`,
      "Le changement de version est immédiatement appliqué."
    );

    updateBrainIndicator();
  } catch (error) {
    setState(
      "error",
      "Retour de version impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeBusy =
      false;
    updateKnowledgeInterface();
  }
}

async function loadKnowledgeStatus() {
  const statusElement =
    getElement(
      "knowledge-dialog-status"
    );

  statusElement.textContent =
    "Chargement de BRAIN Knowledge…";

  try {
    const data =
      await knowledgeApiRequest(
        "GET"
      );

    ariaState.knowledgeStatus =
      data.status || null;
    ariaState.knowledgeVersions =
      Array.isArray(
        data.status?.versions
      )
        ? data.status.versions
        : [];

    statusElement.textContent =
      data.status?.active
        ? `Version officielle active : ${data.status.active.version}.`
        : "Aucune version officielle n’est encore active.";

    updateKnowledgeInterface();
    updateBrainIndicator();

    await loadKnowledgeManager({
      quiet: true
    });
  } catch (error) {
    console.error(
      "Unable to load BRAIN Knowledge:",
      error
    );

    statusElement.textContent =
      getReadableError(error);
    ariaState.knowledgeStatus =
      null;
    ariaState.knowledgeVersions =
      [];
    updateKnowledgeInterface();
  }
}

function createKnowledgeModuleCard(
  module
) {
  const article =
    document.createElement(
      "article"
    );
  article.className =
    "knowledge-module-item";

  const title =
    document.createElement(
      "strong"
    );
  title.textContent =
    module.title ||
    module.moduleId ||
    "Module";

  const count =
    document.createElement(
      "span"
    );
  const recordCount =
    Number(
      module.recordCount
    ) || 0;
  count.textContent =
    `${recordCount} enregistrement${recordCount > 1 ? "s" : ""}`;

  article.append(
    title,
    count
  );

  return article;
}

function renderKnowledgeModules(
  container,
  modules
) {
  container.replaceChildren();

  if (
    !Array.isArray(modules) ||
    modules.length === 0
  ) {
    const empty =
      document.createElement(
        "p"
      );
    empty.className =
      "knowledge-empty-state";
    empty.textContent =
      "Aucun module disponible.";
    container.append(empty);
    return;
  }

  for (const module of modules) {
    container.append(
      createKnowledgeModuleCard(
        module
      )
    );
  }
}

function renderKnowledgeVersions() {
  const listElement =
    getElement(
      "knowledge-version-list"
    );
  listElement.replaceChildren();

  const versions =
    ariaState.knowledgeVersions;
  const activeVersion =
    ariaState.knowledgeStatus
      ?.active?.version;

  if (!versions.length) {
    const empty =
      document.createElement(
        "p"
      );
    empty.className =
      "knowledge-empty-state";
    empty.textContent =
      "Aucune version archivée.";
    listElement.append(empty);
    return;
  }

  for (const version of versions) {
    const article =
      document.createElement(
        "article"
      );
    article.className =
      "knowledge-version-item";

    const copy =
      document.createElement(
        "div"
      );

    const heading =
      document.createElement(
        "div"
      );
    heading.className =
      "knowledge-version-item-heading";

    const title =
      document.createElement(
        "strong"
      );
    title.textContent =
      `Version ${version.version}`;

    const badge =
      document.createElement(
        "span"
      );
    const isActive =
      version.version ===
      activeVersion;
    badge.className =
      "knowledge-status-badge";
    badge.classList.toggle(
      "active",
      isActive
    );
    badge.textContent =
      isActive
        ? "Active"
        : "Disponible";

    heading.append(
      title,
      badge
    );

    const metadata =
      document.createElement(
        "p"
      );
    metadata.textContent = [
      `${Number(version.moduleCount) || 0} module(s)`,
      version.importedAt
        ? new Intl.DateTimeFormat(
            "fr-BE",
            {
              dateStyle:
                "medium",
              timeStyle:
                "short"
            }
          ).format(
            new Date(
              version.importedAt
            )
          )
        : "date inconnue"
    ].join(" · ");

    copy.append(
      heading,
      metadata
    );

    const button =
      document.createElement(
        "button"
      );
    button.type = "button";
    button.className =
      isActive
        ? "secondary compact"
        : "compact";
    button.textContent =
      isActive
        ? "Version active"
        : "Réactiver";
    button.disabled =
      isActive ||
      ariaState.knowledgeBusy;
    button.addEventListener(
      "click",
      () =>
        activateStoredKnowledgeVersion(
          version.version
        )
    );

    article.append(
      copy,
      button
    );
    listElement.append(
      article
    );
  }
}

function updateKnowledgeInterface() {
  if (!domReady) return;

  const status =
    ariaState.knowledgeStatus;
  const active =
    status?.active || null;
  const preview =
    ariaState.knowledgePreview;
  const busy =
    ariaState.knowledgeBusy;

  const activeVersion =
    getElement(
      "knowledge-active-version"
    );
  const activeBadge =
    getElement(
      "knowledge-active-badge"
    );
  const activeMeta =
    getElement(
      "knowledge-active-meta"
    );

  activeVersion.textContent =
    active
      ? `v${active.version}`
      : "Aucune version";

  activeBadge.textContent =
    active
      ? "Active"
      : status
        ? "En attente"
        : "Non chargée";
  activeBadge.classList.toggle(
    "active",
    Boolean(active)
  );

  activeMeta.textContent =
    active
      ? [
          active.validatedAt
            ? `Validée le ${active.validatedAt}`
            : "Date de validation inconnue",
          active.validatedBy ||
            "Validateur non renseigné",
          active.activatedAt
            ? `Activée le ${new Intl.DateTimeFormat(
                "fr-BE",
                {
                  dateStyle:
                    "medium",
                  timeStyle:
                    "short"
                }
              ).format(
                new Date(
                  active.activatedAt
                )
              )}`
            : ""
        ]
          .filter(Boolean)
          .join(" · ")
      : "Importe le paquet ARIA BRAIN Knowledge actif.";

  renderKnowledgeModules(
    getElement(
      "knowledge-active-modules"
    ),
    active?.modules || []
  );

  getElement(
    "import-knowledge-button"
  ).disabled =
    busy ||
    !ariaState.accessToken;
  getElement(
    "refresh-knowledge-button"
  ).disabled = busy;

  const progress =
    getElement(
      "knowledge-upload-progress"
    );
  progress.hidden = !busy;

  const previewCard =
    getElement(
      "knowledge-preview-card"
    );
  previewCard.hidden = !preview;

  if (preview) {
    getElement(
      "knowledge-preview-version"
    ).textContent =
      `Version ${preview.packageVersion}`;
    getElement(
      "knowledge-preview-badge"
    ).textContent =
      preview.valid
        ? "Valide"
        : "Invalide";
    getElement(
      "knowledge-preview-badge"
    ).classList.toggle(
      "active",
      Boolean(preview.valid)
    );

    getElement(
      "knowledge-preview-meta"
    ).textContent = [
      preview.sourceName,
      formatFileSize(
        preview.size
      ),
      `${preview.moduleCount} module(s)`,
      preview.validatedAt
        ? `validé le ${preview.validatedAt}`
        : "",
      preview.validatedBy ||
        ""
    ]
      .filter(Boolean)
      .join(" · ");

    renderKnowledgeModules(
      getElement(
        "knowledge-preview-modules"
      ),
      preview.modules || []
    );

    const warningList =
      getElement(
        "knowledge-preview-warnings"
      );
    warningList.replaceChildren();

    for (
      const warning
      of preview.warnings || []
    ) {
      const item =
        document.createElement(
          "li"
        );
      item.textContent =
        warning;
      warningList.append(
        item
      );
    }

    warningList.hidden =
      warningList.children
        .length === 0;
  }

  getElement(
    "activate-knowledge-button"
  ).disabled =
    busy ||
    !preview?.valid;
  getElement(
    "cancel-knowledge-preview-button"
  ).disabled = busy;

  renderKnowledgeVersions();
}


function cloneKnowledgeManagerData(
  data
) {
  return JSON.parse(
    JSON.stringify(
      data || {
        documentTypes: [],
        disciplines: [],
        techniques: []
      }
    )
  );
}

function normalizeManagerCodeClient(
  value
) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16);
}

function normalizeManagerLabelClient(
  value
) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function parseManagerAliases(
  value
) {
  return [
    ...new Set(
      String(value || "")
        .split(",")
        .map(
          (alias) =>
            alias
              .normalize("NFC")
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)
    )
  ].slice(0, 30);
}

async function loadKnowledgeManager({
  quiet = false
} = {}) {
  if (
    ariaState.knowledgeManagerBusy ||
    !ariaState.accessToken
  ) {
    return;
  }

  ariaState.knowledgeManagerBusy =
    true;

  if (!quiet) {
    getElement(
      "knowledge-manager-status"
    ).textContent =
      "Chargement du Knowledge Manager…";
  }

  updateKnowledgeManagerInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "manager_get"
        }
      );

    ariaState.knowledgeManager =
      result.manager || null;
    ariaState.knowledgeManagerData =
      cloneKnowledgeManagerData(
        result.manager?.data
      );
    ariaState.knowledgeManagerDirty =
      false;
    ariaState.knowledgeManagerEditing =
      null;

    getElement(
      "knowledge-manager-status"
    ).textContent =
      result.manager?.hasDraft
        ? "Un brouillon enregistré est chargé. Publie-le après contrôle."
        : "Les valeurs publiées sont chargées. Les modifications restent locales jusqu’à l’enregistrement du brouillon.";

    renderKnowledgeManager();
  } catch (error) {
    getElement(
      "knowledge-manager-status"
    ).textContent =
      getReadableError(error);

    if (!quiet) {
      setState(
        "error",
        "Knowledge Manager indisponible.",
        getReadableError(error)
      );
    }
  } finally {
    ariaState.knowledgeManagerBusy =
      false;
    updateKnowledgeManagerInterface();
  }
}

function setKnowledgeManagerTab(
  tab
) {
  const allowed = [
    "documentTypes",
    "disciplines",
    "techniques"
  ];

  ariaState.knowledgeManagerTab =
    allowed.includes(tab)
      ? tab
      : "documentTypes";
  ariaState.knowledgeManagerEditing =
    null;
  closeKnowledgeManagerForm();
  renderKnowledgeManager();
}

function getKnowledgeManagerCollection() {
  return (
    ariaState.knowledgeManagerData?.[
      ariaState.knowledgeManagerTab
    ] || []
  );
}

function getKnowledgeManagerRecordKey(
  record,
  tab = ariaState
    .knowledgeManagerTab
) {
  if (tab === "techniques") {
    return `${record.disciplineCode}:${record.code}`;
  }

  return record.code;
}

function getKnowledgeManagerTabLabel(
  tab = ariaState
    .knowledgeManagerTab
) {
  const labels = {
    documentTypes:
      "type de document",
    disciplines:
      "discipline",
    techniques:
      "technique"
  };

  return labels[tab] || "valeur";
}

function setKnowledgeManagerFormValues(
  record = null,
  preset = null
) {
  const tab =
    ariaState.knowledgeManagerTab;
  const source = {
    ...(record || {}),
    ...(preset || {})
  };

  getElement(
    "knowledge-manager-code"
  ).value =
    source.code || "";

  getElement(
    "knowledge-manager-label"
  ).value =
    source.label || "";

  getElement(
    "knowledge-manager-aliases"
  ).value =
    Array.isArray(source.aliases)
      ? source.aliases.join(", ")
      : "";

  getElement(
    "knowledge-manager-active"
  ).checked =
    source.active !== false;

  const disciplineRow =
    getElement(
      "knowledge-manager-discipline-row"
    );
  const aliasesRow =
    getElement(
      "knowledge-manager-aliases-row"
    );
  const parent =
    getElement(
      "knowledge-manager-parent-discipline"
    );

  disciplineRow.hidden =
    tab !== "techniques";
  aliasesRow.hidden =
    tab === "disciplines";

  parent.replaceChildren(
    createSelectOption(
      "",
      "Sélectionner"
    ),
    ...(
      ariaState
        .knowledgeManagerData
        ?.disciplines || []
    ).map(
      (discipline) =>
        createSelectOption(
          discipline.code,
          `${discipline.code} — ${discipline.label}`,
          discipline.code ===
            source.disciplineCode
        )
    )
  );
}

function openKnowledgeManagerForm(
  record = null,
  preset = null
) {
  if (
    !ariaState.knowledgeManagerData
  ) {
    loadKnowledgeManager();
    return;
  }

  ariaState.knowledgeManagerEditing =
    record
      ? {
          tab:
            ariaState
              .knowledgeManagerTab,
          key:
            getKnowledgeManagerRecordKey(
              record
            )
        }
      : null;

  getElement(
    "knowledge-manager-form-title"
  ).textContent =
    record
      ? `Modifier ce ${getKnowledgeManagerTabLabel()}`
      : `Ajouter un ${getKnowledgeManagerTabLabel()}`;

  setKnowledgeManagerFormValues(
    record,
    preset
  );

  const codeInput =
    getElement(
      "knowledge-manager-code"
    );
  codeInput.disabled =
    Boolean(record);

  getElement(
    "knowledge-manager-form"
  ).hidden = false;

  window.requestAnimationFrame(
    () => {
      getElement(
        record
          ? "knowledge-manager-label"
          : "knowledge-manager-code"
      ).focus();
    }
  );
}

function closeKnowledgeManagerForm() {
  if (!domReady) return;

  const form =
    getElement(
      "knowledge-manager-form"
    );
  form.hidden = true;
  form.reset();

  getElement(
    "knowledge-manager-code"
  ).disabled = false;

  ariaState.knowledgeManagerEditing =
    null;
}

function saveKnowledgeManagerForm(
  event
) {
  event.preventDefault();

  const tab =
    ariaState.knowledgeManagerTab;
  const collection =
    getKnowledgeManagerCollection();
  const code =
    normalizeManagerCodeClient(
      getElement(
        "knowledge-manager-code"
      ).value
    );
  const label =
    normalizeManagerLabelClient(
      getElement(
        "knowledge-manager-label"
      ).value
    );
  const active =
    getElement(
      "knowledge-manager-active"
    ).checked;
  const aliases =
    parseManagerAliases(
      getElement(
        "knowledge-manager-aliases"
      ).value
    );

  if (!code || !label) {
    setState(
      "error",
      "Valeur incomplète.",
      "Le code et le libellé sont obligatoires."
    );
    return;
  }

  let record = {
    code,
    label,
    active
  };

  if (tab !== "disciplines") {
    record.aliases =
      aliases;
  }

  if (tab === "techniques") {
    const disciplineCode =
      getElement(
        "knowledge-manager-parent-discipline"
      ).value;

    if (!disciplineCode) {
      setState(
        "error",
        "Discipline obligatoire.",
        "Sélectionne la discipline parente de la technique."
      );
      return;
    }

    record.disciplineCode =
      disciplineCode;
  }

  const editing =
    ariaState.knowledgeManagerEditing;
  const key =
    getKnowledgeManagerRecordKey(
      record,
      tab
    );

  const duplicate = collection.find(
    (item) =>
      getKnowledgeManagerRecordKey(
        item,
        tab
      ) === key &&
      (
        !editing ||
        getKnowledgeManagerRecordKey(
          item,
          tab
        ) !== editing.key
      )
  );

  if (duplicate) {
    setState(
      "error",
      "Code déjà utilisé.",
      `La valeur ${key} existe déjà dans le brouillon.`
    );
    return;
  }

  if (editing) {
    const index =
      collection.findIndex(
        (item) =>
          getKnowledgeManagerRecordKey(
            item,
            tab
          ) === editing.key
      );

    if (index >= 0) {
      collection[index] =
        record;
    }
  } else {
    collection.push(record);
  }

  collection.sort(
    (a, b) =>
      getKnowledgeManagerRecordKey(
        a,
        tab
      ).localeCompare(
        getKnowledgeManagerRecordKey(
          b,
          tab
        ),
        "fr"
      )
  );

  ariaState.knowledgeManagerDirty =
    true;
  closeKnowledgeManagerForm();
  renderKnowledgeManager();

  getElement(
    "knowledge-manager-status"
  ).textContent =
    "Modification locale prête. Enregistre le brouillon puis publie-le.";
}

function toggleKnowledgeManagerRecord(
  record
) {
  record.active =
    record.active === false;
  ariaState.knowledgeManagerDirty =
    true;
  renderKnowledgeManager();
}

function renderKnowledgeManagerRecord(
  record
) {
  const article =
    document.createElement(
      "article"
    );
  article.className =
    "knowledge-manager-item";
  article.classList.toggle(
    "inactive",
    record.active === false
  );

  const copy =
    document.createElement(
      "div"
    );

  const heading =
    document.createElement(
      "div"
    );
  heading.className =
    "knowledge-manager-item-heading";

  const code =
    document.createElement(
      "strong"
    );
  code.textContent =
    ariaState.knowledgeManagerTab ===
      "techniques"
      ? `${record.disciplineCode}-${record.code}`
      : record.code;

  const badge =
    document.createElement(
      "span"
    );
  badge.className =
    "knowledge-status-badge";
  badge.classList.toggle(
    "active",
    record.active !== false
  );
  badge.textContent =
    record.active !== false
      ? "Actif"
      : "Inactif";

  heading.append(
    code,
    badge
  );

  const label =
    document.createElement(
      "p"
    );
  label.textContent =
    record.label;

  const aliases =
    document.createElement(
      "small"
    );
  aliases.textContent =
    Array.isArray(
      record.aliases
    ) &&
    record.aliases.length > 0
      ? `Alias : ${record.aliases.join(", ")}`
      : "Aucun alias";

  copy.append(
    heading,
    label,
    aliases
  );

  const actions =
    document.createElement(
      "div"
    );
  actions.className =
    "knowledge-manager-item-actions";

  const edit =
    document.createElement(
      "button"
    );
  edit.type = "button";
  edit.className =
    "secondary compact";
  edit.textContent =
    "Modifier";
  edit.addEventListener(
    "click",
    () =>
      openKnowledgeManagerForm(
        record
      )
  );

  const toggle =
    document.createElement(
      "button"
    );
  toggle.type = "button";
  toggle.className =
    "secondary compact";
  toggle.textContent =
    record.active !== false
      ? "Désactiver"
      : "Réactiver";
  toggle.addEventListener(
    "click",
    () =>
      toggleKnowledgeManagerRecord(
        record
      )
  );

  actions.append(
    edit,
    toggle
  );

  article.append(
    copy,
    actions
  );

  return article;
}

function renderKnowledgeManagerHistory() {
  const container =
    getElement(
      "knowledge-manager-history-list"
    );
  container.replaceChildren();

  const history =
    ariaState.knowledgeManager
      ?.history || [];

  if (history.length === 0) {
    const empty =
      document.createElement(
        "p"
      );
    empty.className =
      "knowledge-empty-state";
    empty.textContent =
      "Aucune publication du gestionnaire.";
    container.append(empty);
    return;
  }

  for (const version of history) {
    const article =
      document.createElement(
        "article"
      );
    article.className =
      "knowledge-version-item";

    const copy =
      document.createElement(
        "div"
      );
    const title =
      document.createElement(
        "strong"
      );
    title.textContent =
      `Révision ${version.revision}`;
    const meta =
      document.createElement(
        "p"
      );
    meta.textContent = [
      `${version.counts?.documentTypes || 0} types`,
      `${version.counts?.disciplines || 0} disciplines`,
      `${version.counts?.techniques || 0} techniques`,
      version.publishedAt
        ? new Intl.DateTimeFormat(
            "fr-BE",
            {
              dateStyle:
                "medium",
              timeStyle:
                "short"
            }
          ).format(
            new Date(
              version.publishedAt
            )
          )
        : ""
    ]
      .filter(Boolean)
      .join(" · ");

    copy.append(
      title,
      meta
    );

    const restore =
      document.createElement(
        "button"
      );
    restore.type = "button";
    restore.className =
      "secondary compact";
    restore.textContent =
      "Restaurer en brouillon";
    restore.disabled =
      ariaState.knowledgeManagerBusy;
    restore.addEventListener(
      "click",
      () =>
        restoreKnowledgeManagerRevision(
          version.revision
        )
    );

    article.append(
      copy,
      restore
    );
    container.append(article);
  }
}

function renderKnowledgeManager() {
  if (!domReady) return;

  const list =
    getElement(
      "knowledge-manager-list"
    );
  list.replaceChildren();

  const data =
    ariaState.knowledgeManagerData;
  const manager =
    ariaState.knowledgeManager;

  getElement(
    "knowledge-manager-revision"
  ).textContent =
    manager
      ? `Révision ${manager.activeRevision || 0}${manager.hasDraft ? " · brouillon" : ""}`
      : "Non chargé";

  for (
    const button
    of document.querySelectorAll(
      ".knowledge-manager-tab"
    )
  ) {
    button.classList.toggle(
      "active",
      button.dataset.managerTab ===
        ariaState.knowledgeManagerTab
    );
  }

  if (!data) {
    const empty =
      document.createElement(
        "p"
      );
    empty.className =
      "knowledge-empty-state";
    empty.textContent =
      "Charge le Knowledge Manager pour afficher les valeurs.";
    list.append(empty);
    renderKnowledgeManagerHistory();
    updateKnowledgeManagerInterface();
    return;
  }

  const query =
    ariaState.knowledgeManagerSearch
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim();

  const records =
    getKnowledgeManagerCollection()
      .filter((record) => {
        if (!query) return true;

        return [
          record.code,
          record.label,
          record.disciplineCode,
          ...(record.aliases || [])
        ]
          .filter(Boolean)
          .join(" ")
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .toLowerCase()
          .includes(query);
      });

  if (records.length === 0) {
    const empty =
      document.createElement(
        "p"
      );
    empty.className =
      "knowledge-empty-state";
    empty.textContent =
      "Aucune valeur ne correspond à cette recherche.";
    list.append(empty);
  } else {
    for (const record of records) {
      list.append(
        renderKnowledgeManagerRecord(
          record
        )
      );
    }
  }

  renderKnowledgeManagerHistory();
  updateKnowledgeManagerInterface();
}

function updateKnowledgeManagerInterface() {
  if (!domReady) return;

  const disabled =
    ariaState.knowledgeManagerBusy ||
    ariaState.knowledgeBusy;

  getElement(
    "knowledge-manager-add-button"
  ).disabled =
    disabled ||
    !ariaState.knowledgeManagerData;

  getElement(
    "knowledge-manager-save-draft"
  ).disabled =
    disabled ||
    !ariaState.knowledgeManagerData ||
    !ariaState.knowledgeManagerDirty;

  getElement(
    "knowledge-manager-publish"
  ).disabled =
    disabled ||
    !ariaState.knowledgeManager ||
    (
      !ariaState.knowledgeManager.hasDraft &&
      !ariaState.knowledgeManagerDirty
    );

  getElement(
    "knowledge-manager-discard"
  ).disabled =
    disabled ||
    !ariaState.knowledgeManager
      ?.hasDraft;

  getElement(
    "knowledge-manager-search"
  ).disabled =
    disabled ||
    !ariaState.knowledgeManagerData;
}

async function saveKnowledgeManagerDraft({
  quiet = false
} = {}) {
  if (
    !ariaState.knowledgeManagerData ||
    ariaState.knowledgeManagerBusy
  ) {
    return false;
  }

  ariaState.knowledgeManagerBusy =
    true;
  updateKnowledgeManagerInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "manager_save_draft",
          expectedRevision:
            ariaState.knowledgeManager
              ?.activeRevision || 0,
          data:
            ariaState.knowledgeManagerData
        }
      );

    ariaState.knowledgeManager =
      result.manager;
    ariaState.knowledgeManagerData =
      cloneKnowledgeManagerData(
        result.manager?.data
      );
    ariaState.knowledgeManagerDirty =
      false;

    getElement(
      "knowledge-manager-status"
    ).textContent =
      "Brouillon enregistré dans le stockage privé.";

    if (!quiet) {
      setState(
        "idle",
        "Brouillon Knowledge enregistré.",
        "Il n’est pas encore utilisé par le classificateur."
      );
    }

    renderKnowledgeManager();
    return true;
  } catch (error) {
    setState(
      "error",
      "Enregistrement impossible.",
      getReadableError(error)
    );
    return false;
  } finally {
    ariaState.knowledgeManagerBusy =
      false;
    updateKnowledgeManagerInterface();
  }
}

async function publishKnowledgeManager() {
  if (
    !ariaState.knowledgeManager ||
    ariaState.knowledgeManagerBusy
  ) {
    return;
  }

  if (
    !window.confirm(
      "Publier ces valeurs comme référentiel officiel actif ?"
    )
  ) {
    return;
  }

  if (
    ariaState.knowledgeManagerDirty
  ) {
    const saved =
      await saveKnowledgeManagerDraft({
        quiet: true
      });

    if (!saved) return;
  }

  ariaState.knowledgeManagerBusy =
    true;
  updateKnowledgeManagerInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "manager_publish",
          expectedRevision:
            ariaState.knowledgeManager
              ?.activeRevision || 0
        }
      );

    ariaState.knowledgeManager =
      result.manager;
    ariaState.knowledgeManagerData =
      cloneKnowledgeManagerData(
        result.manager?.data
      );
    ariaState.knowledgeManagerDirty =
      false;

    if (result.status) {
      ariaState.knowledgeStatus =
        result.status;
      ariaState.knowledgeVersions =
        Array.isArray(
          result.status?.versions
        )
          ? result.status.versions
          : [];
    }

    ariaState.documentEditorReferences =
      null;

    if (
      ariaState.documentAnalysis
    ) {
      const localDraft =
        ariaState.documentEditMode &&
        ariaState.documentEditorDirty
          ? {
              metadata: {
                ...ariaState
                  .documentEditorMetadata
              },
              siteId:
                ariaState
                  .documentEditorSiteId
            }
          : null;

      await loadDocumentEditorReferences();

      if (localDraft) {
        ariaState.documentEditorMetadata =
          localDraft.metadata;
        ariaState.documentEditorSiteId =
          localDraft.siteId;
      }

      renderDocumentEditorOptions();

      if (!localDraft) {
        syncDocumentEditorValues();
      }
    }

    getElement(
      "knowledge-manager-status"
    ).textContent =
      `Révision ${result.manager.activeRevision} publiée et immédiatement active.`;

    setState(
      "idle",
      "Référentiel publié.",
      "Le classificateur et les combobox utilisent maintenant cette révision."
    );

    updateKnowledgeInterface();
    updateBrainIndicator();
    renderKnowledgeManager();
  } catch (error) {
    setState(
      "error",
      "Publication impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeManagerBusy =
      false;
    updateKnowledgeManagerInterface();
  }
}

async function discardKnowledgeManagerDraft() {
  if (
    !ariaState.knowledgeManager
      ?.hasDraft ||
    ariaState.knowledgeManagerBusy
  ) {
    return;
  }

  if (
    !window.confirm(
      "Abandonner le brouillon enregistré et revenir aux valeurs publiées ?"
    )
  ) {
    return;
  }

  ariaState.knowledgeManagerBusy =
    true;
  updateKnowledgeManagerInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "manager_discard"
        }
      );

    ariaState.knowledgeManager =
      result.manager;
    ariaState.knowledgeManagerData =
      cloneKnowledgeManagerData(
        result.manager?.data
      );
    ariaState.knowledgeManagerDirty =
      false;

    getElement(
      "knowledge-manager-status"
    ).textContent =
      "Brouillon abandonné.";

    renderKnowledgeManager();
  } catch (error) {
    setState(
      "error",
      "Abandon impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeManagerBusy =
      false;
    updateKnowledgeManagerInterface();
  }
}

async function restoreKnowledgeManagerRevision(
  revision
) {
  if (
    ariaState.knowledgeManagerBusy
  ) {
    return;
  }

  if (
    !window.confirm(
      `Restaurer la révision ${revision} dans un nouveau brouillon ?`
    )
  ) {
    return;
  }

  ariaState.knowledgeManagerBusy =
    true;
  updateKnowledgeManagerInterface();

  try {
    const result =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "manager_restore",
          revision
        }
      );

    ariaState.knowledgeManager =
      result.manager;
    ariaState.knowledgeManagerData =
      cloneKnowledgeManagerData(
        result.manager?.data
      );
    ariaState.knowledgeManagerDirty =
      false;

    getElement(
      "knowledge-manager-status"
    ).textContent =
      `La révision ${revision} est chargée comme brouillon.`;

    renderKnowledgeManager();
  } catch (error) {
    setState(
      "error",
      "Restauration impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.knowledgeManagerBusy =
      false;
    updateKnowledgeManagerInterface();
  }
}

async function openKnowledgeManagerFromDocument(
  kind
) {
  const allowed = [
    "documentTypes",
    "disciplines",
    "techniques"
  ];

  if (!allowed.includes(kind)) {
    return;
  }

  const dialog =
    getElement(
      "brain-dialog"
    );

  if (
    typeof dialog.showModal ===
      "function" &&
    !dialog.open
  ) {
    dialog.showModal();
  }

  setBrainTab("knowledge");

  if (
    !ariaState.knowledgeManagerData
  ) {
    await loadKnowledgeManager();
  }

  setKnowledgeManagerTab(kind);

  const metadata =
    ariaState.documentEditorMetadata ||
    {};

  const preset = {
    code:
      kind === "documentTypes"
        ? metadata.type_document
        : kind === "disciplines"
          ? metadata.discipline
          : metadata.technique,
    label: "",
    disciplineCode:
      kind === "techniques"
        ? metadata.discipline
        : undefined,
    active: true
  };

  openKnowledgeManagerForm(
    null,
    preset
  );
}

function getMemoryCategoryLabel(category) {
  const labels = {
    preference: "Préférence",
    project_decision: "Décision projet",
    nomenclature: "Nomenclature",
    workflow: "Méthode de travail",
    tool_convention: "Convention outil",
    professional_context: "Contexte professionnel"
  };

  return labels[category] || "Mémoire";
}

function setPendingMemory(proposal) {
  ariaState.pendingMemory =
    proposal && typeof proposal === "object"
      ? {
          category: String(proposal.category || ""),
          title: String(proposal.title || "").trim(),
          summary: String(proposal.summary || "").trim(),
          reason: String(proposal.reason || "").trim(),
          confidence: Number(proposal.confidence) || 0
        }
      : null;

  updateMemoryProposalCard();
}

function updateMemoryProposalCard() {
  if (!domReady) return;

  const card = getElement("memory-proposal-card");
  const proposal = ariaState.pendingMemory;

  card.hidden = !proposal;

  if (!proposal) return;

  getElement("memory-proposal-category").textContent =
    getMemoryCategoryLabel(proposal.category);
  getElement("memory-proposal-title").textContent =
    proposal.title;
  getElement("memory-proposal-summary").textContent =
    proposal.summary;
  const storageWarning =
    ariaState.memoryStorageConfigured === false
      ? " Le stockage BRAIN permanent n’est pas encore détecté dans Vercel."
      : "";

  getElement("memory-proposal-reason").textContent =
    `${proposal.reason ? `Pourquoi : ${proposal.reason}` : ""}${storageWarning}`;

  getElement("approve-memory-button").disabled =
    ariaState.memoryBusy ||
    ariaState.memoryStorageConfigured === false;
  getElement("dismiss-memory-button").disabled =
    ariaState.memoryBusy;
}

function normalizeVoiceCommand(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function handlePendingMemoryVoiceCommand(transcript) {
  if (!ariaState.pendingMemory) return false;

  const command = normalizeVoiceCommand(transcript);

  const approvePatterns = [
    "memorise",
    "memorise le",
    "oui memorise",
    "retiens",
    "retiens le",
    "enregistre",
    "ajoute a brain",
    "garde le"
  ];

  const dismissPatterns = [
    "ignore",
    "non ignore",
    "ne memorise pas",
    "ne retiens pas",
    "oublie",
    "laisse tomber"
  ];

  if (approvePatterns.some((pattern) => command.includes(pattern))) {
    approvePendingMemory();
    return true;
  }

  if (dismissPatterns.some((pattern) => command.includes(pattern))) {
    dismissPendingMemory({ speakConfirmation: true });
    return true;
  }

  return false;
}

async function memoryApiRequest(method, body = null, query = "") {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.memoryRequestTimeoutMs) || 30000
  );

  try {
    const response = await fetch(
      `${config.memoryApiUrl}${query}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ariaState.accessToken}`
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : `La mémoire BRAIN a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      throw error;
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function approvePendingMemory() {
  if (!ariaState.pendingMemory || ariaState.memoryBusy) return;

  if (ariaState.memoryStorageConfigured === false) {
    setState(
      "error",
      "Stockage BRAIN non détecté.",
      "Connecte le Blob privé aria-brain au projet aria-core dans Vercel, puis redéploie."
    );
    return;
  }

  ariaState.memoryBusy = true;
  updateMemoryProposalCard();
  setVoiceStatus("Mémorisation…", "ARIA enregistre l’information validée dans BRAIN.");

  try {
    const result = await memoryApiRequest(
      "POST",
      { proposal: ariaState.pendingMemory }
    );

    const wasDuplicate = result.duplicate === true;
    ariaState.pendingMemory = null;
    updateMemoryProposalCard();

    const confirmation = wasDuplicate
      ? "Cette information était déjà mémorisée."
      : "C’est mémorisé dans BRAIN.";

    setState("idle", confirmation, "La mémoire privée a été mise à jour.");
    setVoiceStatus(confirmation, "ARIA est prête à continuer.");
    updateBrainIndicator();

    if (ariaState.autoSpeak) {
      speakText(confirmation);
    }
  } catch (error) {
    console.error("Memory approval failed:", error);
    setState("error", "La mémoire n’a pas été enregistrée.", getReadableError(error));
    setVoiceStatus("Échec de la mémorisation.", getReadableError(error));
    addMessage("error", getReadableError(error), false);
  } finally {
    ariaState.memoryBusy = false;
    updateMemoryProposalCard();
  }
}

function dismissPendingMemory(options = {}) {
  if (!ariaState.pendingMemory) return;

  ariaState.pendingMemory = null;
  updateMemoryProposalCard();
  setState("idle", "Proposition ignorée.", "Aucune mémoire n’a été enregistrée.");
  setVoiceStatus("Proposition ignorée.", "ARIA est prête à continuer.");

  if (options.speakConfirmation && ariaState.autoSpeak) {
    speakText("D’accord, je ne mémorise pas cette information.");
  }
}

function updateBrainIndicator() {
  if (!domReady) return;

  const indicator =
    getElement("brain-indicator");
  const connected =
    Boolean(ariaState.accessToken);
  const memoryCount =
    ariaState.savedMemories.length;
  const knowledgeVersion =
    ariaState.knowledgeStatus
      ?.active?.version;

  indicator.disabled =
    !connected;

  const parts = ["BRAIN"];

  if (memoryCount > 0) {
    parts.push(`M${memoryCount}`);
  }

  if (knowledgeVersion) {
    parts.push(
      `K${knowledgeVersion}`
    );
  }

  indicator.textContent =
    parts.join(" · ");
  indicator.title =
    knowledgeVersion
      ? `BRAIN Knowledge v${knowledgeVersion} actif`
      : "Consulter BRAIN";
}

async function openBrainDialog() {
  if (!ariaState.accessToken) {
    openAccessDialog();
    return;
  }

  const dialog = getElement("brain-dialog");

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }

  setBrainTab(
    ariaState.brainActiveTab
  );

  await Promise.allSettled([
    loadBrainMemories(),
    loadKnowledgeStatus()
  ]);
}

function closeBrainDialog() {
  const dialog = getElement("brain-dialog");
  if (dialog.open) dialog.close();
}

async function loadBrainMemories() {
  const status = getElement("brain-dialog-status");
  const listElement = getElement("brain-memory-list");

  status.textContent = "Chargement des mémoires…";
  listElement.replaceChildren();

  try {
    const data = await memoryApiRequest("GET");
    ariaState.savedMemories = Array.isArray(data.memories)
      ? data.memories
      : [];

    renderBrainMemories();

    status.textContent = data.status?.storageConfigured
      ? `${ariaState.savedMemories.length} mémoire${ariaState.savedMemories.length > 1 ? "s" : ""} validée${ariaState.savedMemories.length > 1 ? "s" : ""}.`
      : "Le stockage BRAIN permanent n’est pas encore configuré.";

    updateBrainIndicator();
  } catch (error) {
    console.error("Unable to load BRAIN memories:", error);
    status.textContent = getReadableError(error);
  }
}

function renderBrainMemories() {
  const listElement = getElement("brain-memory-list");
  listElement.replaceChildren();

  if (!ariaState.savedMemories.length) {
    const empty = document.createElement("p");
    empty.className = "brain-empty-state";
    empty.textContent = "Aucune mémoire dynamique n’a encore été validée.";
    listElement.append(empty);
    return;
  }

  for (const memory of ariaState.savedMemories) {
    const article = document.createElement("article");
    article.className = "brain-memory-item";

    const header = document.createElement("div");
    header.className = "brain-memory-item-heading";

    const textGroup = document.createElement("div");

    const category = document.createElement("span");
    category.className = "memory-category";
    category.textContent = getMemoryCategoryLabel(memory.category);

    const title = document.createElement("h3");
    title.textContent = memory.title;

    textGroup.append(category, title);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary compact danger-button";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener(
      "click",
      () => deleteBrainMemory(memory)
    );

    header.append(textGroup, deleteButton);

    const summary = document.createElement("p");
    summary.textContent = memory.summary;

    const date = document.createElement("time");
    date.dateTime = memory.createdAt || "";
    date.textContent = memory.createdAt
      ? new Intl.DateTimeFormat("fr-BE", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(memory.createdAt))
      : "";

    article.append(header, summary, date);
    listElement.append(article);
  }
}

async function deleteBrainMemory(memory) {
  if (
    !window.confirm(
      `Supprimer définitivement la mémoire « ${memory.title} » ?`
    )
  ) {
    return;
  }

  try {
    await memoryApiRequest(
      "DELETE",
      null,
      `?id=${encodeURIComponent(memory.id)}`
    );

    ariaState.savedMemories = ariaState.savedMemories.filter(
      (item) => item.id !== memory.id
    );

    renderBrainMemories();
    getElement("brain-dialog-status").textContent =
      "Mémoire supprimée.";
    updateBrainIndicator();
  } catch (error) {
    console.error("Memory deletion failed:", error);
    getElement("brain-dialog-status").textContent =
      getReadableError(error);
  }
}

function initializeVoiceRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceButton = getElement("voice-button");
  const mainVoiceButton = getElement("voice-main-button");

  if (!Recognition) {
    voiceButton.disabled = true;
    mainVoiceButton.disabled = true;
    voiceButton.title = "La dictée vocale n’est pas disponible dans ce navigateur.";
    setVoiceStatus(
      "Reconnaissance vocale indisponible",
      "Utilise le clavier ou essaie Microsoft Edge / Google Chrome."
    );
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "fr-BE";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    ariaState.isListening = true;
    ariaState.recognitionFailed = false;
    updateVoiceButton();
    updateVoiceInterface();

    if (["voiceTurn", "roomInterview"].includes(ariaState.recognitionMode)) {
      setState("listening", "Je t’écoute…", "Parle naturellement. Appuie à nouveau pour envoyer immédiatement.");
      setVoiceStatus("Je t’écoute…", "Parle naturellement, puis marque une courte pause.");
    } else {
      setState("listening", "Dictée en cours…", "Le texte sera placé dans la zone de saisie.");
    }
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }

    const cleanTranscript = transcript.trim();
    getElement("command-input").value = cleanTranscript;

    if (ariaState.recognitionMode === "voiceTurn") {
      ariaState.voiceTranscript = cleanTranscript;
      getElement("voice-live-transcript").textContent =
        cleanTranscript || "Je t’écoute…";
    }
  };

  recognition.onerror = (event) => {
    ariaState.recognitionFailed = true;
    setState("error", "La reconnaissance vocale s’est interrompue.", getVoiceErrorMessage(event.error));
    setVoiceStatus("Je n’ai pas pu t’entendre.", getVoiceErrorMessage(event.error));
  };

  recognition.onend = () => {
    const completedMode = ariaState.recognitionMode;
    const transcript = getElement("command-input").value.trim();

    ariaState.isListening = false;
    ariaState.recognitionMode = null;
    updateVoiceButton();
    updateVoiceInterface();

    if (
      completedMode === "roomInterview" &&
      typeof ariaState.roomVoiceCaptureHandler === "function"
    ) {
      const handler = ariaState.roomVoiceCaptureHandler;
      ariaState.roomVoiceCaptureHandler = null;

      if (ariaState.recognitionFailed) {
        return;
      }

      if (transcript) {
        getElement("command-input").value = "";
        ariaState.voiceTranscript = "";
        handler(transcript);
      } else {
        setState(
          "idle",
          "Je n’ai rien entendu.",
          "Relance l’écoute ou réponds par écrit."
        );
      }
      return;
    }

    if (completedMode === "voiceTurn") {
      if (ariaState.recognitionFailed) {
        ariaState.voiceTranscript = "";
        return;
      }

      if (transcript) {
        if (handlePendingMemoryVoiceCommand(transcript)) {
          getElement("command-input").value = "";
          ariaState.voiceTranscript = "";
          return;
        }

        setVoiceStatus("Instruction reçue.", "ARIA prépare sa réponse.");
        window.setTimeout(() => handleCommand({ source: "voice" }), 80);
      } else {
        setState("idle", "ARIA est prête.", getModeDetail());
        setVoiceStatus("Je n’ai rien entendu.", "Appuie à nouveau pour réessayer.");
      }
      return;
    }

    if (ariaState.mode === "listening") {
      const hasText = transcript.length > 0;
      setState(
        "idle",
        hasText ? "Dictée terminée." : "ARIA est prête.",
        hasText ? "Relis le texte, puis clique sur Envoyer." : getModeDetail()
      );
    }
  };

  ariaState.recognition = recognition;
}

function handleMainVoiceButton() {
  if (!ariaState.accessToken) {
    openAccessDialog();
    return;
  }

  if (ariaState.isSpeaking) {
    cancelSpeech();
    return;
  }

  if (ariaState.isListening && ariaState.recognitionMode === "voiceTurn") {
    stopVoiceRecognition();
    return;
  }

  if (ariaState.isBusy) return;
  startVoiceTurn();
}

function startVoiceTurn() {
  if (!ariaState.recognition) {
    setVoiceStatus(
      "Reconnaissance vocale indisponible",
      "Utilise le clavier pour continuer."
    );
    return;
  }

  cancelSpeech(false);
  ariaState.recognitionMode = "voiceTurn";
  ariaState.voiceTranscript = "";
  ariaState.recognitionFailed = false;
  getElement("command-input").value = "";
  getElement("voice-live-transcript").textContent = "Activation du microphone…";

  try {
    ariaState.recognition.start();
  } catch (error) {
    ariaState.recognitionMode = null;
    console.error("Voice turn start error:", error);
    setState("error", "Impossible de démarrer l’écoute.", getReadableError(error));
    setVoiceStatus("Microphone indisponible", getReadableError(error));
  }
}


window.startAriaRoomVoiceCapture = function startAriaRoomVoiceCapture(
  handler
) {
  if (
    typeof handler !== "function" ||
    !ariaState.recognition
  ) {
    return false;
  }

  cancelSpeech(false);
  ariaState.roomVoiceCaptureHandler = handler;
  ariaState.recognitionMode = "roomInterview";
  ariaState.voiceTranscript = "";
  ariaState.recognitionFailed = false;
  getElement("command-input").value = "";
  getElement("voice-live-transcript").textContent =
    "Réponds à la question…";

  try {
    ariaState.recognition.start();
    return true;
  } catch (error) {
    ariaState.roomVoiceCaptureHandler = null;
    ariaState.recognitionMode = null;
    console.error("Room interview voice start error:", error);
    setState(
      "error",
      "Impossible de démarrer l’écoute.",
      getReadableError(error)
    );
    return false;
  }
};

function stopVoiceRecognition() {
  if (!ariaState.recognition || !ariaState.isListening) return;

  try {
    ariaState.recognition.stop();
    setVoiceStatus("Envoi en cours…", "ARIA traite ce que tu viens de dire.");
  } catch (error) {
    console.error("Voice recognition stop error:", error);
  }
}

function toggleVoiceRecognition() {
  if (!ariaState.recognition) return;

  if (ariaState.isSpeaking) {
    cancelSpeech();
  }

  try {
    if (ariaState.isListening) {
      ariaState.recognition.stop();
    } else {
      ariaState.recognitionMode = "dictation";
      ariaState.recognitionFailed = false;
      ariaState.recognition.start();
    }
  } catch (error) {
    ariaState.recognitionMode = null;
    console.error("Voice recognition error:", error);
    setState("error", "Impossible de démarrer la dictée.", getReadableError(error));
  }
}

function updateVoiceButton() {
  const button = getElement("voice-button");
  button.classList.toggle("listening", ariaState.isListening);
  button.setAttribute(
    "aria-label",
    ariaState.isListening ? "Arrêter la dictée vocale" : "Démarrer la dictée vocale"
  );
}


function getVoiceErrorMessage(code) {
  const messages = {
    "not-allowed": "Autorise l’accès au microphone dans les réglages du navigateur.",
    "service-not-allowed": "Le service vocal est bloqué par le navigateur ou l’organisation.",
    "no-speech": "Aucune parole n’a été détectée.",
    "audio-capture": "Aucun microphone utilisable n’a été trouvé.",
    "network": "Le service de dictée vocale n’est pas joignable.",
    "aborted": "La dictée a été arrêtée."
  };

  return messages[code] || `Erreur de dictée : ${code || "inconnue"}.`;
}


function loadVoiceSettings() {
  try {
    const autoSpeak = localStorage.getItem(config.autoSpeakKey);
    const rate = Number(localStorage.getItem(config.speechRateKey));
    const voiceName = localStorage.getItem(config.speechVoiceKey);

    ariaState.autoSpeak = autoSpeak === null ? false : autoSpeak === "true";
    ariaState.speechRate = Number.isFinite(rate) && rate >= 0.5 && rate <= 2
      ? rate
      : 1;
    ariaState.preferredVoiceName = voiceName || "openai:coral";
  } catch (error) {
    console.warn("Unable to restore voice settings:", error);
    ariaState.preferredVoiceName = "openai:coral";
  }
}

function saveVoiceSettings() {
  ariaState.autoSpeak = getElement("auto-speak-toggle").checked;
  ariaState.speechRate = Number(getElement("speech-rate-select").value) || 1;
  ariaState.preferredVoiceName =
    getElement("speech-voice-select").value || "openai:coral";

  try {
    localStorage.setItem(config.autoSpeakKey, String(ariaState.autoSpeak));
    localStorage.setItem(config.speechRateKey, String(ariaState.speechRate));
    localStorage.setItem(config.speechVoiceKey, ariaState.preferredVoiceName);
  } catch (error) {
    console.warn("Unable to save voice settings:", error);
  }

  if (!ariaState.autoSpeak && ariaState.isSpeaking) {
    cancelSpeech();
  }

  updateVoiceOutputIndicator();
}


function toggleVoiceOutput() {
  ariaState.autoSpeak = !ariaState.autoSpeak;
  getElement("auto-speak-toggle").checked = ariaState.autoSpeak;
  saveVoiceSettings();

  if (!ariaState.autoSpeak) {
    cancelSpeech(false);

    const activeElement = document.activeElement;
    const voiceConsole = getElement("voice-console");

    if (
      activeElement instanceof HTMLElement &&
      voiceConsole.contains(activeElement)
    ) {
      activeElement.blur();
    }

    setState(
      "idle",
      "Mode vocal désactivé.",
      "ARIA continue de fonctionner en mode texte."
    );
  } else {
    setVoiceStatus(
      "Mode vocal activé.",
      "Appuie sur le bouton central pour parler à ARIA."
    );
    setState(
      "idle",
      "Mode vocal activé.",
      "Les prochaines réponses pourront être lues à voix haute."
    );
  }

  updateVoiceOutputIndicator();
}

function updateVoiceOutputIndicator() {
  if (!domReady) return;

  const indicator = getElement("voice-output-indicator");
  const voiceConsole = getElement("voice-console");
  const enabled = Boolean(ariaState.autoSpeak);
  const connected = Boolean(ariaState.accessToken);
  const shouldShowConsole = enabled && connected;

  indicator.textContent = "Mode vocal";
  indicator.classList.toggle("connected", enabled);
  indicator.setAttribute("aria-pressed", String(enabled));
  indicator.setAttribute(
    "aria-label",
    enabled
      ? "Désactiver le mode vocal"
      : "Activer le mode vocal"
  );
  indicator.title = enabled
    ? "Mode vocal activé — cliquer pour le désactiver"
    : "Mode vocal désactivé — cliquer pour l’activer";

  // Triple verrouillage visuel :
  // 1. attribut hidden
  // 2. classe CSS globale
  // 3. style inline explicite
  voiceConsole.hidden = !shouldShowConsole;
  voiceConsole.setAttribute(
    "aria-hidden",
    String(!shouldShowConsole)
  );
  voiceConsole.classList.toggle(
    "voice-console-force-hidden",
    !shouldShowConsole
  );
  voiceConsole.style.display = shouldShowConsole
    ? ""
    : "none";

  document.body.classList.toggle(
    "voice-mode-disabled",
    !enabled
  );

  if ("inert" in voiceConsole) {
    voiceConsole.inert = !shouldShowConsole;
  }
}

function initializeSpeechSynthesis() {
  ariaState.speechSupported = Boolean(
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );

  getElement("auto-speak-toggle").checked = ariaState.autoSpeak;
  getElement("speech-rate-select").value = String(ariaState.speechRate);

  populateSpeechVoices();

  if (ariaState.speechSupported) {
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        populateSpeechVoices
      );
    } else {
      window.speechSynthesis.onvoiceschanged = populateSpeechVoices;
    }
  }
}

function populateSpeechVoices() {
  const select = getElement("speech-voice-select");
  const previousValue = ariaState.preferredVoiceName || "openai:coral";
  const voices = ariaState.speechSupported
    ? window.speechSynthesis
        .getVoices()
        .filter((voice) =>
          String(voice.lang || "").toLowerCase().startsWith("fr")
        )
        .sort((a, b) => {
          const aBelgian =
            String(a.lang).toLowerCase() === "fr-be" ? 0 : 1;
          const bBelgian =
            String(b.lang).toLowerCase() === "fr-be" ? 0 : 1;
          return (
            aBelgian - bBelgian ||
            a.name.localeCompare(b.name, "fr")
          );
        })
    : [];

  select.replaceChildren();

  const openAIOption = document.createElement("option");
  openAIOption.value = "openai:coral";
  openAIOption.textContent = "ARIA — voix IA féminine Coral";
  select.append(openAIOption);

  const browserAutomaticOption = document.createElement("option");
  browserAutomaticOption.value = "browser:auto";
  browserAutomaticOption.textContent = ariaState.speechSupported
    ? "Voix locale de secours — automatique"
    : "Voix locale indisponible";
  browserAutomaticOption.disabled = !ariaState.speechSupported;
  select.append(browserAutomaticOption);

  for (const voice of voices) {
    const option = document.createElement("option");
    option.value = `browser:${voice.name}`;
    option.textContent = `Voix locale — ${voice.name} (${voice.lang})`;
    select.append(option);
  }

  const availableValues = [...select.options].map(
    (option) => option.value
  );

  select.value = availableValues.includes(previousValue)
    ? previousValue
    : "openai:coral";

  ariaState.preferredVoiceName = select.value;
}

function getSelectedBrowserVoice() {
  if (!ariaState.speechSupported) return null;

  const voices = window.speechSynthesis.getVoices();
  const selected = String(ariaState.preferredVoiceName || "");

  if (selected.startsWith("browser:") && selected !== "browser:auto") {
    const requestedName = selected.slice("browser:".length);
    const preferred = voices.find(
      (voice) => voice.name === requestedName
    );
    if (preferred) return preferred;
  }

  return (
    voices.find(
      (voice) => String(voice.lang).toLowerCase() === "fr-be"
    ) ||
    voices.find(
      (voice) => String(voice.lang).toLowerCase() === "fr-fr"
    ) ||
    voices.find(
      (voice) =>
        String(voice.lang).toLowerCase().startsWith("fr")
    ) ||
    null
  );
}

function prepareTextForSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " Extrait de code non lu. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " lien ")
    .replace(/[#>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechText(text, maxLength = 240) {
  const prepared = prepareTextForSpeech(text);
  if (!prepared) return [];

  const sentences =
    prepared.match(/[^.!?;:]+[.!?;:]?|\S+/g) || [prepared];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current
      ? `${current} ${sentence.trim()}`
      : sentence.trim();

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (sentence.length <= maxLength) {
      current = sentence.trim();
    } else {
      const words = sentence.trim().split(/\s+/);
      current = "";

      for (const word of words) {
        const wordCandidate = current ? `${current} ${word}` : word;

        if (wordCandidate.length > maxLength && current) {
          chunks.push(current);
          current = word;
        } else {
          current = wordCandidate;
        }
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function getSpeechSpeedProfile() {
  if (ariaState.speechRate <= 0.9) return "calm";
  if (ariaState.speechRate >= 1.1) return "fast";
  return "normal";
}

async function speakText(text) {
  if (!ariaState.autoSpeak) return;

  const prepared = prepareTextForSpeech(text).slice(0, 4096);
  if (!prepared) return;

  cancelSpeech(false);
  ariaState.isSpeaking = true;
  setState(
    "speaking",
    "ARIA répond…",
    "Appuie sur le bouton central pour interrompre la voix."
  );
  setVoiceStatus(
    "ARIA te répond.",
    ariaState.preferredVoiceName === "openai:coral"
      ? "Voix IA Coral — appuie sur le bouton central pour l’interrompre."
      : "Voix locale — appuie sur le bouton central pour l’interrompre."
  );
  updateVoiceInterface();

  if (ariaState.preferredVoiceName === "openai:coral") {
    try {
      await speakWithOpenAI(prepared);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;

      console.warn("OpenAI speech unavailable, local fallback:", error);

      if (!ariaState.isSpeaking) return;

      if (ariaState.speechSupported) {
        setVoiceStatus(
          "Voix OpenAI indisponible.",
          "ARIA utilise temporairement la voix locale de secours."
        );
        speakWithBrowser(prepared);
        return;
      }

      finishSpeech();
      addMessage(
        "error",
        "La voix OpenAI n’est pas disponible et aucune voix locale de secours n’a été trouvée.",
        false
      );
      return;
    }
  }

  if (ariaState.speechSupported) {
    speakWithBrowser(prepared);
  } else {
    finishSpeech();
    addMessage(
      "error",
      "Aucune fonction de lecture vocale n’est disponible.",
      false
    );
  }
}

async function speakWithOpenAI(text) {
  const controller = new AbortController();
  ariaState.speechRequestController = controller;

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.speechRequestTimeoutMs) || 45000
  );

  try {
    const response = await fetch(config.speechApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ariaState.accessToken}`
      },
      body: JSON.stringify({
        text,
        voice: "coral",
        speedProfile: getSpeechSpeedProfile()
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : `La voix OpenAI a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      throw error;
    }

    const audioBlob = await response.blob();

    if (!audioBlob.size) {
      throw new Error("Le fichier audio OpenAI est vide.");
    }

    if (!ariaState.isSpeaking) return;

    cleanupRemoteAudio();

    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(objectUrl);

    ariaState.remoteAudio = audio;
    ariaState.remoteAudioUrl = objectUrl;

    audio.preload = "auto";
    audio.volume = 1;

    audio.addEventListener(
      "ended",
      () => finishSpeech(),
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        if (!ariaState.isSpeaking) return;

        const fallbackText = text;
        cleanupRemoteAudio();

        if (ariaState.speechSupported) {
          setVoiceStatus(
            "Lecture audio interrompue.",
            "ARIA utilise la voix locale de secours."
          );
          speakWithBrowser(fallbackText);
        } else {
          finishSpeech();
        }
      },
      { once: true }
    );

    try {
      await audio.play();
    } catch (error) {
      cleanupRemoteAudio();
      throw error;
    }
  } finally {
    window.clearTimeout(timeoutId);

    if (ariaState.speechRequestController === controller) {
      ariaState.speechRequestController = null;
    }
  }
}

function speakWithBrowser(text) {
  if (!ariaState.speechSupported) {
    finishSpeech();
    return;
  }

  const chunks = splitSpeechText(text);
  if (!chunks.length) {
    finishSpeech();
    return;
  }

  ariaState.speechQueue = chunks;
  speakNextBrowserChunk();
}

function speakNextBrowserChunk() {
  if (!ariaState.isSpeaking || !ariaState.speechQueue.length) {
    finishSpeech();
    return;
  }

  const text = ariaState.speechQueue.shift();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSelectedBrowserVoice();

  utterance.lang = voice?.lang || "fr-BE";
  utterance.voice = voice;
  utterance.rate = ariaState.speechRate;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
    ariaState.currentUtterance = null;
    speakNextBrowserChunk();
  };

  utterance.onerror = (event) => {
    if (
      event.error !== "canceled" &&
      event.error !== "interrupted"
    ) {
      console.warn("Speech synthesis error:", event.error);
    }
    finishSpeech();
  };

  ariaState.currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function cleanupRemoteAudio() {
  if (ariaState.remoteAudio) {
    try {
      ariaState.remoteAudio.pause();
      ariaState.remoteAudio.removeAttribute("src");
      ariaState.remoteAudio.load();
    } catch (error) {
      console.warn("Unable to clean remote audio:", error);
    }
  }

  if (ariaState.remoteAudioUrl) {
    URL.revokeObjectURL(ariaState.remoteAudioUrl);
  }

  ariaState.remoteAudio = null;
  ariaState.remoteAudioUrl = "";
}

function cancelSpeech(updateStatus = true) {
  if (ariaState.speechRequestController) {
    ariaState.speechRequestController.abort();
    ariaState.speechRequestController = null;
  }

  cleanupRemoteAudio();

  if (ariaState.speechSupported) {
    window.speechSynthesis.cancel();
  }

  ariaState.speechQueue = [];
  ariaState.currentUtterance = null;

  const wasSpeaking = ariaState.isSpeaking;
  ariaState.isSpeaking = false;

  if (wasSpeaking && updateStatus) {
    setState(
      "idle",
      "Réponse interrompue.",
      "ARIA est prête à t’écouter."
    );
    setVoiceStatus(
      "Voix interrompue.",
      "Appuie sur le bouton central pour parler."
    );
  }

  updateVoiceInterface();
}

function finishSpeech() {
  if (ariaState.speechRequestController) {
    ariaState.speechRequestController.abort();
    ariaState.speechRequestController = null;
  }

  cleanupRemoteAudio();
  ariaState.speechQueue = [];
  ariaState.currentUtterance = null;
  ariaState.isSpeaking = false;

  setState("idle", "ARIA est prête.", getModeDetail());
  setVoiceStatus(
    "À ton écoute.",
    "Appuie sur le bouton central pour parler."
  );
  updateVoiceInterface();
}

function setVoiceStatus(title, detail) {
  if (!domReady) return;
  getElement("voice-console-title").textContent = title;
  getElement("voice-status-text").textContent = detail;
}

function updateVoiceInterface() {
  if (!domReady) return;

  const connected = Boolean(ariaState.accessToken);
  const consolePanel = getElement("voice-console");
  const mainButton = getElement("voice-main-button");
  const icon = getElement("voice-main-icon");
  const label = getElement("voice-main-label");
  const transcript = getElement("voice-live-transcript");
  const stopButton = getElement("stop-speech-button");

  // La visibilité finale de la carte est centralisée dans
  // updateVoiceOutputIndicator afin d'éviter les états contradictoires.
  stopButton.hidden = !ariaState.isSpeaking;

  mainButton.classList.toggle("listening", ariaState.isListening);
  mainButton.classList.toggle("speaking", ariaState.isSpeaking);
  mainButton.classList.toggle("thinking", ariaState.isBusy);

  if (!connected) {
    mainButton.disabled = true;
    icon.textContent = "🔒";
    label.textContent = "Connexion requise";
  } else if (ariaState.isBusy) {
    mainButton.disabled = true;
    icon.textContent = "◌";
    label.textContent = "ARIA réfléchit";
  } else if (ariaState.isSpeaking) {
    mainButton.disabled = false;
    icon.textContent = "■";
    label.textContent = "Interrompre ARIA";
  } else if (ariaState.isListening && ariaState.recognitionMode === "voiceTurn") {
    mainButton.disabled = false;
    icon.textContent = "↑";
    label.textContent = "Envoyer maintenant";
  } else {
    mainButton.disabled = !ariaState.recognition;
    icon.textContent = "🎙";
    label.textContent = "Parler à ARIA";
  }

  if (!ariaState.isListening && !ariaState.voiceTranscript && !ariaState.isSpeaking) {
    transcript.textContent = "En attente de ta voix.";
  }

  updateVoiceOutputIndicator();
}




function buildDocumentAnalysisStoragePayload() {
  if (
    !ariaState.documentAnalysis ||
    !ariaState.pendingPdf
  ) {
    return null;
  }

  return {
    pathname:
      ariaState.pendingPdf.pathname,
    analysis:
      ariaState.documentAnalysis,
    editorMetadata:
      ariaState.documentEditorMetadata,
    editorSiteId:
      ariaState.documentEditorSiteId,
    cardCommitRevision:
      ariaState.documentCardCommitRevision,
    cardCommittedAt:
      ariaState.documentCardCommittedAt,
    saveSource:
      ariaState.documentSaveSource,
    saveWarning:
      ariaState.documentSaveWarning,
    savedAt:
      new Date().toISOString()
  };
}

function saveDocumentAnalysisSession() {
  const payload =
    buildDocumentAnalysisStoragePayload();

  for (
    const [storage, key]
    of [
      [
        sessionStorage,
        config.documentAnalysisSessionKey
      ],
      [
        localStorage,
        config.documentAnalysisPersistentKey
      ]
    ]
  ) {
    try {
      if (payload) {
        storage.setItem(
          key,
          JSON.stringify(payload)
        );
      } else {
        storage.removeItem(key);
      }
    } catch (error) {
      console.warn(
        "Impossible de mémoriser le classement documentaire.",
        error
      );
    }
  }
}

function loadDocumentAnalysisSession() {
  try {
    const raw =
      sessionStorage.getItem(
        config.documentAnalysisSessionKey
      ) ||
      localStorage.getItem(
        config.documentAnalysisPersistentKey
      );

    if (
      !raw ||
      !ariaState.pendingPdf
    ) {
      return;
    }

    const parsed = JSON.parse(raw);

    if (
      parsed?.pathname ===
        ariaState.pendingPdf.pathname &&
      parsed?.analysis &&
      typeof parsed.analysis ===
        "object"
    ) {
      ariaState.documentAnalysis =
        parsed.analysis;
      ariaState.documentEditorMetadata =
        parsed.editorMetadata &&
        typeof parsed.editorMetadata ===
          "object"
          ? parsed.editorMetadata
          : {
              ...parsed.analysis.metadata
            };
      ariaState.documentEditorSiteId =
        String(
          parsed.editorSiteId || ""
        );
      ariaState.documentCardCommitRevision =
        Number(
          parsed.cardCommitRevision
        ) || 0;
      ariaState.documentCardCommittedAt =
        String(
          parsed.cardCommittedAt || ""
        );
      ariaState.documentSaveSource =
        String(
          parsed.saveSource || ""
        );
      ariaState.documentSaveWarning =
        String(
          parsed.saveWarning || ""
        );
    }
  } catch (error) {
    console.warn(
      "Classement documentaire mémorisé invalide.",
      error
    );
    clearDocumentAnalysis(false);
  }
}

function clearDocumentAnalysis(
  updateInterface = true
) {
  ariaState.documentAnalysis = null;
  ariaState.documentAnalysisError = null;
  ariaState.documentAnalysisDiagnostics = null;
  ariaState.documentEditorMetadata = null;
  ariaState.documentEditorSiteId = "";
  ariaState.documentEditorBusy = false;
  ariaState.documentDownloadBusy = false;
  ariaState.documentDownloadUrl = "";
  ariaState.documentDownloadFilename = "";
  ariaState.documentDownloadProgress = 0;

  if (
    ariaState.documentDownloadObjectUrl
  ) {
    URL.revokeObjectURL(
      ariaState.documentDownloadObjectUrl
    );
    ariaState.documentDownloadObjectUrl =
      "";
  }

  if (domReady) {
    const downloadPanel =
      document.getElementById(
        "document-download-ready"
      );

    if (downloadPanel) {
      downloadPanel.hidden = true;
    }
  }

  if (
    ariaState.documentDownloadFallbackTimer
  ) {
    window.clearTimeout(
      ariaState.documentDownloadFallbackTimer
    );
    ariaState.documentDownloadFallbackTimer =
      null;
  }

  ariaState.documentEditMode = false;
  ariaState.documentEditSnapshot = null;
  ariaState.documentEditorDirty = false;
  ariaState.documentCardCommitRevision = 0;
  ariaState.documentCardCommittedAt = "";
  ariaState.documentSaveSource = "";
  ariaState.documentSaveWarning = "";

  if (
    ariaState.documentEditorNormalizationTimer
  ) {
    window.clearTimeout(
      ariaState.documentEditorNormalizationTimer
    );
    ariaState.documentEditorNormalizationTimer =
      null;
  }

  stopDocumentAnalysisProgress(0);
  ariaState.documentAnalysisStage = "";
  saveDocumentAnalysisSession();

  if (updateInterface && domReady) {
    updateDocumentAnalysisInterface();
  }
}

async function requestDocumentClassification(
  pdf
) {
  const controller =
    new AbortController();
  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      Number(
        config.documentRequestTimeoutMs
      ) || 180000
    );

  try {
    const response = await fetch(
      config.documentApiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "Authorization":
            `Bearer ${ariaState.accessToken}`
        },
        body: JSON.stringify({
          action: "classify",
          pdf: {
            pathname: pdf.pathname,
            name: pdf.name,
            size: pdf.size,
            detail:
              pdf.detail || "auto"
          },
          client: {
            name: "ARIA-web",
            version:
              config.version || "1.5.3"
          }
        }),
        signal: controller.signal
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof data.error ===
          "string" &&
        data.error.trim()
          ? data.error
          : `Le classement a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      error.requestId =
        data.requestId || null;
      error.stage =
        data.stage || null;
      error.retryable =
        Boolean(data.retryable);
      error.diagnosticCode =
        data.diagnosticCode || null;
      throw error;
    }

    if (
      !data.classification ||
      typeof data.classification !==
        "object"
    ) {
      throw new Error(
        "ARIA Core n’a renvoyé aucun classement exploitable."
      );
    }

    return {
      classification:
        data.classification,
      diagnostics:
        data.diagnostics || null
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}


function getAnalysisProgressStage(
  progress
) {
  if (progress < 15) {
    return "Préparation du document";
  }

  if (progress < 30) {
    return "Chargement des référentiels BRAIN";
  }

  if (progress < 50) {
    return "Lecture du texte et des pages";
  }

  if (progress < 70) {
    return "Extraction des métadonnées";
  }

  if (progress < 86) {
    return "Validation des codes officiels";
  }

  return "Construction du nom proposé";
}

function stopDocumentAnalysisProgress(
  finalProgress = null
) {
  if (
    ariaState
      .documentAnalysisProgressTimer
  ) {
    window.clearInterval(
      ariaState
        .documentAnalysisProgressTimer
    );
  }

  ariaState
    .documentAnalysisProgressTimer =
      null;

  if (
    Number.isFinite(
      finalProgress
    )
  ) {
    ariaState
      .documentAnalysisProgress =
        Math.max(
          0,
          Math.min(
            100,
            finalProgress
          )
        );
  }

  ariaState.documentAnalysisStage =
    getAnalysisProgressStage(
      ariaState
        .documentAnalysisProgress
    );

  updateDocumentAnalysisProgressInterface();
}

function startDocumentAnalysisProgress() {
  stopDocumentAnalysisProgress(6);

  ariaState.documentAnalysisStage =
    "Préparation du document";

  updateDocumentAnalysisProgressInterface();

  ariaState
    .documentAnalysisProgressTimer =
      window.setInterval(
        () => {
          const current =
            ariaState
              .documentAnalysisProgress;

          let increment = 0;

          if (current < 25) {
            increment = 3;
          } else if (current < 55) {
            increment = 2;
          } else if (current < 78) {
            increment = 1;
          } else if (current < 92) {
            increment = 0.5;
          }

          ariaState
            .documentAnalysisProgress =
              Math.min(
                92,
                current + increment
              );

          ariaState
            .documentAnalysisStage =
              getAnalysisProgressStage(
                ariaState
                  .documentAnalysisProgress
              );

          updateDocumentAnalysisProgressInterface();
        },
        900
      );
}

function updateDocumentAnalysisProgressInterface() {
  if (!domReady) return;

  const block = getElement(
    "document-analysis-progress"
  );
  const bar = getElement(
    "document-analysis-progress-bar"
  );
  const label = getElement(
    "document-analysis-progress-label"
  );
  const value = getElement(
    "document-analysis-progress-value"
  );

  const visible =
    ariaState.documentAnalysisBusy ||
    (
      ariaState
        .documentAnalysisProgress >
        0 &&
      ariaState
        .documentAnalysisProgress <
        100
    );

  block.hidden = !visible;

  const progress =
    Math.round(
      ariaState
        .documentAnalysisProgress
    );

  bar.value = progress;
  value.textContent =
    `${progress} %`;
  label.textContent =
    ariaState.documentAnalysisStage ||
    "Préparation de l’analyse";
}

async function classifyPendingPdf() {
  if (
    ariaState.documentAnalysisBusy ||
    ariaState.isBusy
  ) {
    return;
  }

  const pdf = ariaState.pendingPdf;

  if (!pdf) {
    setState(
      "error",
      "Aucun PDF actif.",
      "Ajoute un PDF avant de lancer le classement."
    );
    return;
  }

  if (!ariaState.accessToken) {
    setState(
      "idle",
      "Connexion requise.",
      "Connecte ARIA Core avant de classer le PDF."
    );
    openAccessDialog();
    return;
  }

  ariaState.documentAnalysisBusy = true;
  ariaState.documentAnalysisError = null;
  ariaState.documentAnalysisDiagnostics = null;
  startDocumentAnalysisProgress();
  updateDocumentAnalysisInterface();
  updatePdfAttachmentInterface();

  setState(
    "thinking",
    "Classement du document…",
    "ARIA analyse les pages et recherche les métadonnées de nommage."
  );

  try {
    const result =
      await requestDocumentClassification(
        pdf
      );

    const classification =
      result.classification;

    ariaState.documentAnalysis =
      classification;
    ariaState.documentAnalysisDiagnostics =
      result.diagnostics;
    ariaState.documentAnalysisError =
      null;
    ariaState.documentEditorMetadata = {
      ...classification.metadata
    };
    ariaState.documentEditorSiteId = "";
    ariaState.documentEditMode = false;
    ariaState.documentEditSnapshot = null;
    ariaState.documentEditorDirty = false;
    stopDocumentAnalysisProgress(100);

    await loadDocumentEditorReferences()
      .catch((error) => {
        console.warn(
          "Référentiels éditeur indisponibles.",
          error
        );
      });

    resolveEditorSiteIdFromMetadata();
    commitDocumentCards({
      manuallyValidated: false,
      persist: true
    });
    updateDocumentAnalysisInterface();

    const missingCount =
      Array.isArray(
        classification.missing_fields
      )
        ? classification
            .missing_fields
            .length
        : 0;

    setState(
      "idle",
      "Classement terminé.",
      missingCount > 0
        ? `${missingCount} champ(s) restent à compléter.`
        : "Le nom proposé contient tous les champs requis."
    );

    window.requestAnimationFrame(
      () => {
        const resultElement =
          getElement(
            "document-analysis-content"
          );

        setElementDisplayed(
          resultElement,
          true,
          "grid"
        );

        resultElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    );
  } catch (error) {
    console.error(
      "Document classification failed:",
      error
    );

    if (error.status === 401) {
      clearAccessToken();
      openAccessDialog();
    }

    const stageLabel =
      error?.stage
        ? `Étape : ${error.stage}. `
        : "";

    stopDocumentAnalysisProgress(0);

    ariaState.documentAnalysisError = {
      message:
        getReadableError(error),
      stage:
        error?.stage || null,
      code:
        error?.diagnosticCode ||
        (
          error?.stage
            ? `ARIA-DOC-${error.stage}-${error.status || "error"}`
            : null
        )
    };

    updateDocumentAnalysisInterface();

    setState(
      "error",
      "Classement impossible.",
      `${stageLabel}${getReadableError(error)}`
    );
  } finally {
    ariaState.documentAnalysisBusy =
      false;

    if (
      ariaState
        .documentAnalysisProgress >=
        100
    ) {
      window.setTimeout(
        () => {
          ariaState
            .documentAnalysisProgress =
              0;
          ariaState
            .documentAnalysisStage =
              "";
          updateDocumentAnalysisProgressInterface();
        },
        550
      );
    }

    updateDocumentAnalysisInterface();
    updatePdfAttachmentInterface();
    updateDocumentAnalysisProgressInterface();
  }
}

function createMetadataItem(
  label,
  value
) {
  const item =
    document.createElement("div");
  item.className =
    "document-metadata-item";

  const key =
    document.createElement("span");
  key.textContent = label;

  const content =
    document.createElement("strong");
  content.textContent =
    value || "Non détecté";
  content.classList.toggle(
    "missing",
    !value
  );

  item.append(
    key,
    content
  );

  return item;
}

function fillStringList(
  listElement,
  values,
  formatter = (value) => value
) {
  listElement.replaceChildren();

  for (const value of values) {
    const item =
      document.createElement("li");
    item.textContent =
      formatter(value);
    listElement.append(item);
  }
}


function setElementDisplayed(
  element,
  displayed,
  displayValue = "grid"
) {
  element.hidden = !displayed;

  if (displayed) {
    element.removeAttribute(
      "hidden"
    );
    element.style.display =
      displayValue;
  } else {
    element.setAttribute(
      "hidden",
      ""
    );
    element.style.display =
      "none";
  }
}



function getOfficialDocumentTypeLabel(
  typeCode
) {
  const code =
    String(typeCode || "")
      .trim()
      .toUpperCase();

  return (
    ariaState
      .documentEditorReferences
      ?.documentTypes
      ?.find(
        (type) =>
          type.code === code
      )
      ?.label ||
    code ||
    "Document"
  );
}

function buildDocumentPresentation(
  classification,
  {
    manuallyValidated = false
  } = {}
) {
  const metadata =
    classification?.metadata ||
    {};
  const typeCode =
    metadata.type_document ||
    metadata.effective_type ||
    "";
  const typeLabel =
    getOfficialDocumentTypeLabel(
      typeCode
    );

  const disciplineTechnique = [
    metadata.discipline,
    metadata.technique
  ]
    .filter(Boolean)
    .join(" / ");

  const location = [
    metadata.pole,
    metadata.site,
    metadata.bloc,
    metadata.etage,
    metadata.numero
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title:
      typeCode
        ? `${typeCode} — ${typeLabel}`
        : (
            classification
              ?.document_category
              ?.label ||
            "Classement du PDF"
          ),
    summary: [
      disciplineTechnique,
      location,
      metadata.description
    ]
      .filter(Boolean)
      .join(" · ") ||
      classification?.summary ||
      "Métadonnées documentaires enregistrées.",
    manuallyValidated:
      Boolean(manuallyValidated),
    updatedAt:
      new Date().toISOString()
  };
}

function commitDocumentCards(
  {
    manuallyValidated = false,
    persist = true
  } = {}
) {
  const analysis =
    ariaState.documentAnalysis;
  const pdf =
    ariaState.pendingPdf;

  if (!analysis) {
    return false;
  }

  const metadata = {
    ...(analysis.metadata || {}),
    ...(ariaState.documentEditorMetadata || {})
  };

  metadata.effective_type =
    metadata.type_document ||
    metadata.effective_type ||
    "";

  analysis.metadata = {
    ...metadata
  };
  ariaState.documentEditorMetadata = {
    ...metadata
  };

  const presentation =
    buildDocumentPresentation(
      analysis,
      {
        manuallyValidated
      }
    );

  const typeCode =
    metadata.type_document ||
    metadata.effective_type ||
    analysis.document_category
      ?.code ||
    "";

  const typeLabel =
    getOfficialDocumentTypeLabel(
      typeCode
    );

  analysis.document_category = {
    ...(analysis.document_category || {}),
    code:
      typeCode ||
      "INCONNU",
    label:
      typeLabel ||
      typeCode ||
      "Document"
  };

  analysis.presentation = {
    ...presentation,
    manuallyValidated:
      Boolean(manuallyValidated)
  };

  analysis.summary =
    presentation.summary;

  if (pdf) {
    pdf.originalName =
      pdf.originalName ||
      pdf.name;
    pdf.presentationName =
      analysis.suggested_filename ||
      "";
    pdf.presentationStatus =
      manuallyValidated
        ? "Métadonnées corrigées et enregistrées"
        : "Classement disponible";
  }

  ariaState.documentCardCommitRevision +=
    1;
  ariaState.documentCardCommittedAt =
    new Date().toISOString();

  if (persist) {
    saveDocumentAnalysisSession();
    savePendingPdfSession();
  }

  updateDocumentAnalysisInterface();
  updatePdfAttachmentInterface();
  refreshDirectPdfDownloadLink();

  if (domReady) {
    const commitStatus =
      getElement(
        "document-card-commit-status"
      );

    const commitTime =
      new Intl.DateTimeFormat(
        "fr-BE",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      ).format(
        new Date(
          ariaState
            .documentCardCommittedAt
        )
      );

    commitStatus.hidden = false;
    commitStatus.textContent =
      `Carte actualisée à ${commitTime} · révision ${ariaState.documentCardCommitRevision}`;

    const saveSourceStatus =
      getElement(
        "document-save-source-status"
      );

    saveSourceStatus.hidden = false;
    saveSourceStatus.textContent =
      ariaState.documentSaveSource ===
        "local_fallback"
        ? "Corrections conservées localement · validation Core à relancer"
        : "Corrections validées par ARIA Core";
    saveSourceStatus.classList.toggle(
      "warning",
      ariaState.documentSaveSource ===
        "local_fallback"
    );

    for (
      const cardId
      of [
        "pdf-attachment-card",
        "document-analysis-card"
      ]
    ) {
      const card =
        getElement(cardId);
      card.classList.remove(
        "presentation-updated"
      );
      void card.offsetWidth;
      card.classList.add(
        "presentation-updated"
      );
    }
  }

  return true;
}

function synchronizeDocumentPresentation(
  options = {}
) {
  return commitDocumentCards(
    options
  );
}

function deepCloneDocumentState(
  value
) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

async function startDocumentEditMode() {
  if (
    !ariaState.documentAnalysis ||
    ariaState.documentEditorBusy
  ) {
    return;
  }

  ariaState.documentEditSnapshot = {
    analysis:
      deepCloneDocumentState(
        ariaState.documentAnalysis
      ),
    metadata:
      deepCloneDocumentState(
        ariaState.documentEditorMetadata ||
        ariaState.documentAnalysis
          .metadata
      ),
    siteId:
      ariaState.documentEditorSiteId
  };

  await loadDocumentEditorReferences()
    .catch((error) => {
      setState(
        "error",
        "Référentiels indisponibles.",
        getReadableError(error)
      );
    });

  if (
    ariaState.documentEditorNormalizationTimer
  ) {
    window.clearTimeout(
      ariaState.documentEditorNormalizationTimer
    );
    ariaState.documentEditorNormalizationTimer =
      null;
  }

  ariaState.documentEditMode =
    true;
  ariaState.documentEditorDirty =
    false;

  renderDocumentEditorOptions();
  syncDocumentEditorValues();
  updateDocumentAnalysisInterface();

  const panel =
    getElement(
      "document-editor-panel"
    );
  panel.open = true;

  window.requestAnimationFrame(
    () =>
      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      })
  );
}

async function finishDocumentEditMode(
  downloadAfterSave = false
) {
  if (
    !ariaState.documentEditMode ||
    ariaState.documentEditorBusy
  ) {
    return;
  }

  if (
    ariaState.documentEditorNormalizationTimer
  ) {
    window.clearTimeout(
      ariaState.documentEditorNormalizationTimer
    );
    ariaState.documentEditorNormalizationTimer =
      null;
  }

  const metadata =
    readDocumentEditorMetadata();

  applyLocalDocumentEditorMetadata(
    metadata,
    {
      markDirty: true,
      saveSession: false
    }
  );

  const saveResult =
    await normalizeEditedDocumentMetadata(
      metadata
    );

  if (!saveResult?.ok) {
    getElement(
      "document-editor-panel"
    ).open = true;
    return;
  }

  ariaState.documentEditMode =
    false;
  ariaState.documentEditSnapshot =
    null;
  ariaState.documentEditorDirty =
    false;

  getElement(
    "document-editor-panel"
  ).open = false;

  commitDocumentCards({
    manuallyValidated: true,
    persist: true
  });

  setState(
    saveResult.coreValidated
      ? "idle"
      : "error",
    saveResult.coreValidated
      ? "Corrections enregistrées."
      : "Corrections enregistrées localement.",
    saveResult.coreValidated
      ? "Les valeurs saisies sont maintenant la proposition active."
      : "Les cartes ont été actualisées, mais la validation ARIA Core devra être relancée."
  );

  if (downloadAfterSave) {
    await downloadRenamedPdf();
  }
}

function cancelDocumentEditMode() {
  const snapshot =
    ariaState.documentEditSnapshot;

  if (snapshot) {
    ariaState.documentAnalysis =
      snapshot.analysis;
    ariaState.documentEditorMetadata =
      snapshot.metadata;
    ariaState.documentEditorSiteId =
      snapshot.siteId;
  }

  ariaState.documentEditMode =
    false;
  ariaState.documentEditSnapshot =
    null;
  ariaState.documentEditorDirty =
    false;

  if (
    ariaState
      .documentEditorNormalizationTimer
  ) {
    window.clearTimeout(
      ariaState
        .documentEditorNormalizationTimer
    );
    ariaState
      .documentEditorNormalizationTimer =
        null;
  }

  renderDocumentEditorOptions();
  syncDocumentEditorValues();

  getElement(
    "document-editor-panel"
  ).open = false;

  saveDocumentAnalysisSession();
  updateDocumentAnalysisInterface();

  setState(
    "idle",
    "Modifications annulées.",
    "La proposition précédente a été restaurée."
  );
}

const DOCUMENT_EDITOR_FIELD_IDS =
  Object.freeze({
    phase: "document-field-phase",
    pole: "document-field-pole",
    siteId: "document-field-site-id",
    bloc: "document-field-bloc",
    etage: "document-field-etage",
    numero: "document-field-numero",
    type_document: "document-field-type",
    discipline: "document-field-discipline",
    technique: "document-field-technique",
    indice: "document-field-indice",
    date: "document-field-date",
    description: "document-field-description"
  });

function normalizeEditorCode(
  value,
  maxLength = 30
) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9.-]+/g,
      "-"
    )
    .replace(/-{2,}/g, "-")
    .replace(
      /^[.-]+|[.-]+$/g,
      ""
    )
    .slice(0, maxLength);
}

function normalizeEditorFloor(
  value
) {
  const raw =
    normalizeEditorCode(
      value,
      20
    );

  if (/^N\d{1,2}$/.test(raw)) {
    return `N${raw
      .slice(1)
      .padStart(2, "0")}`;
  }

  if (/^S-?\d+$/.test(raw)) {
    const number = raw
      .replace(/^S-?/, "")
      .replace(/^0+/, "") ||
      "0";

    return `S-${number}`;
  }

  return raw;
}

function normalizeEditorRoomNumber(
  value
) {
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, "");

  const match = raw.match(
    /^(\d{1,3})(\.\d+)?$/
  );

  if (!match) {
    return normalizeEditorCode(
      raw,
      20
    );
  }

  return `${match[1].padStart(
    3,
    "0"
  )}${match[2] || ""}`;
}

function normalizeEditorDescription(
  value
) {
  return String(value || "")
    .normalize("NFC")
    .replace(
      /[<>:"/\\|?*\u0000-\u001F]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function documentPlaceholder(
  field
) {
  return `[${String(field)
    .toUpperCase()}]`;
}

function buildEditorFilename(
  metadata
) {
  const segments = [
    metadata.phase ||
      documentPlaceholder("phase"),
    metadata.pole ||
      documentPlaceholder("pole"),
    metadata.site ||
      documentPlaceholder("site"),
    metadata.bloc ||
      documentPlaceholder("bloc"),
    metadata.etage ||
      documentPlaceholder("etage"),
    metadata.numero ||
      documentPlaceholder("numero"),
    metadata.type_document ||
      documentPlaceholder("type"),
    metadata.discipline ||
      documentPlaceholder("discipline"),
    metadata.technique ||
      documentPlaceholder("technique")
  ];

  return [
    `${segments.join("_")}#${
      metadata.indice ||
      documentPlaceholder("indice")
    }`,
    metadata.date ||
      documentPlaceholder("date"),
    metadata.description ||
      documentPlaceholder("description")
  ].join("_") + ".pdf";
}

function getEditorMissingFields(
  metadata
) {
  return [
    "phase",
    "pole",
    "site",
    "bloc",
    "etage",
    "numero",
    "type_document",
    "discipline",
    "technique",
    "indice",
    "date",
    "description"
  ].filter(
    (field) =>
      !metadata?.[field]
  );
}

function createSelectOption(
  value,
  label,
  selected = false
) {
  const option =
    document.createElement(
      "option"
    );

  option.value =
    String(value || "");
  option.textContent =
    String(label || value || "");
  option.selected =
    Boolean(selected);

  return option;
}

async function loadDocumentEditorReferences() {
  if (
    ariaState.documentEditorReferences ||
    ariaState.documentEditorLoadBusy ||
    !ariaState.accessToken
  ) {
    return ariaState
      .documentEditorReferences;
  }

  ariaState.documentEditorLoadBusy =
    true;
  updateDocumentEditorInterface();

  try {
    const data =
      await knowledgeApiRequest(
        "POST",
        {
          action:
            "editor_references"
        }
      );

    if (
      !data.references ||
      typeof data.references !==
        "object"
    ) {
      throw new Error(
        "BRAIN Knowledge n’a renvoyé aucun référentiel documentaire."
      );
    }

    ariaState.documentEditorReferences =
      data.references;

    resolveEditorSiteIdFromMetadata();
    renderDocumentEditorOptions();

    return data.references;
  } finally {
    ariaState.documentEditorLoadBusy =
      false;
    updateDocumentEditorInterface();
  }
}

function getEditorSitesForPole(
  poleCode
) {
  const sites =
    ariaState
      .documentEditorReferences
      ?.sites || [];

  return sites.filter(
    (site) =>
      !poleCode ||
      site.poleCode ===
        poleCode
  );
}

function getEditorTechniquesForDiscipline(
  disciplineCode
) {
  const pairs =
    ariaState
      .documentEditorReferences
      ?.disciplineTechniques || [];

  return pairs.filter(
    (pair) =>
      !disciplineCode ||
      pair.disciplineCode ===
        disciplineCode
  );
}

function resolveEditorSiteIdFromMetadata() {
  const metadata =
    ariaState.documentEditorMetadata ||
    ariaState.documentAnalysis
      ?.metadata;

  const sites =
    ariaState
      .documentEditorReferences
      ?.sites || [];

  if (
    !metadata?.site ||
    sites.length === 0
  ) {
    return;
  }

  const candidates = sites.filter(
    (site) =>
      site.shortCode ===
        metadata.site &&
      (
        !metadata.pole ||
        site.poleCode ===
          metadata.pole
      )
  );

  if (candidates.length === 1) {
    ariaState.documentEditorSiteId =
      candidates[0].id;
  }
}

function renderDocumentEditorOptions() {
  if (
    !domReady ||
    !ariaState
      .documentEditorReferences
  ) {
    return;
  }

  const references =
    ariaState.documentEditorReferences;
  const metadata =
    ariaState.documentEditorMetadata ||
    ariaState.documentAnalysis
      ?.metadata ||
    {};

  const phaseSelect =
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.phase
    );
  phaseSelect.replaceChildren(
    createSelectOption(
      "",
      "À compléter"
    ),
    ...references.phases.map(
      (phase) =>
        createSelectOption(
          phase.code,
          `${phase.code} — ${phase.label}`,
          phase.code ===
            metadata.phase
        )
    )
  );

  const poleSelect =
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.pole
    );
  poleSelect.replaceChildren(
    createSelectOption(
      "",
      "À compléter"
    ),
    ...references.poles.map(
      (pole) =>
        createSelectOption(
          pole.code,
          `${pole.code} — ${pole.label}`,
          pole.code ===
            metadata.pole
        )
    )
  );

  const typeList =
    getElement(
      "document-type-options"
    );
  typeList.replaceChildren(
    ...references
      .documentTypes
      .map((type) => {
        const option =
          document.createElement(
            "option"
          );
        option.value =
          type.code;
        option.label =
          type.label;
        return option;
      })
  );

  const disciplineList =
    getElement(
      "document-discipline-options"
    );
  disciplineList.replaceChildren(
    ...references
      .disciplines
      .map((discipline) => {
        const option =
          document.createElement(
            "option"
          );
        option.value =
          discipline.code;
        option.label =
          discipline.label;
        return option;
      })
  );

  renderEditorSiteOptions();
  renderEditorTechniqueOptions();
}

function renderEditorSiteOptions() {
  if (
    !ariaState
      .documentEditorReferences
  ) {
    return;
  }

  const metadata =
    ariaState.documentEditorMetadata ||
    {};
  const select = getElement(
    DOCUMENT_EDITOR_FIELD_IDS.siteId
  );
  const sites =
    getEditorSitesForPole(
      metadata.pole
    );

  select.replaceChildren(
    createSelectOption(
      "",
      "À compléter"
    ),
    ...sites.map((site) => {
      const status =
        site.status &&
        site.status !== "active"
          ? ` · ${site.status}`
          : "";
      const locality =
        site.locality
          ? ` · ${site.locality}`
          : "";

      return createSelectOption(
        site.id,
        `${site.shortCode} — ${site.fullName}${locality}${status}`,
        site.id ===
          ariaState
            .documentEditorSiteId
      );
    })
  );
}

function renderEditorTechniqueOptions() {
  if (
    !ariaState
      .documentEditorReferences
  ) {
    return;
  }

  const metadata =
    ariaState.documentEditorMetadata ||
    {};
  const list = getElement(
    "document-technique-options"
  );
  const pairs =
    getEditorTechniquesForDiscipline(
      metadata.discipline
    );

  list.replaceChildren(
    ...pairs.map((pair) => {
      const option =
        document.createElement(
          "option"
        );
      option.value =
        pair.techniqueCode;
      option.label =
        pair.techniqueLabel;
      return option;
    })
  );
}

function syncDocumentEditorValues() {
  if (!domReady) return;

  const metadata =
    ariaState.documentEditorMetadata ||
    ariaState.documentAnalysis
      ?.metadata;

  if (!metadata) return;

  const directValues = {
    phase:
      metadata.phase,
    pole:
      metadata.pole,
    bloc:
      metadata.bloc,
    etage:
      metadata.etage,
    numero:
      metadata.numero,
    type_document:
      metadata.type_document ||
      metadata.effective_type,
    discipline:
      metadata.discipline,
    technique:
      metadata.technique,
    indice:
      metadata.indice,
    date:
      metadata.date,
    description:
      metadata.description
  };

  for (
    const [field, value]
    of Object.entries(
      directValues
    )
  ) {
    const element =
      getElement(
        DOCUMENT_EDITOR_FIELD_IDS[
          field
        ]
      );

    if (
      element &&
      document.activeElement !==
        element
    ) {
      element.value =
        String(value || "");
    }
  }

  const siteSelect =
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.siteId
    );

  if (
    document.activeElement !==
      siteSelect
  ) {
    siteSelect.value =
      ariaState
        .documentEditorSiteId ||
      "";
  }
}

function readDocumentEditorMetadata() {
  const references =
    ariaState.documentEditorReferences;
  const selectedSiteId =
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.siteId
    ).value;
  const selectedSite =
    references?.sites?.find(
      (site) =>
        site.id ===
        selectedSiteId
    );

  ariaState.documentEditorSiteId =
    selectedSiteId;

  return {
    phase:
      getElement(
        DOCUMENT_EDITOR_FIELD_IDS.phase
      ).value,
    pole:
      getElement(
        DOCUMENT_EDITOR_FIELD_IDS.pole
      ).value,
    site:
      selectedSite?.shortCode ||
      "",
    bloc:
      normalizeEditorCode(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS.bloc
        ).value,
        30
      ),
    etage:
      normalizeEditorFloor(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS.etage
        ).value
      ),
    numero:
      normalizeEditorRoomNumber(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS.numero
        ).value
      ),
    type_document:
      normalizeEditorCode(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS
            .type_document
        ).value,
        16
      ),
    discipline:
      normalizeEditorCode(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS
            .discipline
        ).value,
        16
      ),
    technique:
      normalizeEditorCode(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS
            .technique
        ).value,
        16
      ),
    indice:
      normalizeEditorCode(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS.indice
        ).value,
        20
      ),
    date:
      getElement(
        DOCUMENT_EDITOR_FIELD_IDS.date
      ).value,
    description:
      normalizeEditorDescription(
        getElement(
          DOCUMENT_EDITOR_FIELD_IDS
            .description
        ).value
      )
  };
}

function applyLocalDocumentEditorMetadata(
  metadata,
  {
    markDirty = true,
    saveSession = false
  } = {}
) {
  ariaState.documentEditorMetadata =
    metadata;

  if (markDirty) {
    ariaState.documentEditorDirty =
      true;
  }

  if (
    ariaState.documentAnalysis
  ) {
    const missing =
      getEditorMissingFields(
        metadata
      );

    ariaState.documentAnalysis = {
      ...ariaState.documentAnalysis,
      metadata: {
        ...metadata,
        effective_type:
          metadata.type_document
      },
      missing_fields:
        missing,
      suggested_filename:
        buildEditorFilename(
          metadata
        ),
      filename_complete:
        missing.length === 0
    };
  }

  if (saveSession) {
    saveDocumentAnalysisSession();
  }

  updateDocumentAnalysisInterface();
}

function handleDocumentEditorInput(
  event
) {
  if (
    !ariaState.documentAnalysis ||
    !ariaState.documentEditMode ||
    ariaState.documentEditorBusy
  ) {
    return;
  }

  const target = event.target;

  if (
    !(target instanceof HTMLElement)
  ) {
    return;
  }

  let metadata =
    readDocumentEditorMetadata();

  const poleChanged =
    target.id ===
      DOCUMENT_EDITOR_FIELD_IDS.pole;

  const disciplineChanged =
    target.id ===
      DOCUMENT_EDITOR_FIELD_IDS
        .discipline;

  if (poleChanged) {
    ariaState.documentEditorSiteId =
      "";
    metadata.site = "";
  }

  if (disciplineChanged) {
    metadata.technique = "";
  }

  if (
    target.id ===
      DOCUMENT_EDITOR_FIELD_IDS.siteId &&
    metadata.site
  ) {
    const site =
      ariaState
        .documentEditorReferences
        ?.sites
        ?.find(
          (item) =>
            item.id ===
              ariaState
                .documentEditorSiteId
        );

    if (
      site?.poleCode &&
      site.poleCode !==
        metadata.pole
    ) {
      metadata.pole =
        site.poleCode;
    }
  }

  applyLocalDocumentEditorMetadata(
    metadata,
    {
      markDirty: true,
      saveSession: false
    }
  );

  if (poleChanged) {
    renderEditorSiteOptions();
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.siteId
    ).value = "";
  }

  if (disciplineChanged) {
    renderEditorTechniqueOptions();
    getElement(
      DOCUMENT_EDITOR_FIELD_IDS.technique
    ).value = "";
  }

  updateDocumentEditorInterface();
}

function scheduleDocumentMetadataNormalization() {
  if (
    ariaState
      .documentEditorNormalizationTimer
  ) {
    window.clearTimeout(
      ariaState
        .documentEditorNormalizationTimer
    );
  }

  ariaState
    .documentEditorNormalizationTimer =
      window.setTimeout(
        normalizeEditedDocumentMetadata,
        550
      );
}

async function requestDocumentMetadataNormalization(
  metadata
) {
  const controller =
    new AbortController();
  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      Number(
        config.documentRequestTimeoutMs
      ) || 180000
    );

  try {
    const response = await fetch(
      config.documentApiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "Authorization":
            `Bearer ${ariaState.accessToken}`
        },
        body: JSON.stringify({
          action:
            "normalize_metadata",
          metadata,
          previousClassification:
            ariaState.documentAnalysis,
          sourceName:
            ariaState.pendingPdf?.name ||
            "document.pdf",
          client: {
            name: "ARIA-web",
            version:
              config.version ||
              "1.5.0"
          }
        }),
        signal:
          controller.signal
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error ||
        "La validation des métadonnées a échoué."
      );
      error.status =
        response.status;
      error.stage =
        data.stage || null;
      throw error;
    }

    if (
      !data.classification ||
      typeof data.classification !==
        "object"
    ) {
      throw new Error(
        "ARIA Core n’a renvoyé aucune validation exploitable."
      );
    }

    return data.classification;
  } finally {
    window.clearTimeout(
      timeoutId
    );
  }
}

const DOCUMENT_METADATA_FIELDS = [
  "phase",
  "pole",
  "site",
  "bloc",
  "etage",
  "numero",
  "type_document",
  "discipline",
  "technique",
  "indice",
  "date",
  "description"
];

function normalizeSubmittedMetadataValue(
  field,
  value
) {
  const raw = String(value || "");

  if (field === "description") {
    return normalizeEditorDescription(raw);
  }

  if (field === "etage") {
    return normalizeEditorFloor(raw);
  }

  if (field === "numero") {
    return normalizeEditorRoomNumber(raw);
  }

  if (
    [
      "bloc",
      "type_document",
      "discipline",
      "technique",
      "indice"
    ].includes(field)
  ) {
    return normalizeEditorCode(raw, field === "bloc" ? 30 : 20);
  }

  return raw.trim();
}

function buildClassificationFromSubmittedMetadata(
  baseClassification,
  submittedMetadata,
  {
    coreClassification = null,
    validationSource = "local",
    warning = ""
  } = {}
) {
  const base =
    baseClassification &&
    typeof baseClassification === "object"
      ? baseClassification
      : {};
  const core =
    coreClassification &&
    typeof coreClassification === "object"
      ? coreClassification
      : {};
  const coreMetadata =
    core.metadata &&
    typeof core.metadata === "object"
      ? core.metadata
      : {};
  const submitted =
    submittedMetadata &&
    typeof submittedMetadata === "object"
      ? submittedMetadata
      : {};

  const metadata = {};

  for (const field of DOCUMENT_METADATA_FIELDS) {
    const submittedValue =
      normalizeSubmittedMetadataValue(
        field,
        submitted[field]
      );
    const coreValue =
      normalizeSubmittedMetadataValue(
        field,
        coreMetadata[field]
      );

    // The user's submitted value is authoritative. The Core may normalize it,
    // but an empty Core value must never erase a non-empty correction.
    metadata[field] =
      submittedValue
        ? (coreValue || submittedValue)
        : "";
  }

  metadata.effective_type =
    metadata.type_document;

  const missingFields =
    getEditorMissingFields(metadata);
  const suggestedFilename =
    buildEditorFilename(metadata);
  const typeCode =
    metadata.type_document ||
    "INCONNU";
  const typeLabel =
    getOfficialDocumentTypeLabel(typeCode) ||
    typeCode ||
    "Document";

  const result = {
    ...base,
    ...core,
    document_category: {
      ...(base.document_category || {}),
      ...(core.document_category || {}),
      code: typeCode,
      label: typeLabel
    },
    metadata,
    missing_fields: missingFields,
    suggested_filename: suggestedFilename,
    filename_complete:
      missingFields.length === 0,
    warnings: [
      ...new Set([
        ...(Array.isArray(core.warnings)
          ? core.warnings
          : []),
        ...(Array.isArray(base.warnings)
          ? base.warnings
          : []),
        ...(warning ? [warning] : [])
      ])
    ].slice(0, 16),
    validation_source:
      validationSource
  };

  const presentation =
    buildDocumentPresentation(
      result,
      {
        manuallyValidated: true
      }
    );

  result.presentation =
    presentation;
  result.summary =
    presentation.summary;

  return result;
}

async function normalizeEditedDocumentMetadata(
  metadataOverride = null
) {
  const submittedMetadata = {
    ...(metadataOverride ||
      ariaState.documentEditorMetadata ||
      {})
  };

  if (
    !ariaState.documentAnalysis ||
    !ariaState.accessToken ||
    ariaState.documentEditorBusy
  ) {
    return {
      ok: false,
      coreValidated: false
    };
  }

  ariaState.documentEditorBusy = true;
  updateDocumentEditorInterface();

  try {
    const coreClassification =
      await requestDocumentMetadataNormalization(
        submittedMetadata
      );

    const classification =
      buildClassificationFromSubmittedMetadata(
        ariaState.documentAnalysis,
        submittedMetadata,
        {
          coreClassification,
          validationSource:
            "aria_core"
        }
      );

    ariaState.documentAnalysis =
      classification;
    ariaState.documentEditorMetadata = {
      ...classification.metadata
    };
    ariaState.documentEditorDirty =
      false;
    ariaState.documentSaveSource =
      "aria_core";
    ariaState.documentSaveWarning =
      "";

    resolveEditorSiteIdFromMetadata();

    return {
      ok: true,
      coreValidated: true
    };
  } catch (error) {
    console.error(
      "Metadata normalization failed:",
      error
    );

    const warning =
      "Les corrections ont été conservées localement, mais ARIA Core n’a pas pu les valider.";

    const classification =
      buildClassificationFromSubmittedMetadata(
        ariaState.documentAnalysis,
        submittedMetadata,
        {
          validationSource:
            "local_fallback",
          warning
        }
      );

    ariaState.documentAnalysis =
      classification;
    ariaState.documentEditorMetadata = {
      ...classification.metadata
    };
    ariaState.documentEditorDirty =
      false;
    ariaState.documentSaveSource =
      "local_fallback";
    ariaState.documentSaveWarning =
      getReadableError(error);

    resolveEditorSiteIdFromMetadata();

    return {
      ok: true,
      coreValidated: false,
      warning:
        getReadableError(error)
    };
  } finally {
    ariaState.documentEditorBusy =
      false;
    renderDocumentEditorOptions();
    syncDocumentEditorValues();
    updateDocumentEditorInterface();
    updateDocumentAnalysisInterface();
  }
}

function updateDocumentEditorInterface() {
  if (!domReady) return;

  const loading =
    getElement(
      "document-editor-loading"
    );
  const status =
    getElement(
      "document-editor-status"
    );
  const form =
    getElement(
      "document-metadata-editor"
    );

  const hasAnalysis =
    Boolean(
      ariaState.documentAnalysis
    );
  const referencesReady =
    Boolean(
      ariaState
        .documentEditorReferences
    );

  loading.hidden =
    !ariaState
      .documentEditorLoadBusy;

  form.hidden =
    !hasAnalysis ||
    !referencesReady ||
    !ariaState.documentEditMode;

  for (
    const element
    of form.querySelectorAll(
      "input, select"
    )
  ) {
    element.disabled =
      ariaState.documentEditorBusy ||
      ariaState
        .documentEditorLoadBusy;
  }

  const missing =
    getEditorMissingFields(
      ariaState
        .documentEditorMetadata ||
      ariaState.documentAnalysis
        ?.metadata ||
      {}
    );

  if (
    ariaState.documentEditorLoadBusy
  ) {
    status.textContent =
      "Chargement des listes officielles…";
  } else if (
    !referencesReady
  ) {
    status.textContent =
      "Les référentiels officiels ne sont pas encore disponibles.";
  } else if (
    ariaState.documentEditorBusy
  ) {
    status.textContent =
      "Validation finale par ARIA Core…";
  } else if (
    ariaState.documentEditorDirty &&
    missing.length > 0
  ) {
    status.textContent =
      `Modifications conservées · ${missing.length} champ(s) restent à compléter.`;
  } else if (
    ariaState.documentEditorDirty
  ) {
    status.textContent =
      "Modifications conservées localement · clique sur « Enregistrer les corrections ».";
  } else if (
    missing.length > 0
  ) {
    status.textContent =
      `${missing.length} champ(s) restent à compléter.`;
  } else {
    status.textContent =
      "Valeurs enregistrées et validées par les référentiels officiels.";
  }
}

function revokeDocumentDownloadObjectUrl() {
  if (
    ariaState.documentDownloadObjectUrl
  ) {
    URL.revokeObjectURL(
      ariaState.documentDownloadObjectUrl
    );
  }

  ariaState.documentDownloadObjectUrl =
    "";
  ariaState.documentDownloadSourceKey =
    "";
}

function hideDocumentDownloadFallback() {
  if (!domReady) return;

  const panel =
    getElement(
      "document-download-ready"
    );
  const fallbackLink =
    getElement(
      "document-download-fallback"
    );

  panel.hidden = true;
  fallbackLink.href = "#";
  fallbackLink.removeAttribute(
    "download"
  );

  ariaState.documentDownloadUrl =
    "";
  ariaState.documentDownloadFilename =
    "";
  ariaState.documentDownloadProgress =
    0;

  if (
    ariaState.documentDownloadFallbackTimer
  ) {
    window.clearTimeout(
      ariaState.documentDownloadFallbackTimer
    );
    ariaState.documentDownloadFallbackTimer =
      null;
  }
}

function formatDocumentDownloadSize(
  bytes
) {
  const size =
    Number(bytes);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return "taille inconnue";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(
        size / 1024
      )
    )} Ko`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
}

function createLocalPdfBlob(
  file
) {
  if (
    !(file instanceof File) ||
    file.size <= 0
  ) {
    throw new Error(
      "Le PDF source local n’est pas disponible."
    );
  }

  return file.slice(
    0,
    file.size,
    "application/pdf"
  );
}

function getValidatedLocalPdfFile() {
  const file =
    ariaState.pendingPdfLocalFile;
  const pdf =
    ariaState.pendingPdf;

  if (
    !(file instanceof File) ||
    !ariaState
      .pendingPdfLocalFileValidated ||
    !pdf
  ) {
    return null;
  }

  const expectedSize =
    Number(pdf.size);

  if (
    Number.isFinite(
      expectedSize
    ) &&
    expectedSize > 0 &&
    Number(file.size) !==
      expectedSize
  ) {
    return null;
  }

  return file;
}

function buildDirectDownloadSourceKey(
  file,
  filename
) {
  return [
    file.name,
    file.size,
    file.lastModified,
    filename
  ].join("|");
}

function clearDirectPdfDownloadLink() {
  if (!domReady) return;

  const directLink =
    getElement(
      "download-renamed-pdf-link"
    );

  directLink.hidden = true;
  directLink.href = "#";
  directLink.removeAttribute(
    "download"
  );

  revokeDocumentDownloadObjectUrl();
}

function refreshDirectPdfDownloadLink() {
  if (!domReady) {
    return false;
  }

  const directLink =
    getElement(
      "download-renamed-pdf-link"
    );
  const associateButton =
    getElement(
      "download-renamed-pdf-button"
    );
  const analysis =
    ariaState.documentAnalysis;
  const filename =
    analysis?.suggested_filename;
  const localFile =
    getValidatedLocalPdfFile();

  const ready =
    Boolean(
      localFile &&
      filename &&
      analysis?.filename_complete
    );

  if (!ready) {
    clearDirectPdfDownloadLink();

    const hasAnalysis =
      Boolean(analysis);
    const hasLocalFile =
      Boolean(localFile);

    associateButton.hidden =
      !hasAnalysis ||
      hasLocalFile ||
      ariaState.documentEditMode;
    associateButton.textContent =
      "Associer le PDF source";

    return false;
  }

  const sourceKey =
    buildDirectDownloadSourceKey(
      localFile,
      filename
    );

  if (
    ariaState.documentDownloadSourceKey !==
      sourceKey ||
    !ariaState.documentDownloadObjectUrl
  ) {
    revokeDocumentDownloadObjectUrl();
    const pdfBlob =
      createLocalPdfBlob(
        localFile
      );
    ariaState.documentDownloadObjectUrl =
      URL.createObjectURL(
        pdfBlob
      );
    ariaState.documentDownloadSourceKey =
      sourceKey;
  }

  directLink.href =
    ariaState.documentDownloadObjectUrl;
  directLink.download =
    filename;
  directLink.textContent =
    "Télécharger la copie renommée";
  directLink.hidden = false;
  associateButton.hidden = true;

  return true;
}

function showLocalPdfDownload(
  file,
  filename
) {
  const panel =
    getElement(
      "document-download-ready"
    );
  const fallbackLink =
    getElement(
      "document-download-fallback"
    );
  const filenameElement =
    getElement(
      "document-download-ready-filename"
    );
  const infoElement =
    getElement(
      "document-download-ready-expiry"
    );

  ariaState.pendingPdfLocalFile =
    file;
  ariaState.pendingPdfLocalFileValidated =
    true;

  refreshDirectPdfDownloadLink();

  fallbackLink.href =
    ariaState.documentDownloadObjectUrl;
  fallbackLink.download =
    filename;
  fallbackLink.textContent =
    "Enregistrer le PDF";

  filenameElement.textContent =
    filename;
  infoElement.textContent =
    `Copie locale : ${formatDocumentDownloadSize(
      file.size
    )}.`;
  panel.hidden = false;

  return {
    objectUrl:
      ariaState
        .documentDownloadObjectUrl,
    blob:
      createLocalPdfBlob(file)
  };
}

async function validateSelectedPdfSource(
  file
) {
  if (
    !(file instanceof File) ||
    file.size <= 0 ||
    !file.name
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    throw new Error(
      "Sélectionne le PDF original."
    );
  }

  const signature =
    await readPdfSignature(
      file
    );

  if (signature !== "%PDF-") {
    throw new Error(
      "Le fichier sélectionné n’est pas un PDF valide."
    );
  }

  const expectedSize =
    Number(
      ariaState.pendingPdf
        ?.size
    );

  if (
    Number.isFinite(
      expectedSize
    ) &&
    expectedSize > 0 &&
    file.size !== expectedSize
  ) {
    throw new Error(
      "Le PDF sélectionné ne correspond pas au document analysé : sa taille est différente."
    );
  }

  return file;
}

function requestLocalPdfSource() {
  setState(
    "idle",
    "PDF source requis.",
    "Sélectionne le PDF original. Il sert uniquement à créer la copie locale."
  );

  getElement(
    "pdf-download-source-input"
  ).click();
}

async function handleDownloadPdfSourceSelection(
  event
) {
  const input =
    event.currentTarget;
  const [file] =
    input.files || [];

  input.value = "";

  if (!file) {
    return;
  }

  try {
    const validatedFile =
      await validateSelectedPdfSource(
        file
      );

    ariaState.pendingPdfLocalFile =
      validatedFile;
    ariaState.pendingPdfLocalFileValidated =
      true;

    await cachePendingPdfLocalFile()
      .catch((error) => {
        console.warn(
          "Mise en cache du PDF associé impossible.",
          error
        );
      });

    const ready =
      refreshDirectPdfDownloadLink();

    updatePdfAttachmentInterface();
    updateDocumentAnalysisInterface();

    setState(
      "idle",
      ready
        ? "Lien de téléchargement prêt."
        : "PDF source associé.",
      ready
        ? "Clique directement sur « Télécharger la copie renommée »."
        : "Le PDF est conservé localement. Complète les métadonnées pour faire apparaître le lien."
    );
  } catch (error) {
    ariaState.pendingPdfLocalFile =
      null;
    ariaState.pendingPdfLocalFileValidated =
      false;
    clearDirectPdfDownloadLink();
    setState(
      "error",
      "PDF source refusé.",
      getReadableError(error)
    );
  }
}

async function downloadRenamedPdf() {
  const ready =
    refreshDirectPdfDownloadLink();

  if (!ready) {
    requestLocalPdfSource();
    return false;
  }

  const directLink =
    getElement(
      "download-renamed-pdf-link"
    );

  directLink.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  setState(
    "idle",
    "Lien direct prêt.",
    "Clique sur « Télécharger la copie renommée »."
  );

  return true;
}

function updateDocumentAnalysisInterface() {
  if (!domReady) return;

  const pdf = ariaState.pendingPdf;
  const analysis = ariaState.documentAnalysis;

  const card = getElement(
    "document-analysis-card"
  );
  const emptyState = getElement(
    "document-analysis-empty"
  );
  const content = getElement(
    "document-analysis-content"
  );
  const confidenceBadge = getElement(
    "document-analysis-confidence"
  );
  const classifyButton = getElement(
    "classify-pdf-button"
  );
  const removeButton = getElement(
    "remove-pdf-button"
  );
  const newDocumentButton = getElement(
    "new-document-button"
  );
  const copyButton = getElement(
    "copy-document-filename-button"
  );
  const detailsPanel = getElement(
    "document-details-panel"
  );
  const editorPanel = getElement(
    "document-editor-panel"
  );
  const downloadButton = getElement(
    "download-renamed-pdf-button"
  );
  const directDownloadLink = getElement(
    "download-renamed-pdf-link"
  );
  const commitStatus = getElement(
    "document-card-commit-status"
  );
  const saveSourceStatus = getElement(
    "document-save-source-status"
  );
  const validationLabel = getElement(
    "document-filename-validation"
  );
  const editButton = getElement(
    "edit-document-button"
  );
  const successBlock = getElement(
    "document-analysis-success"
  );
  const successText = getElement(
    "document-analysis-success-text"
  );
  const errorBlock = getElement(
    "document-analysis-error"
  );
  const errorText = getElement(
    "document-analysis-error-text"
  );
  const errorCode = getElement(
    "document-analysis-error-code"
  );

  const canClassify =
    Boolean(pdf) &&
    Boolean(ariaState.accessToken) &&
    !ariaState.isBusy &&
    !ariaState.pdfBusy &&
    !ariaState.documentAnalysisBusy;

  setElementDisplayed(
    card,
    Boolean(pdf),
    "grid"
  );

  classifyButton.disabled = !canClassify;
  removeButton.disabled =
    !pdf ||
    ariaState.isBusy ||
    ariaState.pdfBusy ||
    ariaState.documentAnalysisBusy;

  newDocumentButton.disabled =
    ariaState.newDocumentBusy ||
    ariaState.pdfBusy ||
    ariaState.documentAnalysisBusy ||
    ariaState.documentEditorBusy;

  classifyButton.textContent =
    ariaState.documentAnalysisBusy
      ? "Analyse en cours…"
      : analysis
        ? "Relancer l’analyse"
        : "Analyser et classer";

  const filenameComplete =
    Boolean(
      analysis
        ?.filename_complete
    );

  copyButton.disabled =
    !analysis?.suggested_filename ||
    ariaState.documentEditorBusy;

  downloadButton.disabled =
    !filenameComplete ||
    ariaState.documentEditorBusy;

  refreshDirectPdfDownloadLink();

  directDownloadLink.classList.toggle(
    "disabled",
    ariaState.documentEditorBusy
  );

  if (
    ariaState.documentCardCommittedAt
  ) {
    commitStatus.hidden = false;
  }

  editButton.disabled =
    !analysis ||
    ariaState.documentEditorBusy ||
    ariaState.documentDownloadBusy;
  editButton.textContent =
    ariaState.documentEditMode
      ? "Édition en cours"
      : "Éditer";

  card.classList.toggle(
    "editing",
    ariaState.documentEditMode
  );
  card.classList.toggle(
    "dirty",
    ariaState.documentEditMode &&
      ariaState.documentEditorDirty
  );

  editorPanel.hidden =
    !ariaState.documentEditMode;

  setElementDisplayed(
    emptyState,
    Boolean(pdf) &&
      !analysis &&
      !ariaState.documentAnalysisBusy &&
      !ariaState.documentAnalysisError,
    "grid"
  );

  setElementDisplayed(
    content,
    Boolean(analysis),
    "grid"
  );

  setElementDisplayed(
    confidenceBadge,
    Boolean(analysis),
    "inline-flex"
  );

  setElementDisplayed(
    successBlock,
    Boolean(analysis) &&
      !ariaState.documentAnalysisBusy,
    "grid"
  );

  setElementDisplayed(
    errorBlock,
    Boolean(
      ariaState.documentAnalysisError
    ),
    "grid"
  );

  if (analysis) {
    const mode =
      ariaState
        .documentAnalysisDiagnostics
        ?.classificationMode;

    successText.textContent =
      mode === "json_fallback"
        ? "Le classement est affiché. ARIA a utilisé le mode JSON de secours."
        : "Le classement est affiché ci-dessous.";
  } else {
    successText.textContent =
      "";
  }

  if (
    ariaState.documentAnalysisError
  ) {
    errorText.textContent =
      ariaState
        .documentAnalysisError
        .message ||
      "Une erreur inconnue a interrompu l’analyse.";

    errorCode.textContent =
      ariaState
        .documentAnalysisError
        .code ||
      "";
    errorCode.hidden =
      !ariaState
        .documentAnalysisError
        .code;
  } else {
    errorText.textContent = "";
    errorCode.textContent = "";
    errorCode.hidden = true;
  }

  if (!analysis) {
    getElement(
      "document-analysis-title"
    ).textContent = "Classement du PDF";

    getElement(
      "document-analysis-summary"
    ).textContent = "";

    getElement(
      "document-suggested-filename"
    ).textContent = "";

    validationLabel.textContent =
      "En attente de validation";
    validationLabel.classList.remove(
      "valid"
    );

    commitStatus.hidden = true;
    saveSourceStatus.hidden = true;
    clearDirectPdfDownloadLink();
    downloadButton.hidden = true;

    getElement(
      "document-missing-block"
    ).hidden = true;

    getElement(
      "document-warning-block"
    ).hidden = true;

    getElement(
      "document-evidence-details"
    ).hidden = true;

    detailsPanel.open = false;
    editorPanel.open = false;
    updateDocumentEditorInterface();
    updateDocumentAnalysisProgressInterface();
    updateElectricalBootstrapInterface();
    return;
  }

  const category =
    analysis.document_category || {};
  const confidence = Number(
    analysis.overall_confidence
  );
  const confidencePercent =
    Number.isFinite(confidence)
      ? Math.round(
          Math.max(
            0,
            Math.min(1, confidence)
          ) * 100
        )
      : 0;

  getElement(
    "document-analysis-title"
  ).textContent =
    ariaState.documentEditMode
      ? "Édition du classement"
      : (
          analysis.presentation
            ?.title ||
          category.label ||
          category.code ||
          "Classement du PDF"
        );

  confidenceBadge.textContent =
    `Confiance ${confidencePercent} %`;

  getElement(
    "document-analysis-summary"
  ).textContent =
    analysis.presentation
      ?.summary ||
    analysis.summary ||
    "Aucun résumé disponible.";

  const metadata =
    ariaState.documentEditorMetadata ||
    analysis.metadata ||
    {};

  if (
    !ariaState
      .documentEditorMetadata
  ) {
    ariaState.documentEditorMetadata = {
      ...metadata
    };
  }

  if (
    !ariaState
      .documentEditorReferences &&
    !ariaState
      .documentEditorLoadBusy
  ) {
    loadDocumentEditorReferences()
      .then(() => {
        renderDocumentEditorOptions();
        syncDocumentEditorValues();
        updateDocumentAnalysisInterface();
      })
      .catch((error) => {
        console.warn(
          "Chargement des références éditeur impossible.",
          error
        );
      });
  }

  if (
    !ariaState.documentEditMode ||
    !ariaState.documentEditorDirty
  ) {
    renderDocumentEditorOptions();
    syncDocumentEditorValues();
  }

  getElement(
    "document-suggested-filename"
  ).textContent =
    analysis.suggested_filename ||
    "Nom indisponible";

  validationLabel.textContent =
    analysis.filename_complete
      ? (
          analysis.presentation
            ?.manuallyValidated
            ? "Corrections enregistrées · carte actualisée"
            : "Nom complet · validation humaine recommandée"
        )
      : "Nom incomplet · ouvre « Corriger les métadonnées »";

  validationLabel.classList.toggle(
    "valid",
    Boolean(
      analysis.filename_complete
    )
  );

  const missing =
    Array.isArray(
      analysis.missing_fields
    )
      ? analysis.missing_fields
      : [];

  const missingBlock = getElement(
    "document-missing-block"
  );
  missingBlock.hidden =
    missing.length === 0;

  fillStringList(
    getElement(
      "document-missing-list"
    ),
    missing,
    (field) =>
      String(field)
        .replaceAll("_", " ")
  );

  const warnings =
    Array.isArray(
      analysis.warnings
    )
      ? analysis.warnings
      : [];

  const warningBlock = getElement(
    "document-warning-block"
  );
  warningBlock.hidden =
    warnings.length === 0;

  fillStringList(
    getElement(
      "document-warning-list"
    ),
    warnings
  );

  const evidence =
    Array.isArray(
      analysis.evidence
    )
      ? analysis.evidence
      : [];

  const evidenceDetails = getElement(
    "document-evidence-details"
  );
  evidenceDetails.hidden =
    evidence.length === 0;

  fillStringList(
    getElement(
      "document-evidence-list"
    ),
    evidence,
    (item) => {
      const source =
        Number(item?.page) === 0
          ? "Nom du fichier"
          : `Page ${item?.page}`;
      const field =
        item?.field
          ? ` · ${item.field}`
          : "";
      const value =
        item?.value
          ? ` : ${item.value}`
          : "";
      const reason =
        item?.reason
          ? ` — ${item.reason}`
          : "";

      return `${source}${field}${value}${reason}`;
    }
  );

  const controlCount =
    missing.length + warnings.length;

  getElement(
    "document-details-summary"
  ).textContent =
    controlCount > 0
      ? `Contrôles et preuves · ${controlCount} point(s)`
      : "Contrôles et preuves";

  for (
    const buttonId
    of [
      "copy-document-filename-button",
      "classify-pdf-button",
      "remove-pdf-button"
    ]
  ) {
    getElement(
      buttonId
    ).hidden =
      ariaState.documentEditMode;
  }

  editButton.hidden =
    ariaState.documentEditMode;

  const directDownloadReady =
    refreshDirectPdfDownloadLink();

  directDownloadLink.hidden =
    ariaState.documentEditMode ||
    !directDownloadReady;

  downloadButton.hidden =
    ariaState.documentEditMode ||
    directDownloadReady ||
    !filenameComplete;

  updateDocumentEditorInterface();
  updateDocumentAnalysisProgressInterface();
  updateDocumentStabilizationInterface();
  updateElectricalBootstrapInterface();
}

function getPdfLocalStatus() {
  if (!ariaState.pendingPdf) {
    return {
      code: "absent",
      label: "PDF local absent",
      detail: "Aucun document actif."
    };
  }

  if (ariaState.localPdfRestoreBusy) {
    return {
      code: "restoring",
      label: "Association en cours",
      detail: "ARIA vérifie le PDF sélectionné."
    };
  }

  if (
    getValidatedLocalPdfFile()
  ) {
    return {
      code: "available",
      label: "PDF local disponible",
      detail: "La copie peut être téléchargée."
    };
  }

  return {
    code: "reassociate",
    label: "PDF à réassocier",
    detail:
      ariaState.localPdfRestoreError ||
      "Sélectionne de nouveau le PDF source."
  };
}

function hasUnresolvedFilenameTokens(
  filename
) {
  return /\[[^\]]+\]/.test(
    String(filename || "")
  );
}

function getDocumentWorkflowState() {
  const analysis =
    ariaState.documentAnalysis;
  const filename =
    analysis?.suggested_filename ||
    "";
  const pdfLocal =
    getValidatedLocalPdfFile();
  const downloadLink =
    domReady
      ? document.getElementById(
          "download-renamed-pdf-link"
        )
      : null;

  return {
    analysis: {
      done:
        Boolean(analysis),
      detail:
        analysis
          ? "Analyse disponible"
          : "Analyse à lancer"
    },
    metadata: {
      done:
        Boolean(
          analysis?.filename_complete
        ),
      detail:
        analysis?.filename_complete
          ? "Tous les champs requis sont présents"
          : `${Array.isArray(
              analysis?.missing_fields
            )
              ? analysis.missing_fields.length
              : 0} champ(s) à compléter`
    },
    memory: {
      done:
        Boolean(
          analysis?.presentation
            ?.manuallyValidated
        ),
      detail:
        analysis?.presentation
          ?.manuallyValidated
          ? (
              ariaState.documentSaveSource ===
                "local_fallback"
                ? "Conservées localement"
                : "Enregistrées et validées"
            )
          : "Validation humaine attendue"
    },
    name: {
      done:
        Boolean(
          analysis?.filename_complete &&
          filename &&
          !hasUnresolvedFilenameTokens(
            filename
          )
        ),
      detail:
        filename
          ? (
              hasUnresolvedFilenameTokens(
                filename
              )
                ? "Le nom contient encore des champs entre crochets"
                : "Nom final construit"
            )
          : "Nom incomplet"
    },
    download: {
      done:
        Boolean(
          pdfLocal &&
          downloadLink &&
          !downloadLink.hidden &&
          String(
            downloadLink.href || ""
          ).startsWith("blob:")
        ),
      detail:
        pdfLocal
          ? "Lien local prêt"
          : "Source locale requise"
    }
  };
}

function buildDocumentDiagnostics() {
  const analysis =
    ariaState.documentAnalysis;
  const metadata =
    analysis?.metadata ||
    ariaState.documentEditorMetadata ||
    {};
  const localStatus =
    getPdfLocalStatus();
  const workflow =
    getDocumentWorkflowState();
  const directLink =
    domReady
      ? document.getElementById(
          "download-renamed-pdf-link"
        )
      : null;

  return {
    generatedAt:
      new Date().toISOString(),
    version:
      String(
        config.version || ""
      ),
    browser: {
      secureContext:
        window.isSecureContext,
      indexedDb:
        "indexedDB" in window,
      clipboard:
        Boolean(
          navigator.clipboard
        ),
      safeStartup:
        config.restoreLocalPdfOnStartup !==
          true,
      persistentPdfBytes:
        config.cacheLocalPdfBytes ===
          true
    },
    pdf: {
      active:
        Boolean(
          ariaState.pendingPdf
        ),
      localStatus:
        localStatus.code,
      localStatusLabel:
        localStatus.label,
      localValidated:
        Boolean(
          ariaState
            .pendingPdfLocalFileValidated
        ),
      originalName:
        ariaState.pendingPdf
          ?.originalName ||
        ariaState.pendingPdf
          ?.name ||
        "",
      finalName:
        analysis
          ?.suggested_filename ||
        ""
    },
    document: {
      analyzed:
        Boolean(analysis),
      filenameComplete:
        Boolean(
          analysis?.filename_complete
        ),
      type:
        metadata.type_document ||
        metadata.effective_type ||
        "",
      discipline:
        metadata.discipline ||
        "",
      technique:
        metadata.technique ||
        "",
      saveSource:
        ariaState.documentSaveSource ||
        "",
      cardRevision:
        ariaState
          .documentCardCommitRevision,
      cardCommittedAt:
        ariaState
          .documentCardCommittedAt ||
        ""
    },
    download: {
      ready:
        workflow.download.done,
      linkHidden:
        directLink
          ? directLink.hidden
          : true,
      linkProtocol:
        directLink &&
        String(
          directLink.href || ""
        ).startsWith("blob:")
          ? "blob:"
          : ""
    },
    workflow: {
      analysis:
        workflow.analysis.done,
      metadata:
        workflow.metadata.done,
      memory:
        workflow.memory.done,
      name:
        workflow.name.done,
      download:
        workflow.download.done
    },
    lastError: {
      code:
        ariaState.lastDiagnosticCode ||
        "",
      message:
        ariaState.lastDiagnosticMessage ||
        "",
      detail:
        ariaState.lastDiagnosticDetail ||
        "",
      at:
        ariaState.lastDiagnosticAt ||
        ""
    }
  };
}

function updateWorkflowItem(
  key,
  state
) {
  const item =
    getElement(
      `workflow-check-${key}`
    );
  const detail =
    getElement(
      `workflow-check-${key}-detail`
    );
  const icon =
    item.querySelector(
      ".workflow-check-icon"
    );

  item.classList.toggle(
    "done",
    state.done
  );
  item.classList.toggle(
    "pending",
    !state.done
  );

  icon.textContent =
    state.done
      ? "✓"
      : "○";
  detail.textContent =
    state.detail;
}

function updateDocumentStabilizationInterface() {
  if (!domReady) return;

  const pdf =
    ariaState.pendingPdf;
  const analysis =
    ariaState.documentAnalysis;
  const localStatus =
    getPdfLocalStatus();

  const badge =
    getElement(
      "pdf-local-status-badge"
    );
  badge.textContent =
    localStatus.label;
  badge.className =
    `pdf-local-status-badge ${localStatus.code}`;

  getElement(
    "pdf-original-filename"
  ).textContent =
    pdf?.originalName ||
    pdf?.name ||
    "—";

  getElement(
    "pdf-final-filename"
  ).textContent =
    analysis?.suggested_filename ||
    pdf?.presentationName ||
    "—";

  const workflow =
    getDocumentWorkflowState();

  for (
    const key
    of [
      "analysis",
      "metadata",
      "memory",
      "name",
      "download"
    ]
  ) {
    updateWorkflowItem(
      key,
      workflow[key]
    );
  }

  const completed =
    Object.values(workflow)
      .filter(
        (item) => item.done
      )
      .length;

  getElement(
    "document-workflow-score"
  ).textContent =
    `${completed} / 5`;

  getElement(
    "document-workflow-checklist"
  ).classList.toggle(
    "complete",
    completed === 5
  );

  getElement(
    "document-diagnostics-output"
  ).textContent =
    JSON.stringify(
      buildDocumentDiagnostics(),
      null,
      2
    );

  const retryButton =
    getElement(
      "retry-local-pdf-restore"
    );
  retryButton.disabled =
    !pdf ||
    Boolean(
      getValidatedLocalPdfFile()
    ) ||
    ariaState.localPdfRestoreBusy;

  const diagnosticRow =
    getElement(
      "status-diagnostic-row"
    );
  const diagnosticCode =
    getElement(
      "status-diagnostic-code"
    );

  diagnosticRow.hidden =
    !ariaState.lastDiagnosticCode;
  diagnosticCode.textContent =
    ariaState.lastDiagnosticCode ||
    "";
}

async function copyDocumentDiagnostics() {
  try {
    await writeClipboardText(
      JSON.stringify(
        buildDocumentDiagnostics(),
        null,
        2
      )
    );

    setState(
      "idle",
      "Diagnostic copié.",
      "Les informations techniques sont disponibles dans le presse-papiers."
    );
  } catch (error) {
    setState(
      "error",
      "Copie du diagnostic impossible.",
      getReadableError(error)
    );
  }
}

async function copyLastDiagnosticCode() {
  if (!ariaState.lastDiagnosticCode) {
    return;
  }

  try {
    await writeClipboardText(
      ariaState.lastDiagnosticCode
    );
  } catch (error) {
    console.warn(
      "Copie de la référence impossible.",
      error
    );
  }
}

function createDiagnosticReference(
  message
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[-:TZ.]/g,
        ""
      )
      .slice(0, 14);
  const context =
    String(message || "ERREUR")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 24)
      .toUpperCase() ||
    "ERREUR";

  return `ARIA-WEB-${context}-${timestamp}`;
}

async function writeClipboardText(
  value
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      value
    );
    return;
  }

  const textarea =
    document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute(
    "readonly",
    ""
  );
  textarea.style.position =
    "fixed";
  textarea.style.opacity =
    "0";
  document.body.append(textarea);
  textarea.select();

  const copied =
    document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error(
      "Le navigateur a refusé l’accès au presse-papiers."
    );
  }
}

async function copySuggestedDocumentFilename() {
  const filename =
    ariaState.documentAnalysis
      ?.suggested_filename;

  if (!filename) return;

  try {
    await writeClipboardText(
      filename
    );
    setState(
      "idle",
      "Nom copié.",
      "Le nom proposé est disponible dans le presse-papiers."
    );
  } catch (error) {
    setState(
      "error",
      "Copie impossible.",
      getReadableError(error)
    );
  }
}

const LOCAL_PDF_DB_NAME =
  "aria-local-pdf-cache-clean-v1-5-3";
const LOCAL_PDF_DB_VERSION = 1;
const LOCAL_PDF_STORE_NAME =
  "pdfs";

function openLocalPdfDatabase() {
  return new Promise(
    (resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(
          new Error(
            "Le stockage local des PDF n’est pas disponible."
          )
        );
        return;
      }

      const request =
        indexedDB.open(
          LOCAL_PDF_DB_NAME,
          LOCAL_PDF_DB_VERSION
        );

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames
            .contains(
              LOCAL_PDF_STORE_NAME
            )
        ) {
          database.createObjectStore(
            LOCAL_PDF_STORE_NAME,
            {
              keyPath: "pathname"
            }
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ||
          new Error(
            "Impossible d’ouvrir le stockage local des PDF."
          )
        );
    }
  );
}

async function cachePendingPdfLocalFile() {
  const pdf =
    ariaState.pendingPdf;
  const file =
    ariaState.pendingPdfLocalFile;

  if (
    !pdf?.pathname ||
    !(file instanceof File) ||
    !ariaState.pendingPdfLocalFileValidated
  ) {
    return false;
  }

  const database =
    await openLocalPdfDatabase();

  try {
    await new Promise(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            LOCAL_PDF_STORE_NAME,
            "readwrite"
          );
        const store =
          transaction.objectStore(
            LOCAL_PDF_STORE_NAME
          );

        store.put({
          pathname:
            pdf.pathname,
          name:
            file.name,
          type:
            file.type ||
            "application/pdf",
          size:
            file.size,
          lastModified:
            file.lastModified ||
            Date.now(),
          blob:
            file.slice(
              0,
              file.size,
              "application/pdf"
            ),
          savedAt:
            new Date().toISOString()
        });

        transaction.oncomplete =
          () => resolve();
        transaction.onerror =
          () => reject(
            transaction.error ||
            new Error(
              "Impossible de conserver le PDF local."
            )
          );
        transaction.onabort =
          () => reject(
            transaction.error ||
            new Error(
              "La conservation locale du PDF a été annulée."
            )
          );
      }
    );

    return true;
  } finally {
    database.close();
  }
}

async function restorePendingPdfLocalFile() {
  const pdf =
    ariaState.pendingPdf;

  if (
    !pdf?.pathname ||
    ariaState.pendingPdfLocalFile instanceof File ||
    ariaState.localPdfRestoreBusy
  ) {
    return false;
  }

  ariaState.localPdfRestoreBusy =
    true;
  ariaState.localPdfRestoreError =
    "";

  let database;

  try {
    database =
      await openLocalPdfDatabase();

    const record =
      await new Promise(
        (resolve, reject) => {
          const transaction =
            database.transaction(
              LOCAL_PDF_STORE_NAME,
              "readonly"
            );
          const request =
            transaction
              .objectStore(
                LOCAL_PDF_STORE_NAME
              )
              .get(pdf.pathname);

          request.onsuccess = () =>
            resolve(request.result || null);
          request.onerror = () =>
            reject(
              request.error ||
              new Error(
                "Impossible de restaurer le PDF local."
              )
            );
        }
      );

    if (
      !record?.blob ||
      Number(record.size) !==
        Number(pdf.size)
    ) {
      return false;
    }

    const restoredFile =
      new File(
        [record.blob],
        record.name ||
          pdf.originalName ||
          pdf.name,
        {
          type:
            record.type ||
            "application/pdf",
          lastModified:
            Number(record.lastModified) ||
            Date.now()
        }
      );

    ariaState.pendingPdfLocalFile =
      restoredFile;
    ariaState.pendingPdfLocalFileValidated =
      true;

    refreshDirectPdfDownloadLink();
    updatePdfAttachmentInterface();
    updateDocumentAnalysisInterface();
    updateDocumentStabilizationInterface();

    return true;
  } catch (error) {
    ariaState.localPdfRestoreError =
      getReadableError(error);
    console.warn(
      "Restauration locale du PDF impossible.",
      error
    );
    return false;
  } finally {
    ariaState.localPdfRestoreBusy =
      false;
    database?.close();
  }
}

async function deleteCachedLocalPdf(
  pathname
) {
  if (!pathname) return;

  let database;

  try {
    database =
      await openLocalPdfDatabase();

    await new Promise(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            LOCAL_PDF_STORE_NAME,
            "readwrite"
          );

        transaction
          .objectStore(
            LOCAL_PDF_STORE_NAME
          )
          .delete(pathname);

        transaction.oncomplete =
          () => resolve();
        transaction.onerror =
          () => reject(
            transaction.error
          );
      }
    );
  } catch (error) {
    console.warn(
      "Suppression du cache PDF impossible.",
      error
    );
  } finally {
    database?.close();
  }
}

function savePendingPdfSession() {
  for (
    const [storage, key]
    of [
      [
        sessionStorage,
        config.pdfSessionKey
      ],
      [
        localStorage,
        config.pdfPersistentKey
      ]
    ]
  ) {
    try {
      if (ariaState.pendingPdf) {
        storage.setItem(
          key,
          JSON.stringify(
            ariaState.pendingPdf
          )
        );
      } else {
        storage.removeItem(key);
      }
    } catch (error) {
      console.warn(
        "Impossible de mémoriser la session PDF.",
        error
      );
    }
  }
}

function loadPendingPdfSession() {
  try {
    const raw =
      sessionStorage.getItem(
        config.pdfSessionKey
      ) ||
      localStorage.getItem(
        config.pdfPersistentKey
      );

    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.pathname === "string" &&
      parsed.pathname.startsWith(
        "aria-temp/pdfs/"
      ) &&
      typeof parsed?.name === "string" &&
      Number.isFinite(
        Number(parsed?.size)
      )
    ) {
      ariaState.pendingPdf = {
        pathname:
          parsed.pathname,
        name:
          parsed.name,
        originalName:
          parsed.originalName ||
          parsed.name,
        presentationName:
          parsed.presentationName ||
          "",
        presentationStatus:
          parsed.presentationStatus ||
          "",
        size:
          Number(parsed.size),
        mimeType:
          "application/pdf",
        detail:
          ["low", "auto", "high"].includes(
            parsed.detail
          )
            ? parsed.detail
            : "auto",
        uploadedAt:
          parsed.uploadedAt || null
      };

      ariaState.pendingPdfLocalFile =
        null;
      ariaState.pendingPdfLocalFileValidated =
        false;
    }
  } catch (error) {
    console.warn(
      "Session PDF mémorisée invalide.",
      error
    );

    for (
      const [storage, key]
      of [
        [
          sessionStorage,
          config.pdfSessionKey
        ],
        [
          localStorage,
          config.pdfPersistentKey
        ]
      ]
    ) {
      try {
        storage.removeItem(key);
      } catch {
        // Aucun traitement supplémentaire.
      }
    }
  }
}

async function readPdfSignature(file) {
  const buffer = await file
    .slice(0, 5)
    .arrayBuffer();

  return new TextDecoder("ascii").decode(
    new Uint8Array(buffer)
  );
}

async function requestPdfService(payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.pdfRequestTimeoutMs) || 30000
  );

  try {
    const response = await fetch(
      config.pdfApiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${ariaState.accessToken}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof data.error === "string" &&
        data.error.trim()
          ? data.error
          : `Le service PDF a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      throw error;
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function uploadPdfWithProgress(
  file,
  uploadUrl,
  onProgress
) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", uploadUrl, true);
    request.timeout =
      Number(config.pdfUploadTimeoutMs) ||
      300000;
    request.setRequestHeader(
      "Content-Type",
      "application/pdf"
    );

    request.upload.addEventListener(
      "progress",
      (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (event.loaded / event.total) * 100
            )
          )
        );
        onProgress(percent);
      }
    );

    request.addEventListener("load", () => {
      if (
        request.status >= 200 &&
        request.status < 300
      ) {
        onProgress(100);
        resolve();
        return;
      }

      reject(
        new Error(
          `Le stockage privé a refusé l’upload (${request.status}).`
        )
      );
    });

    request.addEventListener("error", () => {
      reject(
        new Error(
          "La connexion au stockage privé a échoué."
        )
      );
    });

    request.addEventListener("timeout", () => {
      reject(
        new Error(
          "Le téléversement du PDF a dépassé le délai autorisé."
        )
      );
    });

    request.addEventListener("abort", () => {
      reject(
        new Error(
          "Le téléversement du PDF a été interrompu."
        )
      );
    });

    request.send(file);
  });
}

async function handlePdfFileSelection(event) {
  const input = event.currentTarget;
  const [file] = input.files || [];
  input.value = "";

  if (!file) return;

  const maxBytes =
    Number(config.maxPdfBytes) ||
    45 * 1024 * 1024;

  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    file.size <= 0 ||
    file.size > maxBytes
  ) {
    setState(
      "error",
      "PDF non autorisé.",
      file.size > maxBytes
        ? "Le PDF doit faire moins de 45 Mo."
        : "Choisis un fichier PDF valide."
    );
    return;
  }

  clearDocumentAnalysis(false);
  ariaState.pdfBusy = true;
  ariaState.pdfUploadName =
    file.name;
  ariaState.pdfUploadProgress = 0;
  updatePdfAttachmentInterface();
  updateDocumentAnalysisInterface();

  let preparedUpload = null;

  try {
    const signature =
      await readPdfSignature(file);

    if (signature !== "%PDF-") {
      throw new Error(
        "Le contenu du fichier ne correspond pas à un PDF valide."
      );
    }

    if (ariaState.pendingPdf) {
      await discardPendingPdf(false);
    }

    if (ariaState.pendingImage) {
      clearPendingImage(false);
    }

    // The old PDF cleanup clears the local file reference.
    // Store the newly selected File only after that cleanup.
    ariaState.pendingPdfLocalFile =
      file;
    ariaState.pendingPdfLocalFileValidated =
      true;

    setState(
      "thinking",
      "Préparation du PDF…",
      "ARIA crée une autorisation temporaire de téléversement."
    );

    const data = await requestPdfService({
      action: "prepare_upload",
      name: file.name,
      size: file.size,
      mimeType:
        file.type || "application/pdf"
    });

    preparedUpload = data.upload;

    if (
      !preparedUpload?.uploadUrl ||
      !preparedUpload?.pathname
    ) {
      throw new Error(
        "Le service PDF n’a pas renvoyé d’autorisation exploitable."
      );
    }

    setState(
      "thinking",
      "Téléversement sécurisé : 0 %",
      "Le PDF va directement vers le stockage privé Vercel."
    );

    await uploadPdfWithProgress(
      file,
      preparedUpload.uploadUrl,
      (percent) => {
        ariaState.pdfUploadProgress =
          percent;
        updatePdfAttachmentInterface();
        setState(
          "thinking",
          `Téléversement sécurisé : ${percent} %`,
          "Le fichier ne transite pas par ARIA Web."
        );
      }
    );

    ariaState.pendingPdf = {
      pathname: preparedUpload.pathname,
      name:
        preparedUpload.name ||
        file.name,
      originalName:
        file.name,
      presentationName: "",
      presentationStatus: "",
      size: Number(
        preparedUpload.size ||
        file.size
      ),
      mimeType: "application/pdf",
      detail: "auto",
      uploadedAt:
        new Date().toISOString()
    };

    savePendingPdfSession();
    // Les octets du PDF restent dans la session courante uniquement.
    // Les métadonnées et les décisions restent, elles, persistantes.
    if (
      config.cacheLocalPdfBytes ===
        true
    ) {
      await cachePendingPdfLocalFile()
        .catch((error) => {
          console.warn(
            "Mise en cache locale du PDF impossible.",
            error
          );
        });
    } else {
      deleteCachedLocalPdf(
        ariaState.pendingPdf.pathname
      ).catch(() => {});
    }

    refreshDirectPdfDownloadLink();

    setState(
      "idle",
      "PDF prêt.",
      "Il restera actif pour les prochaines questions jusqu’à son retrait."
    );
  } catch (error) {
    ariaState.pendingPdfLocalFile =
      null;
    ariaState.pendingPdfLocalFileValidated =
      false;

    console.error(
      "PDF upload failed:",
      error
    );

    if (preparedUpload?.pathname) {
      await requestPdfService({
        action: "delete",
        pathname:
          preparedUpload.pathname
      }).catch(() => {});
    }

    setState(
      "error",
      "Impossible d’ajouter le PDF.",
      getReadableError(error)
    );
  } finally {
    ariaState.pdfBusy = false;
    ariaState.pdfUploadName = "";
    ariaState.pdfUploadProgress = 0;
    updatePdfAttachmentInterface();
  }
}

function clearPendingPdfLocal() {
  clearDirectPdfDownloadLink();
  hideDocumentDownloadFallback();
  ariaState.pendingPdf = null;
  ariaState.pendingPdfLocalFile =
    null;
  ariaState.pendingPdfLocalFileValidated =
    false;
  ariaState.pdfUploadName = "";
  ariaState.pdfUploadProgress = 0;
  clearDocumentAnalysis(false);
  savePendingPdfSession();
  updatePdfAttachmentInterface();
  updateDocumentAnalysisInterface();
}

async function discardPendingPdf(
  updateStatus = true
) {
  const pdf = ariaState.pendingPdf;

  clearPendingPdfLocal();

  if (pdf?.pathname) {
    await deleteCachedLocalPdf(
      pdf.pathname
    );
  }

  if (pdf?.pathname && ariaState.accessToken) {
    try {
      await requestPdfService({
        action: "delete",
        pathname: pdf.pathname
      });
    } catch (error) {
      console.warn(
        "Suppression immédiate du PDF impossible.",
        error
      );
    }
  }

  if (updateStatus) {
    setState(
      "idle",
      "PDF retiré.",
      "Le document temporaire a été supprimé du stockage privé."
    );
  }
}

function startNewDocument() {
  if (
    ariaState.newDocumentBusy ||
    ariaState.pdfBusy ||
    ariaState.documentAnalysisBusy ||
    ariaState.documentEditorBusy
  ) {
    return;
  }

  const previousPdf =
    ariaState.pendingPdf
      ? {
          ...ariaState.pendingPdf
        }
      : null;

  if (
    previousPdf &&
    !window.confirm(
      "Commencer un nouveau document ?\n\nLa fiche active et ses métadonnées seront retirées d’ARIA. Le PDF original enregistré sur ton ordinateur restera intact."
    )
  ) {
    return;
  }

  ariaState.newDocumentBusy =
    true;

  clearPendingPdfLocal();

  setState(
    "idle",
    "Nouveau document.",
    "Sélectionne le prochain PDF à analyser."
  );

  // Le sélecteur reste dans le geste utilisateur : aucun await avant le clic.
  getElement(
    "pdf-file-input"
  ).click();

  if (previousPdf?.pathname) {
    deleteCachedLocalPdf(
      previousPdf.pathname
    ).catch(() => {});

    if (ariaState.accessToken) {
      requestPdfService({
        action: "delete",
        pathname:
          previousPdf.pathname
      }).catch((error) => {
        console.warn(
          "Nettoyage différé de l’ancien PDF impossible.",
          error
        );
      });
    }
  }

  window.setTimeout(
    () => {
      ariaState.newDocumentBusy =
        false;
      updateDocumentStabilizationInterface();
    },
    250
  );
}

function retryLocalPdfRestore() {
  if (!ariaState.pendingPdf) {
    setState(
      "idle",
      "Aucun PDF à associer.",
      "Ajoute d’abord un document."
    );
    return;
  }

  ariaState.localPdfRestoreError =
    "";

  // Le clic sur le sélecteur reste directement lié au geste utilisateur.
  requestLocalPdfSource();
}

function updatePdfAttachmentInterface() {
  if (!domReady) return;

  const pdf = ariaState.pendingPdf;
  const card = getElement(
    "pdf-attachment-card"
  );
  const addButton = getElement(
    "add-pdf-button"
  );
  const removeButton = getElement(
    "remove-pdf-button"
  );
  const progressBlock = getElement(
    "pdf-upload-progress"
  );
  const progressBar = getElement(
    "pdf-upload-progress-bar"
  );
  const progressLabel = getElement(
    "pdf-upload-progress-label"
  );
  const progressValue = getElement(
    "pdf-upload-progress-value"
  );

  card.hidden =
    !pdf &&
    !ariaState.pdfBusy;

  addButton.disabled =
    ariaState.isBusy ||
    ariaState.pdfBusy ||
    ariaState.imageBusy ||
    !ariaState.accessToken;

  removeButton.disabled =
    !pdf ||
    ariaState.isBusy ||
    ariaState.pdfBusy ||
    ariaState.documentAnalysisBusy;

  progressBlock.hidden =
    !ariaState.pdfBusy;

  const progress =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          ariaState
            .pdfUploadProgress
        )
      )
    );

  progressBar.value = progress;
  progressValue.textContent =
    `${progress} %`;
  progressLabel.textContent =
    progress <= 0
      ? "Préparation du téléversement"
      : "Téléversement sécurisé";

  if (!pdf) {
    getElement(
      "pdf-attachment-name"
    ).textContent =
      ariaState.pdfUploadName ||
      "Document PDF";

    getElement(
      "pdf-attachment-details"
    ).textContent =
      ariaState.pdfBusy
        ? "Envoi vers le stockage privé"
        : "";

    getElement(
      "pdf-attachment-status"
    ).textContent =
      ariaState.pdfBusy
        ? "Le fichier est en cours de téléversement."
        : "Stockage privé temporaire";

    updateDocumentAnalysisInterface();
    updateDocumentStabilizationInterface();
    return;
  }

  const presentationName =
    pdf.presentationName ||
    ariaState.documentAnalysis
      ?.suggested_filename ||
    "";

  getElement(
    "pdf-attachment-name"
  ).textContent =
    presentationName ||
    pdf.originalName ||
    pdf.name;

  getElement(
    "pdf-attachment-details"
  ).textContent =
    presentationName
      ? `${formatFileSize(pdf.size)} · original : ${pdf.originalName || pdf.name}`
      : `${formatFileSize(pdf.size)} · analyse texte et pages`;

  getElement(
    "pdf-attachment-status"
  ).textContent =
    pdf.presentationStatus ||
    (
      ariaState.pendingPdfLocalFile
        ? "PDF local prêt pour l’analyse et le téléchargement"
        : ariaState.localPdfRestoreBusy
          ? "Vérification du PDF source…"
          : ariaState.documentAnalysis
            ? "PDF actif · associe le fichier source si nécessaire"
            : "PDF restauré · sélection locale requise pour télécharger"
    );

  updateDocumentAnalysisInterface();
  updateDocumentStabilizationInterface();
}

function approximateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "taille inconnue";
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function canvasToDataUrl(canvas, quality) {
  return canvas.toDataURL("image/jpeg", quality);
}

function drawSourceToCanvas(source, sourceWidth, sourceHeight, maxDimension) {
  const scale = Math.min(
    1,
    maxDimension / Math.max(sourceWidth, sourceHeight)
  );

  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });

  if (!context) {
    throw new Error("Le navigateur ne peut pas préparer l’image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  return canvas;
}

async function compressImageSource({
  source,
  width,
  height,
  name,
  sourceType
}) {
  const maxChars = Number(config.maxImageDataUrlChars) || 2500000;
  const initialMaxDimension =
    Number(config.maxImageDimension) || 1440;
  const initialQuality =
    Number(config.imageJpegQuality) || 0.78;

  let maxDimension = initialMaxDimension;
  let bestResult = null;

  for (let sizeAttempt = 0; sizeAttempt < 4; sizeAttempt += 1) {
    const canvas = drawSourceToCanvas(
      source,
      width,
      height,
      maxDimension
    );

    for (const quality of [
      initialQuality,
      0.68,
      0.58,
      0.48
    ]) {
      const dataUrl = canvasToDataUrl(canvas, quality);
      const result = {
        dataUrl,
        mimeType: "image/jpeg",
        name: String(name || "image.jpg").slice(0, 160),
        source: sourceType === "screen" ? "screen" : "file",
        width: canvas.width,
        height: canvas.height,
        approxBytes: approximateDataUrlBytes(dataUrl)
      };

      bestResult = result;

      if (dataUrl.length <= maxChars) {
        return result;
      }
    }

    maxDimension = Math.round(maxDimension * 0.78);
  }

  throw new Error(
    `L’image reste trop volumineuse après compression (${formatFileSize(
      bestResult?.approxBytes
    )}).`
  );
}

async function loadImageElementFromFile(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error("Le fichier image ne peut pas être ouvert."));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function handleImageFileSelection(event) {
  const input = event.currentTarget;
  const [file] = input.files || [];
  input.value = "";

  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setState(
      "error",
      "Format d’image non autorisé.",
      "Utilise un fichier JPEG, PNG ou WebP."
    );
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    setState(
      "error",
      "Fichier trop volumineux.",
      "Choisis une image de moins de 15 Mo avant compression."
    );
    return;
  }

  if (ariaState.pendingPdf) {
    await discardPendingPdf(false);
  }

  ariaState.imageBusy = true;
  updateImageAttachmentInterface();
  setState(
    "thinking",
    "Préparation de l’image…",
    "ARIA compresse l’image localement avant son envoi."
  );

  let imageSource = null;

  try {
    imageSource = await loadImageElementFromFile(file);

    const width =
      imageSource.width ||
      imageSource.naturalWidth;
    const height =
      imageSource.height ||
      imageSource.naturalHeight;

    const attachment = await compressImageSource({
      source: imageSource,
      width,
      height,
      name: file.name,
      sourceType: "file"
    });

    setPendingImage(attachment);
    setState(
      "idle",
      "Image prête.",
      "Elle sera envoyée uniquement avec le prochain message."
    );
  } catch (error) {
    console.error("Image preparation failed:", error);
    setState(
      "error",
      "Impossible de préparer l’image.",
      getReadableError(error)
    );
  } finally {
    if (imageSource && typeof imageSource.close === "function") {
      imageSource.close();
    }

    ariaState.imageBusy = false;
    updateImageAttachmentInterface();
  }
}

async function captureSharedScreen() {
  const video = getElement("screen-preview");

  if (
    !ariaState.stream ||
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    setState(
      "error",
      "Capture indisponible.",
      "Démarre le partage d’écran et attends que l’aperçu soit visible."
    );
    return;
  }

  if (ariaState.pendingPdf) {
    await discardPendingPdf(false);
  }

  ariaState.imageBusy = true;
  updateImageAttachmentInterface();
  setState(
    "thinking",
    "Création de la capture…",
    "La capture est préparée localement."
  );

  try {
    const attachment = await compressImageSource({
      source: video,
      width: video.videoWidth,
      height: video.videoHeight,
      name: `capture-ecran-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.jpg`,
      sourceType: "screen"
    });

    setPendingImage(attachment);
    setState(
      "idle",
      "Capture jointe.",
      "Elle sera envoyée uniquement avec le prochain message."
    );

    getElement("command-panel").scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  } catch (error) {
    console.error("Screen capture failed:", error);
    setState(
      "error",
      "Impossible de créer la capture.",
      getReadableError(error)
    );
  } finally {
    ariaState.imageBusy = false;
    updateImageAttachmentInterface();
  }
}

function setPendingImage(image) {
  ariaState.pendingImage = image || null;
  updateImageAttachmentInterface();
  updatePdfAttachmentInterface();
}

function clearPendingImage(updateStatus = true) {
  ariaState.pendingImage = null;
  updateImageAttachmentInterface();

  if (updateStatus) {
    setState(
      "idle",
      "Image retirée.",
      "Aucune image ne sera envoyée avec le prochain message."
    );
  }
}

function updateImageAttachmentInterface() {
  if (!domReady) return;

  const attachment = ariaState.pendingImage;
  const card = getElement("image-attachment-card");
  const preview = getElement("image-attachment-preview");
  const addButton = getElement("add-image-button");
  const captureButton = getElement("capture-screen-button");
  const removeButton = getElement("remove-image-button");

  card.hidden = !attachment;

  addButton.disabled =
    ariaState.isBusy ||
    ariaState.imageBusy;

  captureButton.disabled =
    ariaState.isBusy ||
    ariaState.imageBusy ||
    !ariaState.stream;

  removeButton.disabled =
    ariaState.isBusy ||
    ariaState.imageBusy;

  if (!attachment) {
    preview.removeAttribute("src");
    getElement("image-attachment-name").textContent =
      "Image jointe";
    getElement("image-attachment-details").textContent = "";
    return;
  }

  preview.src = attachment.dataUrl;
  getElement("image-attachment-name").textContent =
    attachment.name;
  getElement("image-attachment-details").textContent =
    `${
      attachment.source === "screen"
        ? "Capture d’écran"
        : "Fichier image"
    } · ${attachment.width} × ${attachment.height} · ${formatFileSize(
      attachment.approxBytes
    )}`;
}

async function startScreenShare() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    setState("error", "Le partage d’écran n’est pas disponible.", "Utilise un navigateur récent et une page HTTPS.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 12, max: 20 } },
      audio: false
    });

    ariaState.stream = stream;
    const video = getElement("screen-preview");
    video.srcObject = stream;

    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack) {
      videoTrack.addEventListener("ended", () => stopScreenShare(false), { once: true });
    }

    getElement("preview-card").hidden = false;
    getElement("share-button").disabled = true;
    getElement("stop-button").disabled = false;
    updateImageAttachmentInterface();
    setState(
      "observing",
      "Fenêtre partagée.",
      "L’aperçu reste local tant que tu ne joins pas une capture."
    );
  } catch (error) {
    if (error?.name === "NotAllowedError") {
      setState("idle", "Partage annulé.", "ARIA n’a reçu aucun accès à l’écran.");
      return;
    }

    console.error("Screen share error:", error);
    setState("error", "Impossible de démarrer le partage.", getReadableError(error));
  }
}

function stopScreenShare(updateStatus = true) {
  if (ariaState.stream) {
    ariaState.stream.getTracks().forEach((track) => track.stop());
    ariaState.stream = null;
  }

  const video = getElement("screen-preview");
  video.srcObject = null;
  getElement("preview-card").hidden = true;
  getElement("share-button").disabled = false;
  getElement("stop-button").disabled = true;
  updateImageAttachmentInterface();

  if (updateStatus) {
    setState("idle", "Capture arrêtée.", "ARIA ne reçoit plus aucune image de l’écran.");
  } else if (ariaState.mode === "observing") {
    setState("idle", "Partage terminé.", "La source partagée a été fermée.");
  } else {
    updateInterface();
  }
}

async function resetAriaState() {
  if (ariaState.isListening && ariaState.recognition) ariaState.recognition.stop();
  cancelSpeech(false);
  ariaState.voiceTranscript = "";
  stopScreenShare(false);
  clearPendingImage(false);
  await discardPendingPdf(false);
  getElement("command-input").value = "";
  setState("idle", "ARIA est prête.", getModeDetail());
  getElement("command-input").focus();
}

function addMessage(role, content, persist) {
  const cleanContent = String(content || "").trim();
  if (!cleanContent) return null;

  const message = {
    id: createId(),
    role,
    content: cleanContent,
    timestamp: new Date().toISOString()
  };

  if (persist && (role === "user" || role === "assistant")) {
    ariaState.history.push(message);
    trimHistory();
    saveHistory();
  }

  renderMessage(message);
  updateConversationCount();
  return message.id;
}

function addTypingMessage() {
  const id = createId();
  const article = document.createElement("article");
  article.id = id;
  article.className = "message assistant-message typing-message";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = "ARIA";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Réflexion";

  article.append(meta, paragraph);
  getElement("conversation").append(article);
  scrollConversationToBottom();
  return id;
}

function renderMessage(message) {
  const article = document.createElement("article");
  article.id = message.id;
  article.className = `message ${getMessageClass(message.role)}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = message.role === "user" ? "Anand" : message.role === "error" ? "Erreur" : "ARIA";

  const paragraph = document.createElement("p");
  paragraph.textContent = message.content;

  article.append(meta, paragraph);
  getElement("conversation").append(article);
  scrollConversationToBottom();
}

function getMessageClass(role) {
  if (role === "user") return "user-message";
  if (role === "error") return "error-message";
  return "assistant-message";
}

function removeMessageElement(id) {
  document.getElementById(id)?.remove();
}

function clearConversationForAnalysis() {
  ariaState.history = [];

  try {
    localStorage.removeItem(config.localStorageKey);
  } catch (error) {
    console.warn("Unable to clear local history before analysis:", error);
  }

  getElement("conversation").replaceChildren();
  updateConversationCount();
}

window.clearConversationForAnalysis = clearConversationForAnalysis;

function clearConversation() {
  if (!window.confirm("Effacer toute la conversation enregistrée dans ce navigateur ?")) return;

  clearConversationForAnalysis();
  addMessage("assistant", "Conversation effacée. Nous repartons sur une base propre.", false);
  updateConversationCount();
  setState("idle", "Conversation effacée.", getModeDetail());
}

function loadHistory() {
  const conversation = getElement("conversation");

  try {
    const raw = localStorage.getItem(config.localStorageKey);
    if (!raw) {
      updateConversationCount();
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Historique local invalide.");

    const validHistory = parsed
      .filter(isValidStoredMessage)
      .slice(-(Number(config.maxHistoryMessages) || 20));

    if (!validHistory.length) {
      updateConversationCount();
      return;
    }

    ariaState.history = validHistory;
    conversation.replaceChildren();
    validHistory.forEach(renderMessage);
    updateConversationCount();
  } catch (error) {
    console.warn("Unable to restore local history:", error);
    try {
      localStorage.removeItem(config.localStorageKey);
    } catch {}
    updateConversationCount();
  }
}

function isValidStoredMessage(message) {
  return Boolean(
    message &&
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim()
  );
}

function saveHistory() {
  try {
    localStorage.setItem(config.localStorageKey, JSON.stringify(ariaState.history));
  } catch (error) {
    console.warn("Unable to save local history:", error);
    setState("error", "La conversation ne peut pas être mémorisée.", "Le stockage local est peut-être bloqué.");
  }
}

function trimHistory() {
  const maxMessages = Number(config.maxHistoryMessages) || 20;
  if (ariaState.history.length > maxMessages) {
    ariaState.history = ariaState.history.slice(-maxMessages);
  }
}

function updateConversationCount() {
  const count = ariaState.history.length;
  getElement("conversation-count").textContent =
    `${count} message${count > 1 ? "s" : ""} mémorisé${count > 1 ? "s" : ""}`;
}

function scrollConversationToBottom() {
  const conversation = getElement("conversation");
  window.requestAnimationFrame(() => {
    conversation.scrollTop = conversation.scrollHeight;
  });
}

function setBusy(isBusy) {
  ariaState.isBusy = isBusy;
  getElement("send-button").disabled = isBusy;
  getElement("voice-button").disabled = isBusy || !ariaState.recognition;
  getElement("command-input").disabled = isBusy;
  getElement("connect-button").disabled = isBusy;
  getElement("connection-indicator").disabled = isBusy;
  updateVoiceInterface();
  updateImageAttachmentInterface();
  updatePdfAttachmentInterface();
  updateKnowledgeInterface();
}

function setState(mode, message, detail) {
  ariaState.mode = mode;
  ariaState.message = message;
  ariaState.detail = detail;

  if (mode === "error") {
    ariaState.lastDiagnosticCode =
      createDiagnosticReference(
        message
      );
    ariaState.lastDiagnosticMessage =
      String(message || "");
    ariaState.lastDiagnosticDetail =
      String(detail || "");
    ariaState.lastDiagnosticAt =
      new Date().toISOString();
  }

  updateInterface();
}

function updateInterface() {
  if (!domReady) return;

  getElement("status-label").textContent = ariaState.message;
  getElement("detail-label").textContent = ariaState.detail;
  getElement("version-label").textContent =
    `v${String(config.version || "1.11.0").replace(/^v/, "")}`;

  const privacy = getElement("privacy-indicator");
  privacy.textContent = ariaState.pendingPdf
    ? "PDF privé actif"
    : ariaState.pendingImage
      ? "Image prête à envoyer"
      : ariaState.stream
        ? "Écran partagé localement"
        : "Aucune pièce jointe active";
  privacy.classList.toggle(
    "active",
    Boolean(
      ariaState.stream ||
      ariaState.pendingImage ||
      ariaState.pendingPdf
    )
  );
  updateConversationVisibility();
  updateTextInputVisibility();
  updateVoiceInterface();
  updateVoiceOutputIndicator();
  updateImageAttachmentInterface();
  updatePdfAttachmentInterface();
  updateDocumentAnalysisInterface();
  updateRoomBootstrapInterface();

  const electricalCard =
    document.getElementById("electrical-analysis-card");
  if (electricalCard) {
    electricalCard.hidden =
      config.features?.electricalAnalyst === false ||
      electricalCard.hidden;
  }

  updateMemoryProposalCard();
  updateKnowledgeInterface();
  updateBrainIndicator();
}

function updateConnectionIndicator() {
  if (!domReady) return;

  const connected = Boolean(ariaState.accessToken);
  const indicator = getElement("connection-indicator");
  const button = getElement("connect-button");
  const detail = getElement("connection-detail");
  const statusPanel = getElement("status-panel");
  const connectionPanel = getElement("connection-panel");

  indicator.textContent = connected ? "Moteur connecté" : "Connexion requise";
  indicator.classList.toggle("connected", connected);
  indicator.setAttribute(
    "aria-label",
    connected
      ? "ARIA Core est connecté. Cliquer pour se déconnecter."
      : "ARIA Core est déconnecté. Cliquer pour se connecter."
  );
  indicator.title = connected
    ? "Cliquer pour se déconnecter d’ARIA Core"
    : "Cliquer pour se connecter à ARIA Core";

  button.textContent = connected ? "Se déconnecter" : "Se connecter";
  detail.textContent = connected
    ? "Le code d’accès est actif uniquement pour cette session de navigateur."
    : "Le code d’accès reste uniquement dans cette session de navigateur.";

  // Une fois connecté, l’interface principale est automatiquement épurée.
  statusPanel.hidden = connected;
  connectionPanel.hidden = connected;
  updateTextInputVisibility();
  updateVoiceInterface();
  updateBrainIndicator();
}

function getModeDetail() {
  return ariaState.accessToken
    ? "Le moteur ARIA est relié par un backend privé."
    : "Connecte-toi à ARIA Core pour utiliser le modèle d’intelligence artificielle.";
}

function getReadableError(error) {
  if (error?.name === "AbortError") {
    return "Le délai d’attente d’ARIA Core est dépassé.";
  }

  if (error?.message) return error.message;
  return "Une erreur inconnue s’est produite.";
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `aria-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


window.addEventListener("beforeunload", () => {
  if (ariaState.isListening && ariaState.recognition) {
    try {
      ariaState.recognition.abort();
    } catch {}
  }

  cancelSpeech(false);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeInterface();
  } catch (error) {
    console.error("ARIA initialization failed:", error);
    const status = document.getElementById("status-label");
    const detail = document.getElementById("detail-label");
    if (status) status.textContent = "ARIA n’a pas pu démarrer correctement.";
    if (detail) detail.textContent = getReadableError(error);
  }
});

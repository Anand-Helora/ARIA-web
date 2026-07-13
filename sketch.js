"use strict";

const config = window.ARIA_CONFIG || {
  version: "0.7.0",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  speechApiUrl: "https://aria-core-kappa.vercel.app/api/speech",
  memoryApiUrl: "https://aria-core-kappa.vercel.app/api/memory",
  requestTimeoutMs: 45000,
  speechRequestTimeoutMs: 45000,
  memoryRequestTimeoutMs: 30000,
  maxHistoryMessages: 20,
  localStorageKey: "aria.web.conversation.v0.3",
  sessionTokenKey: "aria.web.access-token.session.v0.3",
  conversationVisibilityKey: "aria.web.conversation-visible.v0.6",
  textInputVisibilityKey: "aria.web.text-input-visible.v0.6",
  autoSpeakKey: "aria.web.auto-speak.v0.6",
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
  isTextInputVisible: false,
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
  autoSpeak: true,
  speechRate: 1,
  preferredVoiceName: "openai:coral",
  pendingMemory: null,
  savedMemories: [],
  memoryBusy: false
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
  getElement("reset-button").addEventListener("click", resetAriaState);
  getElement("clear-button").addEventListener("click", clearConversation);
  getElement("toggle-conversation-button").addEventListener("click", toggleConversationVisibility);
  getElement("show-conversation-button").addEventListener("click", () => setConversationVisibility(true));
  getElement("connect-button").addEventListener("click", handleConnectionButton);
  getElement("connection-indicator").addEventListener("click", handleConnectionButton);
  getElement("brain-indicator").addEventListener("click", openBrainDialog);
  getElement("approve-memory-button").addEventListener("click", approvePendingMemory);
  getElement("dismiss-memory-button").addEventListener("click", dismissPendingMemory);
  getElement("brain-dialog-close").addEventListener("click", closeBrainDialog);
  getElement("brain-dialog-done").addEventListener("click", closeBrainDialog);
  getElement("refresh-brain-button").addEventListener("click", loadBrainMemories);

  getElement("access-form").addEventListener("submit", saveAccessToken);
  getElement("dialog-close").addEventListener("click", closeAccessDialog);
  getElement("cancel-access").addEventListener("click", closeAccessDialog);
  getElement("toggle-token").addEventListener("click", toggleTokenVisibility);

  loadAccessToken();
  loadConversationVisibility();
  loadTextInputVisibility();
  loadVoiceSettings();
  loadHistory();
  initializeVoiceRecognition();
  initializeSpeechSynthesis();
  updateInterface();
  updateConnectionIndicator();
  getElement("command-input").focus();
}

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément d'interface introuvable : #${id}`);
  return element;
}

async function handleCommand(options = {}) {
  if (ariaState.isBusy) return;

  const source = options.source === "voice" ? "voice" : "text";
  const input = getElement("command-input");
  const command = input.value.trim();

  if (!command) {
    setState("error", "Instruction vide.", "Écris ou dicte une demande avant de l’envoyer.");
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
  addMessage("user", command, true);
  setBusy(true);
  setState("thinking", "ARIA réfléchit…", "La demande est transmise à ARIA Core.");
  const typingId = addTypingMessage();
  let answerToSpeak = "";

  try {
    const result = await requestRemoteAria();
    removeMessageElement(typingId);
    addMessage("assistant", result.answer, true);
    setPendingMemory(result.memoryProposal);
    answerToSpeak = result.memoryProposal
      ? `${result.answer} Cette information semble utile pour BRAIN. Dis mémorise ou ignore, ou utilise les boutons affichés.`
      : result.answer;
    setState("idle", "Réponse terminée.", "Le moteur privé ARIA Core est connecté.");
  } catch (error) {
    console.error("ARIA request failed:", error);
    removeMessageElement(typingId);

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

async function requestRemoteAria() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.requestTimeoutMs) || 45000
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
        client: {
          name: "ARIA-web",
          version: config.version || "0.7.0"
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
  updateConnectionIndicator();
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
  updateMemoryProposalCard();
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
    ariaState.isTextInputVisible = storedValue === "true";
  } catch (error) {
    console.warn("Unable to restore text input visibility:", error);
    ariaState.isTextInputVisible = false;
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

  const connected = Boolean(ariaState.accessToken);
  const panel = getElement("command-panel");
  const button = getElement("text-mode-button");

  panel.hidden = !connected || !ariaState.isTextInputVisible;
  button.textContent = ariaState.isTextInputVisible
    ? "Masquer le clavier"
    : "Afficher le clavier";
  button.setAttribute(
    "aria-pressed",
    String(ariaState.isTextInputVisible)
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
  getElement("memory-proposal-reason").textContent =
    proposal.reason
      ? `Pourquoi : ${proposal.reason}`
      : "";

  getElement("approve-memory-button").disabled =
    ariaState.memoryBusy;
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

  const indicator = getElement("brain-indicator");
  const connected = Boolean(ariaState.accessToken);

  indicator.disabled = !connected;
  indicator.textContent = ariaState.savedMemories.length
    ? `BRAIN · ${ariaState.savedMemories.length}`
    : "BRAIN";
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

  await loadBrainMemories();
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

    if (ariaState.recognitionMode === "voiceTurn") {
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

    ariaState.autoSpeak = autoSpeak === null ? true : autoSpeak === "true";
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

  consolePanel.hidden = !connected;
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
    setState("observing", "Fenêtre partagée.", "L’aperçu reste local et n’est pas envoyé à ARIA.");
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

  if (updateStatus) {
    setState("idle", "Capture arrêtée.", "ARIA ne reçoit plus aucune image de l’écran.");
  } else if (ariaState.mode === "observing") {
    setState("idle", "Partage terminé.", "La source partagée a été fermée.");
  } else {
    updateInterface();
  }
}

function resetAriaState() {
  if (ariaState.isListening && ariaState.recognition) ariaState.recognition.stop();
  cancelSpeech(false);
  ariaState.voiceTranscript = "";
  stopScreenShare(false);
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

function clearConversation() {
  if (!window.confirm("Effacer toute la conversation enregistrée dans ce navigateur ?")) return;

  ariaState.history = [];

  try {
    localStorage.removeItem(config.localStorageKey);
  } catch (error) {
    console.warn("Unable to clear local history:", error);
  }

  getElement("conversation").replaceChildren();
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
}

function setState(mode, message, detail) {
  ariaState.mode = mode;
  ariaState.message = message;
  ariaState.detail = detail;
  updateInterface();
}

function updateInterface() {
  if (!domReady) return;

  getElement("status-label").textContent = ariaState.message;
  getElement("detail-label").textContent = ariaState.detail;
  getElement("version-label").textContent =
    `v${String(config.version || "0.7.0").replace(/^v/, "")}`;

  const privacy = getElement("privacy-indicator");
  privacy.textContent = ariaState.stream ? "Capture active" : "Aucune capture active";
  privacy.classList.toggle("active", Boolean(ariaState.stream));
  updateConversationVisibility();
  updateTextInputVisibility();
  updateVoiceInterface();
  updateMemoryProposalCard();
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

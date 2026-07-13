"use strict";

const config = window.ARIA_CONFIG || {
  version: "0.5.0",
  mode: "remote",
  apiUrl: "https://aria-core-kappa.vercel.app/api/chat",
  requestTimeoutMs: 45000,
  maxHistoryMessages: 20,
  localStorageKey: "aria.web.conversation.v0.3",
  sessionTokenKey: "aria.web.access-token.session.v0.3",
  conversationVisibilityKey: "aria.web.conversation-visible.v0.5"
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
  isConversationVisible: true
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
  getElement("share-button").addEventListener("click", startScreenShare);
  getElement("stop-button").addEventListener("click", () => stopScreenShare(true));
  getElement("reset-button").addEventListener("click", resetAriaState);
  getElement("clear-button").addEventListener("click", clearConversation);
  getElement("toggle-conversation-button").addEventListener("click", toggleConversationVisibility);
  getElement("show-conversation-button").addEventListener("click", () => setConversationVisibility(true));
  getElement("connect-button").addEventListener("click", handleConnectionButton);

  getElement("access-form").addEventListener("submit", saveAccessToken);
  getElement("dialog-close").addEventListener("click", closeAccessDialog);
  getElement("cancel-access").addEventListener("click", closeAccessDialog);
  getElement("toggle-token").addEventListener("click", toggleTokenVisibility);

  loadAccessToken();
  loadConversationVisibility();
  loadHistory();
  initializeVoiceRecognition();
  updateInterface();
  updateConnectionIndicator();
  getElement("command-input").focus();
}

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément d'interface introuvable : #${id}`);
  return element;
}

async function handleCommand() {
  if (ariaState.isBusy) return;

  const input = getElement("command-input");
  const command = input.value.trim();

  if (!command) {
    setState("error", "Instruction vide.", "Écris ou dicte une demande avant de l’envoyer.");
    input.focus();
    return;
  }

  if (!ariaState.accessToken) {
    setState("idle", "Connexion requise.", "Saisis ton code d’accès ARIA Core.");
    openAccessDialog();
    return;
  }

  input.value = "";
  addMessage("user", command, true);
  setBusy(true);
  setState("thinking", "ARIA réfléchit…", "La demande est transmise à ARIA Core.");
  const typingId = addTypingMessage();

  try {
    const answer = await requestRemoteAria();
    removeMessageElement(typingId);
    addMessage("assistant", answer, true);
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
    input.focus();
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
          version: config.version || "0.5.0"
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

    return answer;
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
      ariaState.isConversationVisible = true;
      return;
    }

    ariaState.isConversationVisible = storedValue === "true";
  } catch (error) {
    console.warn("Unable to restore conversation visibility:", error);
    ariaState.isConversationVisible = true;
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

function initializeVoiceRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceButton = getElement("voice-button");

  if (!Recognition) {
    voiceButton.disabled = true;
    voiceButton.title = "La dictée vocale n’est pas disponible dans ce navigateur.";
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "fr-BE";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    ariaState.isListening = true;
    updateVoiceButton();
    setState("listening", "Je t’écoute…", "Parle naturellement, puis marque une courte pause.");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }
    getElement("command-input").value = transcript.trim();
  };

  recognition.onerror = (event) => {
    setState("error", "La dictée vocale s’est interrompue.", getVoiceErrorMessage(event.error));
  };

  recognition.onend = () => {
    ariaState.isListening = false;
    updateVoiceButton();

    if (ariaState.mode === "listening") {
      const hasText = getElement("command-input").value.trim().length > 0;
      setState(
        "idle",
        hasText ? "Dictée terminée." : "ARIA est prête.",
        hasText ? "Relis le texte, puis clique sur Envoyer." : getModeDetail()
      );
    }
  };

  ariaState.recognition = recognition;
}

function toggleVoiceRecognition() {
  if (!ariaState.recognition) return;

  try {
    if (ariaState.isListening) ariaState.recognition.stop();
    else ariaState.recognition.start();
  } catch (error) {
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
    `v${String(config.version || "0.5.0").replace(/^v/, "")}`;

  const privacy = getElement("privacy-indicator");
  privacy.textContent = ariaState.stream ? "Capture active" : "Aucune capture active";
  privacy.classList.toggle("active", Boolean(ariaState.stream));
  updateConversationVisibility();
}

function updateConnectionIndicator() {
  if (!domReady) return;

  const connected = Boolean(ariaState.accessToken);
  const indicator = getElement("connection-indicator");
  const button = getElement("connect-button");
  const detail = getElement("connection-detail");

  indicator.textContent = connected ? "Moteur connecté" : "Connexion requise";
  indicator.classList.toggle("connected", connected);
  button.textContent = connected ? "Se déconnecter" : "Se connecter";
  detail.textContent = connected
    ? "Le code d’accès est actif uniquement pour cette session de navigateur."
    : "Le code d’accès reste uniquement dans cette session de navigateur.";
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

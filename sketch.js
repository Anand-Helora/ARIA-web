"use strict";

const config = window.ARIA_CONFIG || {
  version: "0.2.0",
  mode: "local",
  apiUrl: "",
  requestTimeoutMs: 30000,
  maxHistoryMessages: 20,
  localStorageKey: "aria.web.conversation.v0.2"
};

const ariaState = {
  mode: "idle",
  message: "ARIA est prête.",
  detail: "La conversation reste enregistrée uniquement dans ce navigateur.",
  stream: null,
  recognition: null,
  isListening: false,
  isBusy: false,
  history: []
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
  if (!stage) {
    return;
  }

  const maxWidth = Math.min(420, Math.max(260, window.innerWidth - 36));
  const canvas = createCanvas(maxWidth, Math.round(maxWidth * 0.79));
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
  if (typeof resizeCanvas !== "function") {
    return;
  }
  const maxWidth = Math.min(420, Math.max(260, window.innerWidth - 36));
  resizeCanvas(maxWidth, Math.round(maxWidth * 0.79));
}

function initializeInterface() {
  if (domReady) {
    return;
  }
  domReady = true;

  const input = getElement("command-input");
  const sendButton = getElement("send-button");
  const voiceButton = getElement("voice-button");
  const shareButton = getElement("share-button");
  const stopButton = getElement("stop-button");
  const resetButton = getElement("reset-button");
  const clearButton = getElement("clear-button");

  sendButton.addEventListener("click", handleCommand);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCommand();
    }
  });
  voiceButton.addEventListener("click", toggleVoiceRecognition);
  shareButton.addEventListener("click", startScreenShare);
  stopButton.addEventListener("click", () => stopScreenShare(true));
  resetButton.addEventListener("click", resetAriaState);
  clearButton.addEventListener("click", clearConversation);

  loadHistory();
  initializeVoiceRecognition();
  updateInterface();
  updateConnectionIndicator();
  input.focus();
}

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Élément d'interface introuvable : #${id}`);
  }
  return element;
}

async function handleCommand() {
  if (ariaState.isBusy) {
    return;
  }

  const input = getElement("command-input");
  const command = input.value.trim();

  if (!command) {
    setState("error", "Instruction vide.", "Écris ou dicte une demande avant de l’envoyer.");
    input.focus();
    return;
  }

  input.value = "";
  addMessage("user", command, true);
  setBusy(true);
  setState("thinking", "ARIA réfléchit…", "Analyse de la demande en cours.");
  const typingId = addTypingMessage();

  try {
    const response = await askAria(command);
    removeMessageElement(typingId);
    addMessage("assistant", response, true);
    setState("idle", "Réponse terminée.", getModeDetail());
  } catch (error) {
    console.error("ARIA request failed:", error);
    removeMessageElement(typingId);
    addMessage(
      "error",
      "Je n’ai pas pu traiter la demande. La connexion au moteur ARIA a échoué.",
      false
    );
    setState("error", "Erreur de traitement.", getReadableError(error));
  } finally {
    setBusy(false);
    input.focus();
  }
}

async function askAria(command) {
  if (config.mode === "remote" && config.apiUrl) {
    return requestRemoteAria(command);
  }

  await delay(650 + Math.min(command.length * 7, 900));
  return buildLocalResponse(command);
}

async function requestRemoteAria(command) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.requestTimeoutMs) || 30000
  );

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: command,
        history: ariaState.history.slice(-(Number(config.maxHistoryMessages) || 20)),
        client: {
          name: "ARIA-web",
          version: config.version || "0.2.0"
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Le serveur ARIA a répondu avec le statut ${response.status}.`);
    }

    const data = await response.json();
    const answer = typeof data.answer === "string" ? data.answer.trim() : "";

    if (!answer) {
      throw new Error("Le serveur ARIA n’a renvoyé aucune réponse exploitable.");
    }

    return answer;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildLocalResponse(command) {
  const normalized = normalizeText(command);

  if (matchesAny(normalized, ["bonjour", "bonsoir", "salut", "hello", "coucou"])) {
    return "Bonjour Anand. L’interface conversationnelle fonctionne. Je suis encore en mode local, mais nous pouvons déjà tester la saisie, la mémoire de session et la dictée vocale.";
  }

  if (matchesAny(normalized, ["qui es tu", "presente toi", "ton nom", "que signifie aria"])) {
    return "Je suis ARIA : Assistante de Raisonnement par l’Intelligence Artificielle. Cette version prépare l’interface, la conversation et les contrôles de confidentialité avant la connexion à mon véritable moteur de raisonnement.";
  }

  if (matchesAny(normalized, ["que peux tu faire", "tes fonctions", "aide", "help", "capacites"])) {
    return [
      "Dans cette version, je peux :",
      "• recevoir et conserver localement une conversation ;",
      "• accepter une instruction écrite ou dictée ;",
      "• afficher un partage d’écran local avec arrêt immédiat ;",
      "• préparer les requêtes pour un futur backend sécurisé.",
      "Je ne peux pas encore analyser réellement un document, une image ou ton écran sans ce backend."
    ].join("\n");
  }

  if (matchesAny(normalized, ["partage", "ecran", "fenetre", "capture"])) {
    if (ariaState.stream) {
      return "Je vois qu’un partage est actif dans l’interface. Pour l’instant, son aperçu reste strictement local et je ne reçois pas encore les images pour les analyser.";
    }
    return "Clique sur « Partager mon écran », puis choisis une fenêtre. Le navigateur te demandera toujours une autorisation explicite. Dans cette version, l’aperçu reste local et n’est pas analysé.";
  }

  if (matchesAny(normalized, ["memoire", "souviens", "historique", "conversation"])) {
    return "Je conserve l’historique de cette version dans le stockage local de ton navigateur. Il ne quitte pas ton appareil. Le bouton « Effacer » supprime cette conversation locale.";
  }

  if (matchesAny(normalized, ["revit", "dynamo", "autocad", "sharepoint", "powerapps", "excel", "bim"])) {
    return "J’ai identifié une demande liée à ton environnement BIM et numérique. Le classement de l’intention fonctionne, mais le moteur métier et les connecteurs ne sont pas encore reliés à cette interface publique.";
  }

  if (matchesAny(normalized, ["version", "mode local", "connecte", "connexion", "api"])) {
    return `Cette interface utilise ARIA-web ${config.version || "v0.2"} en mode local. Aucune clé secrète n’est stockée dans le dépôt public. La prochaine étape consiste à connecter un backend privé et sécurisé.`;
  }

  return [
    `J’ai bien reçu : « ${command} »`,
    "La chaîne de conversation fonctionne correctement. Cependant, je suis encore en mode local : je peux reconnaître quelques intentions, mais je ne dispose pas encore d’un modèle d’IA connecté pour produire une analyse complète."
  ].join("\n\n");
}

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAny(value, terms, requireAll = false) {
  if (requireAll) {
    return terms.every((term) => value.includes(term));
  }
  return terms.some((term) => value.includes(term));
}

function initializeVoiceRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceButton = getElement("voice-button");

  if (!Recognition) {
    voiceButton.disabled = true;
    voiceButton.title = "La dictée vocale n’est pas disponible dans ce navigateur.";
    voiceButton.setAttribute("aria-label", "Dictée vocale indisponible");
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
    const details = getVoiceErrorMessage(event.error);
    setState("error", "La dictée vocale s’est interrompue.", details);
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
  if (!ariaState.recognition) {
    return;
  }

  try {
    if (ariaState.isListening) {
      ariaState.recognition.stop();
    } else {
      ariaState.recognition.start();
    }
  } catch (error) {
    console.error("Voice recognition error:", error);
    setState("error", "Impossible de démarrer la dictée.", getReadableError(error));
  }
}

function updateVoiceButton() {
  const voiceButton = getElement("voice-button");
  voiceButton.classList.toggle("listening", ariaState.isListening);
  voiceButton.setAttribute(
    "aria-label",
    ariaState.isListening ? "Arrêter la dictée vocale" : "Démarrer la dictée vocale"
  );
  voiceButton.title = ariaState.isListening ? "Arrêter la dictée" : "Dictée vocale";
}

function getVoiceErrorMessage(code) {
  const messages = {
    "not-allowed": "Autorise l’accès au microphone dans les réglages du navigateur.",
    "service-not-allowed": "Le service de reconnaissance vocale est bloqué par le navigateur ou l’organisation.",
    "no-speech": "Aucune parole n’a été détectée.",
    "audio-capture": "Aucun microphone utilisable n’a été trouvé.",
    network: "Le service de dictée vocale n’est pas joignable pour le moment.",
    aborted: "La dictée a été arrêtée."
  };
  return messages[code] || `Erreur de dictée : ${code || "inconnue"}.`;
}

async function startScreenShare() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    setState(
      "error",
      "Le partage d’écran n’est pas disponible.",
      "Utilise un navigateur récent et une page HTTPS."
    );
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
    setState(
      "observing",
      "Fenêtre partagée.",
      "L’aperçu reste local et n’est ni enregistré ni analysé dans cette version."
    );
  } catch (error) {
    if (error && error.name === "NotAllowedError") {
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
  if (ariaState.isListening && ariaState.recognition) {
    ariaState.recognition.stop();
  }
  stopScreenShare(false);
  getElement("command-input").value = "";
  setState("idle", "ARIA est prête.", getModeDetail());
  getElement("command-input").focus();
}

function addMessage(role, content, persist) {
  const cleanContent = String(content || "").trim();
  if (!cleanContent) {
    return null;
  }

  const id = createId();
  const message = {
    id,
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
  return id;
}

function addTypingMessage() {
  const id = createId();
  const conversation = getElement("conversation");
  const article = document.createElement("article");
  article.id = id;
  article.className = "message assistant-message typing-message";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = "ARIA";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Réflexion";

  article.append(meta, paragraph);
  conversation.append(article);
  scrollConversationToBottom();
  return id;
}

function renderMessage(message) {
  const conversation = getElement("conversation");
  const article = document.createElement("article");
  article.id = message.id;
  article.className = `message ${getMessageClass(message.role)}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = message.role === "user" ? "Anand" : message.role === "error" ? "Erreur" : "ARIA";

  const paragraph = document.createElement("p");
  paragraph.textContent = message.content;

  article.append(meta, paragraph);
  conversation.append(article);
  scrollConversationToBottom();
}

function getMessageClass(role) {
  if (role === "user") {
    return "user-message";
  }
  if (role === "error") {
    return "error-message";
  }
  return "assistant-message";
}

function removeMessageElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

function clearConversation() {
  const confirmed = window.confirm("Effacer toute la conversation enregistrée dans ce navigateur ?");
  if (!confirmed) {
    return;
  }

  ariaState.history = [];
  try {
    localStorage.removeItem(config.localStorageKey);
  } catch (error) {
    console.warn("Unable to clear local history:", error);
  }

  const conversation = getElement("conversation");
  conversation.replaceChildren();
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
    if (!Array.isArray(parsed)) {
      throw new Error("Le format de l’historique local est invalide.");
    }

    const validHistory = parsed
      .filter(isValidStoredMessage)
      .slice(-(Number(config.maxHistoryMessages) || 20));

    if (validHistory.length === 0) {
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
    } catch (storageError) {
      console.warn("Unable to reset invalid local history:", storageError);
    }
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
    setState(
      "error",
      "La conversation ne peut pas être mémorisée.",
      "Le stockage local est peut-être bloqué par le navigateur."
    );
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
  getElement("conversation-count").textContent = `${count} message${count > 1 ? "s" : ""} mémorisé${count > 1 ? "s" : ""}`;
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
}

function setState(mode, message, detail) {
  ariaState.mode = mode;
  ariaState.message = message;
  ariaState.detail = detail;
  updateInterface();
}

function updateInterface() {
  if (!domReady) {
    return;
  }

  getElement("status-label").textContent = ariaState.message;
  getElement("detail-label").textContent = ariaState.detail;
  getElement("version-label").textContent = `v${String(config.version || "0.2.0").replace(/^v/, "")}`;

  const privacy = getElement("privacy-indicator");
  if (ariaState.stream) {
    privacy.textContent = "Capture active";
    privacy.classList.add("active");
  } else {
    privacy.textContent = "Aucune capture active";
    privacy.classList.remove("active");
  }
}

function updateConnectionIndicator() {
  const indicator = getElement("connection-indicator");
  const isRemote = config.mode === "remote" && Boolean(config.apiUrl);
  indicator.textContent = isRemote ? "Moteur connecté" : "Mode local";
  indicator.classList.toggle("remote", isRemote);
}

function getModeDetail() {
  return config.mode === "remote" && config.apiUrl
    ? "Le moteur ARIA est connecté par un backend sécurisé."
    : "Mode local actif : aucune donnée n’est transmise à un moteur d’IA.";
}

function getReadableError(error) {
  if (error && error.name === "AbortError") {
    return "Le délai d’attente du serveur ARIA est dépassé.";
  }
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return "Une erreur inconnue s’est produite.";
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `aria-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeInterface();
  } catch (error) {
    console.error("ARIA initialization failed:", error);
    const status = document.getElementById("status-label");
    const detail = document.getElementById("detail-label");
    if (status) {
      status.textContent = "ARIA n’a pas pu démarrer correctement.";
    }
    if (detail) {
      detail.textContent = getReadableError(error);
    }
  }
});

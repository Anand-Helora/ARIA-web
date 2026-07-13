"use strict";

const ariaState = {
  mode: "idle",
  message: "ARIA est prête.",
  detail: "Aucune donnée n’est transmise ou enregistrée.",
  stream: null
};

const stateVisuals = {
  idle: { speed: 0.018, amplitude: 10 },
  listening: { speed: 0.04, amplitude: 18 },
  observing: { speed: 0.06, amplitude: 24 },
  thinking: { speed: 0.09, amplitude: 30 },
  error: { speed: 0.025, amplitude: 7 }
};

let phase = 0;

function setup() {
  const canvas = createCanvas(420, 360);
  canvas.parent("visual-stage");
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  noFill();
  strokeCap(ROUND);
  bindInterface();
  updateInterface();
}

function draw() {
  clear();
  phase += stateVisuals[ariaState.mode].speed;

  translate(width / 2, height / 2);
  drawAmbientRings();
  drawCore();
}

function drawAmbientRings() {
  const visual = stateVisuals[ariaState.mode];

  for (let i = 0; i < 5; i += 1) {
    const pulse = sin(phase + i * 0.7) * visual.amplitude;
    const diameter = 145 + i * 28 + pulse;
    const alpha = 48 - i * 6;

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

function bindInterface() {
  const input = document.getElementById("command-input");
  const sendButton = document.getElementById("send-button");
  const shareButton = document.getElementById("share-button");
  const stopButton = document.getElementById("stop-button");
  const resetButton = document.getElementById("reset-button");

  sendButton.addEventListener("click", handleCommand);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleCommand();
    }
  });

  shareButton.addEventListener("click", startScreenShare);
  stopButton.addEventListener("click", stopScreenShare);
  resetButton.addEventListener("click", resetAria);
}

function handleCommand() {
  const input = document.getElementById("command-input");
  const command = input.value.trim();

  if (!command) {
    setState("error", "Instruction vide.", "Écris une demande avant de l’envoyer.");
    return;
  }

  setState(
    "thinking",
    `Instruction reçue : « ${command} »`,
    "Le prototype ne contacte encore aucun modèle d’intelligence artificielle."
  );

  input.value = "";

  window.setTimeout(() => {
    if (ariaState.mode === "thinking") {
      setState(
        "idle",
        "ARIA est prête.",
        "La prochaine étape sera de relier cette interface à ARIA Core."
      );
    }
  }, 2400);
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
      video: true,
      audio: false
    });

    ariaState.stream = stream;
    const video = document.getElementById("screen-preview");
    video.srcObject = stream;

    stream.getVideoTracks()[0].addEventListener("ended", () => {
      stopScreenShare(false);
    });

    document.getElementById("preview-card").hidden = false;
    document.getElementById("share-button").disabled = true;
    document.getElementById("stop-button").disabled = false;

    setState(
      "observing",
      "Fenêtre partagée.",
      "Le flux reste local dans ce prototype et n’est pas enregistré."
    );
  } catch (error) {
    if (error && error.name === "NotAllowedError") {
      setState(
        "idle",
        "Partage annulé.",
        "ARIA n’a reçu aucun accès à l’écran."
      );
      return;
    }

    console.error(error);
    setState(
      "error",
      "Impossible de démarrer le partage.",
      "Consulte la console du navigateur pour le détail technique."
    );
  }
}

function stopScreenShare(updateStatus = true) {
  if (ariaState.stream) {
    ariaState.stream.getTracks().forEach((track) => track.stop());
    ariaState.stream = null;
  }

  const video = document.getElementById("screen-preview");
  video.srcObject = null;

  document.getElementById("preview-card").hidden = true;
  document.getElementById("share-button").disabled = false;
  document.getElementById("stop-button").disabled = true;

  if (updateStatus) {
    setState(
      "idle",
      "Capture arrêtée.",
      "ARIA ne reçoit plus aucune image de l’écran."
    );
  } else {
    setState(
      "idle",
      "Partage terminé.",
      "La source partagée a été fermée."
    );
  }
}

function resetAria() {
  stopScreenShare(false);
  document.getElementById("command-input").value = "";
  setState(
    "idle",
    "ARIA est prête.",
    "Aucune donnée n’est transmise ou enregistrée."
  );
}

function setState(mode, message, detail) {
  ariaState.mode = mode;
  ariaState.message = message;
  ariaState.detail = detail;
  updateInterface();
}

function updateInterface() {
  const status = document.getElementById("status-label");
  const detail = document.getElementById("detail-label");
  const privacy = document.getElementById("privacy-indicator");

  status.textContent = ariaState.message;
  detail.textContent = ariaState.detail;

  if (ariaState.stream) {
    privacy.textContent = "Capture active";
    privacy.classList.add("active");
  } else {
    privacy.textContent = "Aucune capture active";
    privacy.classList.remove("active");
  }
}

function windowResized() {
  const maxWidth = Math.min(420, window.innerWidth - 36);
  resizeCanvas(maxWidth, Math.round(maxWidth * 0.857));
}

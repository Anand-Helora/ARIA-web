"use strict";

let roomUiBound = false;
let roomCurrentQuestionIndex = 0;
let roomAnswers = [];

function roomGet(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Élément Room Intelligence introuvable : ${id}`);
  }
  return element;
}

function initializeRoomIntelligence() {
  if (roomUiBound) {
    updateRoomIntelligenceInterface();
    return;
  }

  roomUiBound = true;

  roomGet("start-room-voice-interview").addEventListener(
    "click",
    startRoomVoiceInterview
  );
  roomGet("save-room-answer").addEventListener(
    "click",
    saveCurrentRoomAnswer
  );
  roomGet("skip-room-question").addEventListener(
    "click",
    () => saveCurrentRoomAnswer("Je ne sais pas")
  );
  roomGet("room-answer-input").addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveCurrentRoomAnswer();
      }
    }
  );
  roomGet("download-room-json").addEventListener(
    "click",
    downloadRoomControlData
  );

  updateRoomIntelligenceInterface();
}

function createRoomRequestController(timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );
  return {
    controller,
    clear: () => window.clearTimeout(timer)
  };
}

async function runRoomAnalysis() {
  if (ariaState.roomAnalysisBusy) return;

  if (!ariaState.accessToken) {
    openAccessDialog();
    return;
  }

  if (!ariaState.pendingPdf || !ariaState.documentAnalysis) {
    setState(
      "error",
      "Classement initial requis.",
      "Analyse et classe d’abord le PDF."
    );
    return;
  }

  const activePdfSize =
    Number(
      ariaState.pendingPdf.size ||
      ariaState.pendingPdfLocalFile?.size ||
      0
    );

  if (
    Number.isFinite(activePdfSize) &&
    activePdfSize > 45 * 1024 * 1024
  ) {
    ariaState.roomModuleError =
      "Ce PDF dépasse la limite de 45 Mo.";
    updateRoomIntelligenceInterface();
    return;
  }

  ariaState.roomAnalysisBusy = true;
  ariaState.roomModuleError = "";
  roomCurrentQuestionIndex = 0;
  roomAnswers = [];
  updateRoomIntelligenceInterface();

  const progress = createRoomProgress();

  const request = createRoomRequestController(
    config.roomsRequestTimeoutMs || 210000
  );

  try {
    const response = await fetch(
      config.roomsApiUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ariaState.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "analyze",
          pdf: {
            pathname:
              ariaState.pendingPdf.pathname,
            name:
              ariaState.pendingPdf.name,
            size:
              Number(
                ariaState.pendingPdf.size ||
                ariaState.pendingPdfLocalFile?.size ||
                0
              ),
            detail:
              ariaState.pendingPdf.detail ||
              "auto"
          },
          classification: ariaState.documentAnalysis
        }),
        signal: request.controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ||
        "ARIA Core n’a pas pu reconstruire les locaux."
      );
    }

    ariaState.roomAnalysis = data.analysis;
    progress.finish();
    setState(
      "idle",
      "Fiches local préparées.",
      `${data.analysis?.rooms?.length || 0} locaux ont été reconstruits.`
    );
  } catch (error) {
    progress.stop();
    const rawMessage = getReadableError(error);

    ariaState.roomModuleError =
      /unterminated string|unexpected end of json|end of json input/i.test(
        rawMessage
      )
        ? "La réponse d’analyse a été interrompue avant la fin. " +
          "Le Core doit être mis à jour vers la v0.13.2."
        : rawMessage;

    setState(
      "error",
      "L’analyse des locaux a échoué.",
      ariaState.roomModuleError
    );
  } finally {
    request.clear();
    ariaState.roomAnalysisBusy = false;
    updateRoomIntelligenceInterface();
  }
}

function createRoomProgress() {
  const stages = [
    [8, "Lecture du cartouche"],
    [20, "Détection du bureau d’études"],
    [35, "Indexation des folios"],
    [52, "Reconstruction des locaux"],
    [68, "Détection des équipements"],
    [80, "Proposition des influences externes"],
    [90, "Préparation des questions"],
    [96, "Contrôle des données"]
  ];
  let index = 0;
  let value = 4;

  const apply = () => {
    const [target, label] = stages[Math.min(index, stages.length - 1)];
    value = Math.min(target, value + Math.max(1, (target - value) * 0.2));
    roomGet("room-progress-value").textContent = `${Math.round(value)} %`;
    roomGet("room-progress-bar").style.width = `${Math.round(value)}%`;
    roomGet("room-progress-label").textContent = label;
    if (value >= target - 1 && index < stages.length - 1) {
      index += 1;
    }
  };

  apply();
  const timer = window.setInterval(apply, 900);

  return {
    finish() {
      window.clearInterval(timer);
      roomGet("room-progress-value").textContent = "100 %";
      roomGet("room-progress-bar").style.width = "100%";
      roomGet("room-progress-label").textContent = "Analyse terminée";
    },
    stop() {
      window.clearInterval(timer);
    }
  };
}

function updateRoomIntelligenceInterface() {
  const card = roomGet("room-intelligence-card");
  const empty = roomGet("room-analysis-empty");
  const content = roomGet("room-analysis-content");
  const progress = roomGet("room-analysis-progress");
  const errorPanel = roomGet("room-analysis-error");
  const runButton = roomGet("run-room-analysis-button");

  const available =
    Boolean(ariaState.pendingPdf && ariaState.documentAnalysis) &&
    config.features?.roomIntelligence !== false;

  card.hidden = !available;
  if (!available) return;

  progress.hidden = !ariaState.roomAnalysisBusy;
  errorPanel.hidden = !ariaState.roomModuleError;
  roomGet("room-analysis-error-text").textContent =
    ariaState.roomModuleError || "";

  const hasAnalysis = Boolean(ariaState.roomAnalysis);

  ariaState.roomModuleLoading = false;

  empty.hidden = hasAnalysis || ariaState.roomAnalysisBusy;
  content.hidden = !hasAnalysis || ariaState.roomAnalysisBusy;

  runButton.disabled =
    ariaState.roomAnalysisBusy ||
    ariaState.documentAnalysisBusy;

  runButton.textContent =
    ariaState.roomAnalysisBusy
      ? "Analyse du dossier…"
      : ariaState.roomModuleError
        ? "Relancer l’analyse"
        : hasAnalysis
          ? "Actualiser les fiches"
          : "Créer les fiches local";

  roomGet("room-analysis-badge").textContent =
    ariaState.roomAnalysisBusy
      ? "Analyse en cours"
      : ariaState.roomModuleError
        ? "À relancer"
        : hasAnalysis
          ? "Proposition prête"
          : "Prêt";

  if (hasAnalysis) {
    renderRoomAnalysis();
  }
}

function renderRoomAnalysis() {
  const analysis = ariaState.roomAnalysis;
  const dossier = analysis?.dossier || {};
  const bureau = analysis?.bureau_profile || {};
  const readiness = analysis?.export_readiness || {};
  const rooms = Array.isArray(analysis?.rooms) ? analysis.rooms : [];
  const questions = Array.isArray(analysis?.global_questions)
    ? analysis.global_questions
    : [];

  roomGet("room-dossier-type").textContent =
    dossier.document_type || "Dossier technique";
  roomGet("room-dossier-summary").textContent =
    dossier.summary || "Résumé non disponible.";
  roomGet("room-count-value").textContent =
    String(readiness.room_count ?? rooms.length);
  roomGet("room-equipment-count-value").textContent =
    String(readiness.equipment_group_count ?? 0);
  roomGet("room-question-count-value").textContent =
    String(questions.length);

  roomGet("room-bureau-name").textContent =
    bureau.detected_name || "Bureau non déterminé";
  roomGet("room-bureau-profile").textContent =
    bureau.profile_id
      ? `${bureau.profile_id} · ${bureau.profile_version || "version inconnue"}`
      : "Nouveau profil à préparer";
  roomGet("room-bureau-confidence").textContent =
    `${Math.round((Number(bureau.confidence) || 0) * 100)} %`;

  renderRoomList(rooms);
  renderRoomQuestion();
  roomGet("room-export-status").textContent =
    readiness.ready
      ? "Données prêtes pour export"
      : `${questions.length} point(s) à valider avant export définitif`;
}

function renderRoomList(rooms) {
  const container = roomGet("room-list");
  container.replaceChildren();

  for (const room of rooms) {
    const article = document.createElement("article");
    article.className = "room-card";

    const influences = Array.isArray(room.influences)
      ? room.influences
      : [];
    const equipment = Array.isArray(room.equipment)
      ? room.equipment
      : [];

    article.innerHTML = `
      <div class="room-card-heading">
        <div>
          <span>${escapeRoomHtml(room.local_id || "Local à confirmer")}</span>
          <h4>${escapeRoomHtml(
            room.projected_name ||
            room.existing_name ||
            "Local sans nom"
          )}</h4>
        </div>
        <strong>${Math.round((Number(room.confidence) || 0) * 100)} %</strong>
      </div>
      <p>${escapeRoomHtml(room.summary || "")}</p>
      <dl class="room-card-grid">
        <div>
          <dt>Existant</dt>
          <dd>${escapeRoomHtml(room.existing_name || "—")}</dd>
        </div>
        <div>
          <dt>Projeté</dt>
          <dd>${escapeRoomHtml(room.projected_name || "—")}</dd>
        </div>
        <div>
          <dt>Surface projetée</dt>
          <dd>${Number(room.projected_surface_m2) || 0} m²</dd>
        </div>
        <div>
          <dt>Équipements groupés</dt>
          <dd>${equipment.length}</dd>
        </div>
        <div>
          <dt>Influences proposées</dt>
          <dd>${influences.length}</dd>
        </div>
        <div>
          <dt>Points à vérifier</dt>
          <dd>${(room.questions || []).length + (room.contradictions || []).length}</dd>
        </div>
      </dl>
      <details>
        <summary>Voir les premières détections</summary>
        <div class="room-chip-list">
          ${equipment.slice(0, 12).map((item) =>
            `<span>${escapeRoomHtml(item.label || item.canonical_type)} × ${item.quantity}</span>`
          ).join("") || "<span>Aucun équipement confirmé</span>"}
        </div>
      </details>
    `;

    container.append(article);
  }

  if (rooms.length === 0) {
    container.innerHTML =
      '<p class="room-empty-copy">Aucun local n’a pu être reconstruit.</p>';
  }
}

function getCurrentRoomQuestion() {
  const questions = Array.isArray(
    ariaState.roomAnalysis?.global_questions
  )
    ? ariaState.roomAnalysis.global_questions
    : [];

  return questions[roomCurrentQuestionIndex] || null;
}

function renderRoomQuestion() {
  const panel = roomGet("room-interview-panel");
  const question = getCurrentRoomQuestion();

  panel.hidden = !question;

  if (!question) return;

  roomGet("room-question-scope").textContent =
    `${question.scope || "document"} · ${question.priority || "priorité normale"}`;
  roomGet("room-question-text").textContent =
    question.question;
  roomGet("room-question-reason").textContent =
    question.reason || "";

  const options = roomGet("room-question-options");
  options.replaceChildren();

  for (const option of question.suggested_options || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-option-button";
    button.textContent = option;
    button.addEventListener("click", () => {
      roomGet("room-answer-input").value = option;
      saveCurrentRoomAnswer();
    });
    options.append(button);
  }

  roomGet("room-answer-input").value = "";
}

function saveCurrentRoomAnswer(forcedValue) {
  const question = getCurrentRoomQuestion();
  if (!question) return;

  const value = String(
    forcedValue ?? roomGet("room-answer-input").value
  ).trim();

  if (!value) {
    setState(
      "idle",
      "Réponse requise.",
      "Réponds, choisis une option ou utilise « Je ne sais pas »."
    );
    return;
  }

  roomAnswers.push({
    question_id: question.question_id,
    question: question.question,
    answer: value,
    scope: question.scope,
    answered_at: new Date().toISOString()
  });

  roomCurrentQuestionIndex += 1;
  renderRoomQuestion();

  if (!getCurrentRoomQuestion()) {
    setState(
      "idle",
      "Entretien terminé.",
      `${roomAnswers.length} réponse(s) ont été préparées pour validation.`
    );
  }
}

async function startRoomVoiceInterview() {
  const question = getCurrentRoomQuestion();
  if (!question) {
    setState(
      "idle",
      "Aucune question restante.",
      "Les données peuvent être contrôlées avant l’export."
    );
    return;
  }

  await speakText(question.question);

  const started = window.startAriaRoomVoiceCapture?.(
    (transcript) => {
      roomGet("room-answer-input").value = transcript;
      saveCurrentRoomAnswer();
      const nextQuestion = getCurrentRoomQuestion();
      if (nextQuestion) {
        window.setTimeout(
          () => startRoomVoiceInterview(),
          500
        );
      }
    }
  );

  if (!started) {
    setState(
      "idle",
      "Microphone indisponible.",
      "Réponds par écrit ou utilise une option proposée."
    );
  }
}

function downloadRoomControlData() {
  if (!ariaState.roomAnalysis) return;

  const payload = {
    analysis: ariaState.roomAnalysis,
    answers: roomAnswers,
    exported_at: new Date().toISOString(),
    status: "CONTROL_DATA_NOT_OFFICIAL"
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ARIA_Fiches_Local_Donnees_Controle.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeRoomHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

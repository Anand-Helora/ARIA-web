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
  roomGet("download-room-excel").addEventListener(
    "click",
    downloadRoomExcel
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
          "Le Core doit être mis à jour vers la dernière version Room Intelligence."
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
  const questions = getRoomQuestionQueue(analysis);
  const allQuestions = Array.isArray(analysis?.questions)
    ? analysis.questions
    : questions;

  roomGet("room-dossier-type").textContent =
    dossier.document_type || "Dossier technique";
  roomGet("room-dossier-summary").textContent =
    dossier.summary || "Résumé non disponible.";
  roomGet("room-count-value").textContent =
    String(readiness.room_count ?? rooms.length);
  roomGet("room-equipment-count-value").textContent =
    String(readiness.equipment_group_count ?? 0);
  roomGet("room-question-count-value").textContent =
    String(allQuestions.filter(question =>
      !["answered", "accepted", "resolved"].includes(question?.status)
    ).length);

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
      : `${readiness.blocking_question_count || 0} bloquant(s) · ${readiness.questions_remaining ?? questions.length} point(s) restant(s)`;
}

function renderRoomList(rooms) {
  const container = roomGet("room-list");
  container.replaceChildren();

  for (const room of rooms) {
    const article = document.createElement("article");
    article.className = "room-card";

    const influences = Array.isArray(room.influences) ? room.influences : [];
    const equipment = Array.isArray(room.equipment) ? room.equipment : [];
    const officialCode = room.official_local_code || "";
    const displayCode = officialCode || room.temporary_local_code || room.local_id || "Local à confirmer";
    const codeLabel = officialCode ? "Code HELOISE" : "Code temporaire";
    const targetCodes = [room.local_id, room.temporary_local_code, room.official_local_code].filter(Boolean);
    const openRoomQuestions = getRoomQuestionQueue(ariaState.roomAnalysis)
      .filter(question => (question.target_entity_ids || []).some(id => targetCodes.includes(id)));
    const cpvCount = equipment.filter(item => item.cpv_supply_code || item.cpv_work_code).length;
    const occurrenceCount = equipment.reduce(
      (sum, item) => sum + (Array.isArray(item.occurrence_ids) ? item.occurrence_ids.length : 0),
      0
    );

    article.innerHTML = `
      <div class="room-card-heading">
        <div>
          <span>${escapeRoomHtml(codeLabel)}</span>
          <h4>${escapeRoomHtml(displayCode)}</h4>
          <small class="room-group-label">${escapeRoomHtml(room.group_label || room.projected_name || "")}</small>
        </div>
        <strong>${Math.round((Number(room.confidence) || 0) * 100)} %</strong>
      </div>
      <div class="room-code-status ${officialCode ? "official" : "temporary"}">
        ${officialCode ? "✓ code officiel normalisé" : "⚠ numéro officiel à attribuer"}
      </div>
      <p>${escapeRoomHtml(room.summary || "")}</p>
      <dl class="room-card-grid">
        <div><dt>Existant</dt><dd>${escapeRoomHtml(room.existing_name || "—")}</dd></div>
        <div><dt>Projeté</dt><dd>${escapeRoomHtml(room.projected_name || "—")}</dd></div>
        <div><dt>Surface projetée</dt><dd>${Number(room.projected_surface_m2) || 0} m²</dd></div>
        <div><dt>Groupes d’éléments</dt><dd>${equipment.length}</dd></div>
        <div><dt>IDs GMAO générés</dt><dd>${occurrenceCount}</dd></div>
        <div><dt>CPV proposés</dt><dd>${cpvCount}</dd></div>
        <div><dt>Influences</dt><dd>${influences.length}</dd></div>
        <div><dt>Questions ouvertes</dt><dd>${openRoomQuestions.length}</dd></div>
      </dl>
      <details>
        <summary>Voir nomenclature, éléments et CPV</summary>
        <div class="room-equipment-preview">
          ${equipment.slice(0, 14).map((item) => {
            const ids = Array.isArray(item.occurrence_ids) ? item.occurrence_ids : [];
            const idText = ids.length
              ? ids.slice(0, 3).join(" · ") + (ids.length > 3 ? ` · +${ids.length - 3}` : "")
              : item.element_code
                ? `${item.element_code} · quantité à confirmer`
                : "code ATOMBIM/HELORA à confirmer";
            const cpv = [item.cpv_supply_code, item.cpv_work_code].filter(Boolean).join(" / ");
            return `<div class="room-equipment-line">
              <strong>${escapeRoomHtml(item.label || item.canonical_type)} × ${Number(item.quantity) || 0}</strong>
              <span>${escapeRoomHtml(idText)}</span>
              ${cpv ? `<small>CPV proposé : ${escapeRoomHtml(cpv)}</small>` : ""}
            </div>`;
          }).join("") || '<span class="room-empty-copy">Aucun équipement confirmé</span>'}
        </div>
      </details>
    `;

    container.append(article);
  }

  if (rooms.length === 0) {
    container.innerHTML = '<p class="room-empty-copy">Aucun local n’a pu être reconstruit.</p>';
  }
}

function getRoomQuestionQueue(analysis = ariaState.roomAnalysis) {
  const questions = Array.isArray(analysis?.questions)
    ? analysis.questions
    : Array.isArray(analysis?.global_questions)
      ? analysis.global_questions
      : [];

  const priority = { high: 0, medium: 1, low: 2 };
  const scope = { project: 0, document: 0, bureau: 1, equipment_type: 2, local: 3, equipment: 4 };

  return questions
    .filter(question => !["answered", "accepted", "resolved", "deferred"].includes(question?.status))
    .sort((a, b) =>
      Number(Boolean(b?.blocking)) - Number(Boolean(a?.blocking)) ||
      (priority[a?.priority] ?? 9) - (priority[b?.priority] ?? 9) ||
      (scope[a?.scope] ?? 9) - (scope[b?.scope] ?? 9) ||
      String(a?.question || "").localeCompare(String(b?.question || ""), "fr")
    );
}

function getCurrentRoomQuestion() {
  const questions = getRoomQuestionQueue();
  return questions[roomCurrentQuestionIndex] || questions[0] || null;
}

function renderRoomQuestion() {
  const panel = roomGet("room-interview-panel");
  const question = getCurrentRoomQuestion();

  panel.hidden = !question;

  if (!question) return;

  const target = (question.target_entity_ids || []).filter(Boolean).join(" · ");
  roomGet("room-question-scope").textContent =
    `${question.blocking ? "BLOQUANT · " : ""}${question.scope || "document"} · ${question.priority || "priorité normale"}${target ? ` · ${target}` : ""}`;
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
      void saveCurrentRoomAnswer();
    });
    options.append(button);
  }

  roomGet("room-answer-input").value = "";
}

async function saveCurrentRoomAnswer(forcedValue) {
  const question = getCurrentRoomQuestion();
  if (!question) return false;

  const value = String(forcedValue ?? roomGet("room-answer-input").value).trim();
  if (!value) {
    setState("idle", "Réponse requise.", "Réponds, choisis une option ou utilise « Je ne sais pas ».");
    return false;
  }

  const answer = {
    question_id: question.question_id,
    question: question.question,
    answer: value,
    scope: question.scope,
    status: value === "Je ne sais pas" ? "deferred" : "answered",
    answered_at: new Date().toISOString()
  };

  const existingIndex = roomAnswers.findIndex(item => item.question_id === answer.question_id);
  if (existingIndex >= 0) roomAnswers[existingIndex] = answer;
  else roomAnswers.push(answer);

  const input = roomGet("room-answer-input");
  const saveButton = roomGet("save-room-answer");
  input.disabled = true;
  saveButton.disabled = true;
  saveButton.textContent = "Application…";

  const request = createRoomRequestController(config.roomsRequestTimeoutMs || 210000);
  try {
    const response = await fetch(config.roomsApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ariaState.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "apply_answers",
        analysis: ariaState.roomAnalysis,
        answers: [answer]
      }),
      signal: request.controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !data?.analysis) {
      throw new Error(data?.error || "La réponse n’a pas pu être appliquée aux fiches.");
    }

    ariaState.roomAnalysis = data.analysis;
    roomCurrentQuestionIndex = 0;
    updateRoomIntelligenceInterface();
    const remaining = getRoomQuestionQueue().length;
    setState(
      "idle",
      value === "Je ne sais pas" ? "Question reportée." : "Réponse appliquée.",
      remaining ? `${remaining} question(s) restent à traiter.` : "Toutes les questions actuellement détectées ont été traitées."
    );
    return true;
  } catch (error) {
    setState("error", "La réponse n’a pas été appliquée.", getReadableError(error));
    return false;
  } finally {
    request.clear();
    input.disabled = false;
    saveButton.disabled = false;
    saveButton.textContent = "Enregistrer et appliquer";
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
    async (transcript) => {
      roomGet("room-answer-input").value = transcript;
      const applied = await saveCurrentRoomAnswer();
      const nextQuestion = getCurrentRoomQuestion();
      if (applied && nextQuestion) {
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

async function downloadRoomExcel() {
  if (!ariaState.roomAnalysis) {
    setState(
      "error",
      "Aucune fiche à exporter.",
      "Lance d’abord l’analyse des locaux."
    );
    return;
  }

  if (!ariaState.accessToken) {
    openAccessDialog();
    return;
  }

  const button = roomGet("download-room-excel");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Génération du classeur…";

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
          action: "export_xlsx",
          analysis: ariaState.roomAnalysis,
          answers: roomAnswers,
          sourceName:
            ariaState.pendingPdf?.name ||
            ariaState.roomAnalysis?.meta?.source_name ||
            "Dossier_source.pdf"
        }),
        signal: request.controller.signal
      }
    );

    if (!response.ok) {
      const contentType =
        response.headers.get("content-type") || "";
      const errorPayload = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : {};
      throw new Error(
        errorPayload?.error ||
        "Le classeur Excel n’a pas pu être généré."
      );
    }

    const blob = await response.blob();
    const disposition =
      response.headers.get("content-disposition") || "";
    const utf8Match = disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );
    const plainMatch = disposition.match(
      /filename="?([^";]+)"?/i
    );
    const filename = utf8Match
      ? decodeURIComponent(utf8Match[1])
      : plainMatch?.[1] ||
        "ARIA_Fiches_Locales.xlsx";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      1500
    );

    const exportStatus =
      response.headers.get("x-aria-export-status") ||
      "PROVISOIRE";

    setState(
      "idle",
      "Classeur Excel généré.",
      exportStatus === "PROVISOIRE"
        ? "Le fichier est marqué PROVISOIRE tant que des points restent à valider."
        : "Le fichier contient les fiches, le sommaire et les tables DATA."
    );
  } catch (error) {
    setState(
      "error",
      "L’export Excel a échoué.",
      getReadableError(error)
    );
  } finally {
    request.clear();
    button.disabled = false;
    button.textContent = originalText;
  }
}

function escapeRoomHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

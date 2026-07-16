"use strict";

let roomUiBound = false;
let roomCurrentQuestionIndex = 0;
let roomAnswers = [];
let roomDetailCurrentId = "";

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
    () => {
      void saveCurrentRoomAnswer();
    }
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
  roomGet("close-room-detail").addEventListener(
    "click",
    closeRoomDetail
  );
  roomGet("room-detail-dialog").addEventListener(
    "click",
    (event) => {
      if (event.target === event.currentTarget) {
        closeRoomDetail();
      }
    }
  );
  roomGet("room-detail-dialog").addEventListener(
    "close",
    () => {
      roomDetailCurrentId = "";
    }
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

function clearConversationBeforeRoomAnalysis() {
  if (typeof window.clearConversationForAnalysis === "function") {
    window.clearConversationForAnalysis();
    return;
  }

  if (typeof clearConversationForAnalysis === "function") {
    clearConversationForAnalysis();
  }
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

  clearConversationBeforeRoomAnalysis();
  closeRoomDetail();

  ariaState.roomAnalysisBusy = true;
  ariaState.roomModuleError = "";
  ariaState.roomAnalysis = null;
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
    value = Math.min(
      target,
      value + Math.max(1, (target - value) * 0.2)
    );
    roomGet("room-progress-value").textContent = `${Math.round(value)} %`;
    roomGet("room-progress-bar").style.width = `${Math.round(value)}%`;
    roomGet("room-progress-label").textContent = label;
    updateRoomAnalysisStatus(
      "running",
      "Analyse en cours",
      `${label} · ${Math.round(value)} %`
    );
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
      updateRoomAnalysisStatus(
        "success",
        "Analyse terminée",
        "Les fiches local sont prêtes à être consultées."
      );
    },
    stop() {
      window.clearInterval(timer);
    }
  };
}

function updateRoomAnalysisStatus(state, title, text) {
  const panel = roomGet("room-analysis-status");
  const icon = roomGet("room-analysis-status-icon");
  panel.dataset.state = state;
  roomGet("room-analysis-status-title").textContent = title;
  roomGet("room-analysis-status-text").textContent = text || "";
  icon.textContent =
    state === "error"
      ? "!"
      : state === "success"
        ? "✓"
        : "◌";
}

function updateRoomIntelligenceInterface() {
  const card = roomGet("room-intelligence-card");
  const empty = roomGet("room-analysis-empty");
  const content = roomGet("room-analysis-content");
  const progress = roomGet("room-analysis-progress");
  const statusPanel = roomGet("room-analysis-status");
  const runButton = roomGet("run-room-analysis-button");

  const available =
    Boolean(ariaState.pendingPdf && ariaState.documentAnalysis) &&
    config.features?.roomIntelligence !== false;

  card.hidden = !available;
  if (!available) return;

  const hasAnalysis = Boolean(ariaState.roomAnalysis);
  const hasError = Boolean(ariaState.roomModuleError);

  ariaState.roomModuleLoading = false;

  progress.hidden = !ariaState.roomAnalysisBusy;
  statusPanel.hidden = !ariaState.roomAnalysisBusy && !hasError;

  if (ariaState.roomAnalysisBusy) {
    updateRoomAnalysisStatus(
      "running",
      "Analyse en cours",
      roomGet("room-progress-label").textContent ||
        "ARIA prépare les fiches local."
    );
  } else if (hasError) {
    updateRoomAnalysisStatus(
      "error",
      "Analyse interrompue",
      ariaState.roomModuleError
    );
  }

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

  roomGet("room-analysis-badge").dataset.state =
    ariaState.roomAnalysisBusy
      ? "running"
      : ariaState.roomModuleError
        ? "error"
        : hasAnalysis
          ? "success"
          : "idle";

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
      !["answered", "accepted", "resolved", "deferred"].includes(
        question?.status
      )
    ).length);
  roomGet("room-brain-code-count-value").textContent =
    String(
      Number(
        analysis?.reference_status?.learned_element_record_count
      ) || 0
    );

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
    article.tabIndex = 0;

    const influences = Array.isArray(room.influences) ? room.influences : [];
    const equipment = Array.isArray(room.equipment) ? room.equipment : [];
    const risks = Array.isArray(room.risks) ? room.risks : [];
    const officialCode = room.official_local_code || "";
    const displayCode =
      officialCode ||
      room.temporary_local_code ||
      room.local_id ||
      "Local à confirmer";
    const codeLabel = officialCode ? "Code HELOISE" : "Code temporaire";
    const targetCodes = [
      room.local_id,
      room.temporary_local_code,
      room.official_local_code
    ].filter(Boolean);
    const openRoomQuestions = getRoomQuestionQueue(ariaState.roomAnalysis)
      .filter(question =>
        (question.target_entity_ids || [])
          .some(id => targetCodes.includes(id)) ||
        (question.target_entity_ids || [])
          .some(id => equipment.some(item => item.equipment_group_id === id))
      );
    const cpvCount = equipment.filter(
      item => item.cpv_supply_code || item.cpv_work_code
    ).length;
    const occurrenceCount = equipment.reduce(
      (sum, item) =>
        sum +
        (Array.isArray(item.occurrence_ids)
          ? item.occurrence_ids.length
          : 0),
      0
    );
    const pendingCodes = equipment.filter(
      item => item.gmao_eligible && !item.element_code
    ).length;
    const confidence = Math.round((Number(room.confidence) || 0) * 100);

    article.dataset.roomId = room.local_id || displayCode;
    article.innerHTML = `
      <div class="room-card-accent" aria-hidden="true"></div>
      <div class="room-card-heading">
        <div>
          <span>${escapeRoomHtml(codeLabel)}</span>
          <h4>${escapeRoomHtml(displayCode)}</h4>
          <small class="room-group-label">${escapeRoomHtml(room.group_label || room.projected_name || "")}</small>
        </div>
        <div class="room-confidence-ring" style="--room-confidence:${confidence}%">
          <strong>${confidence}%</strong>
          <small>confiance</small>
        </div>
      </div>
      <div class="room-card-status-row">
        <span class="room-code-status ${officialCode ? "official" : "temporary"}">
          ${officialCode ? "✓ Code officiel" : "⚠ Code à attribuer"}
        </span>
        ${openRoomQuestions.length
          ? `<span class="room-card-alert">${openRoomQuestions.length} attente(s)</span>`
          : '<span class="room-card-ready">✓ Contrôlé</span>'}
      </div>
      <p class="room-card-summary">${escapeRoomHtml(room.summary || "Aucun résumé disponible.")}</p>
      <div class="room-card-metrics">
        <div><strong>${equipment.length}</strong><span>groupes</span></div>
        <div><strong>${occurrenceCount}</strong><span>IDs GMAO</span></div>
        <div><strong>${influences.length}</strong><span>influences</span></div>
        <div><strong>${cpvCount}</strong><span>CPV</span></div>
      </div>
      <div class="room-card-facts">
        <span><b>Projeté</b>${escapeRoomHtml(room.projected_name || "—")}</span>
        <span><b>Surface</b>${formatRoomNumber(room.projected_surface_m2)} m²</span>
        <span><b>Risques</b>${risks.length}</span>
        <span><b>Codes en attente</b>${pendingCodes}</span>
      </div>
      <div class="room-card-preview">
        ${equipment.slice(0, 3).map((item) => `
          <span>
            <b>${escapeRoomHtml(item.label || item.canonical_type || "Élément")}</b>
            <small>${Number(item.quantity) || 0} × ${escapeRoomHtml(item.element_code || "code à confirmer")}</small>
          </span>
        `).join("") || '<em>Aucun équipement confirmé</em>'}
      </div>
      <button class="room-expand-button" type="button">
        <span>Voir toutes les informations</span>
        <span aria-hidden="true">↗</span>
      </button>
    `;

    const open = () => openRoomDetail(room.local_id || displayCode);
    article.querySelector(".room-expand-button")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        open();
      });
    article.addEventListener("click", open);
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    container.append(article);
  }

  if (rooms.length === 0) {
    container.innerHTML =
      '<p class="room-empty-copy">Aucun local n’a pu être reconstruit.</p>';
  }
}

function findRoomForDetail(roomId) {
  return (ariaState.roomAnalysis?.rooms || []).find((room) =>
    [
      room.local_id,
      room.official_local_code,
      room.temporary_local_code
    ].filter(Boolean).includes(roomId)
  ) || null;
}

function openRoomDetail(roomId) {
  const room = findRoomForDetail(roomId);
  if (!room) return;

  roomDetailCurrentId = roomId;
  const displayCode =
    room.official_local_code ||
    room.temporary_local_code ||
    room.local_id ||
    "Local";

  roomGet("room-detail-kicker").textContent =
    room.official_local_code
      ? "Fiche locale HELOISE"
      : "Fiche locale provisoire";
  roomGet("room-detail-title").textContent = displayCode;
  roomGet("room-detail-subtitle").textContent =
    room.group_label || room.projected_name || room.existing_name || "";
  roomGet("room-detail-content").innerHTML = buildRoomDetailHtml(room);

  const dialog = roomGet("room-detail-dialog");
  if (!dialog.open) dialog.showModal();
}

function closeRoomDetail() {
  const dialog = document.getElementById("room-detail-dialog");
  if (dialog?.open) dialog.close();
}

function buildRoomDetailHtml(room) {
  const equipment = Array.isArray(room.equipment) ? room.equipment : [];
  const influences = Array.isArray(room.influences) ? room.influences : [];
  const risks = Array.isArray(room.risks) ? room.risks : [];
  const networks = Array.isArray(room.networks) ? room.networks : [];
  const zones = Array.isArray(room.zones) ? room.zones : [];
  const sources = Array.isArray(room.sources) ? room.sources : [];
  const contradictions = Array.isArray(room.contradictions)
    ? room.contradictions
    : [];
  const rawQuestions = Array.isArray(room.questions) ? room.questions : [];
  const equipmentQuestions = getRoomQuestionQueue(ariaState.roomAnalysis)
    .filter((question) =>
      (question.target_entity_ids || []).some((id) =>
        equipment.some((item) => item.equipment_group_id === id)
      )
    );
  const roomQuestions = getRoomQuestionQueue(ariaState.roomAnalysis)
    .filter((question) =>
      (question.target_entity_ids || []).includes(room.local_id) ||
      (question.target_entity_ids || []).includes(room.official_local_code) ||
      (question.target_entity_ids || []).includes(room.temporary_local_code)
    );
  const questions = [
    ...roomQuestions.map((question) => question.question),
    ...equipmentQuestions.map((question) => question.question),
    ...rawQuestions
  ].filter(Boolean);
  const occurrenceCount = equipment.reduce(
    (sum, item) =>
      sum +
      (Array.isArray(item.occurrence_ids)
        ? item.occurrence_ids.length
        : 0),
    0
  );

  return `
    <section class="room-detail-hero">
      <div>
        <span class="room-detail-state ${room.official_local_code ? "official" : "temporary"}">
          ${room.official_local_code ? "Code officiel normalisé" : "Numéro officiel en attente"}
        </span>
        <p>${escapeRoomHtml(room.summary || "Aucun résumé disponible.")}</p>
      </div>
      <div class="room-detail-kpis">
        <div><strong>${equipment.length}</strong><span>groupes d’éléments</span></div>
        <div><strong>${occurrenceCount}</strong><span>identifiants GMAO</span></div>
        <div><strong>${questions.length}</strong><span>informations en attente</span></div>
        <div><strong>${Math.round((Number(room.confidence) || 0) * 100)}%</strong><span>confiance globale</span></div>
      </div>
    </section>

    ${buildDetailSection(
      "Identité et usage",
      "Toutes les informations calculées pour le local.",
      `<dl class="room-detail-fact-grid">
        ${buildFact("Code officiel", room.official_local_code || "À attribuer")}
        ${buildFact("Code temporaire", room.temporary_local_code || "—")}
        ${buildFact("Site", room.site || "—")}
        ${buildFact("Bloc", room.bloc || "—")}
        ${buildFact("Étage", room.level || "—")}
        ${buildFact("Numéro", room.number || "—")}
        ${buildFact("Nom existant", room.existing_name || "—")}
        ${buildFact("Nom projeté", room.projected_name || "—")}
        ${buildFact("Type de local", room.room_type || "—")}
        ${buildFact("Service", room.service || "À confirmer")}
        ${buildFact("Surface existante", `${formatRoomNumber(room.existing_surface_m2)} m²`)}
        ${buildFact("Surface projetée", `${formatRoomNumber(room.projected_surface_m2)} m²`)}
        ${buildFact("Modification", room.change_type || "—")}
        ${buildFact("Accessibilité", room.accessibility || "À confirmer")}
        ${buildFact("Criticité opérationnelle", room.operational_criticality || "À confirmer")}
        ${buildFact("Relation", room.relation_type || "—")}
      </dl>`
    )}

    ${buildDetailSection(
      "Équipements, trigrammes et GMAO",
      "Les groupes identiques sont consolidés. Les identifiants sont recalculés après chaque validation.",
      equipment.length
        ? `<div class="room-detail-equipment-list">${equipment.map(buildEquipmentDetail).join("")}</div>`
        : '<p class="room-detail-empty">Aucun équipement confirmé.</p>'
    )}

    ${buildDetailSection(
      "Influences externes RGIE",
      "Propositions par local ou par zone, à valider avant usage officiel.",
      buildStructuredCards(influences, (item) => ({
        title: `${item.code || "—"} · ${item.label || "Influence"}`,
        badge: item.class_proposal || "À déterminer",
        body: [
          ["Zone", item.zone],
          ["Statut", item.status],
          ["Raison", item.reason],
          ["Confiance", `${Math.round((Number(item.confidence) || 0) * 100)} %`]
        ]
      }))
    )}

    ${buildDetailSection(
      "Risques complémentaires",
      "Amiante, incendie, biologie, rayonnements, produits dangereux et continuité de service.",
      buildStructuredCards(risks, (item) => ({
        title: item.label || item.risk_type || "Risque",
        badge: item.level || item.status || "À déterminer",
        body: [
          ["Type", item.risk_type],
          ["Statut", item.status],
          ["Raison", item.reason],
          ["Validation", item.validation_required ? "Requise" : "Non requise"]
        ]
      }))
    )}

    ${buildDetailSection(
      "Réseaux et liaisons",
      "Origines, destinations, diamètres, débits et statuts détectés.",
      buildStructuredCards(networks, (item) => ({
        title: item.network_type || "Réseau",
        badge: item.status || "À déterminer",
        body: [
          ["Origine", item.source],
          ["Destination", item.destination],
          ["Diamètre", item.diameter],
          ["Débit", item.flow]
        ]
      }))
    )}

    ${buildDetailSection(
      "Sous-zones",
      "Découpage fonctionnel sans créer automatiquement de nouveaux locaux GMAO.",
      buildStructuredCards(zones, (item) => ({
        title: item.name || item.zone_id || "Zone",
        badge: item.zone_type || "Sous-zone",
        body: [
          ["Identifiant", item.zone_id],
          ["Surface", `${formatRoomNumber(item.surface_m2)} m²`],
          ["Description", item.description]
        ]
      }))
    )}

    ${buildDetailSection(
      "Informations en attente",
      "Questions, contradictions et points qui empêchent encore une validation complète.",
      buildPendingList(questions, contradictions)
    )}

    ${buildDetailSection(
      "Preuves et folios sources",
      "Traçabilité courte des informations utilisées par ARIA.",
      sources.length
        ? `<div class="room-source-list">${sources.map(buildSourceDetail).join("")}</div>`
        : '<p class="room-detail-empty">Aucune preuve locale détaillée.</p>'
    )}
  `;
}

function buildDetailSection(title, subtitle, content) {
  return `
    <section class="room-detail-section">
      <header>
        <div>
          <h3>${escapeRoomHtml(title)}</h3>
          <p>${escapeRoomHtml(subtitle)}</p>
        </div>
      </header>
      ${content}
    </section>
  `;
}

function buildFact(label, value) {
  return `
    <div>
      <dt>${escapeRoomHtml(label)}</dt>
      <dd>${escapeRoomHtml(value)}</dd>
    </div>
  `;
}

function buildEquipmentDetail(item) {
  const ids = Array.isArray(item.occurrence_ids)
    ? item.occurrence_ids
    : [];
  const sources = Array.isArray(item.sources) ? item.sources : [];
  const cpvSupply = [item.cpv_supply_code, item.cpv_supply_label]
    .filter(Boolean)
    .join(" · ");
  const cpvWork = [item.cpv_work_code, item.cpv_work_label]
    .filter(Boolean)
    .join(" · ");

  return `
    <article class="room-detail-equipment">
      <div class="room-detail-equipment-heading">
        <div>
          <span>${escapeRoomHtml(item.discipline || "Discipline non déterminée")}</span>
          <h4>${escapeRoomHtml(item.label || item.canonical_type || "Équipement")}</h4>
          <small>${escapeRoomHtml(item.subtype || item.network || "Type général")}</small>
        </div>
        <strong>${Number(item.quantity) || 0} ${escapeRoomHtml(item.unit || "u")}</strong>
      </div>
      <div class="room-detail-equipment-badges">
        <span class="${item.element_code ? "validated" : "pending"}">
          ${escapeRoomHtml(item.element_code || "Trigramme en attente")}
        </span>
        <span>${escapeRoomHtml(item.status || "Statut à confirmer")}</span>
        <span>${Math.round((Number(item.confidence) || 0) * 100)} %</span>
      </div>
      <dl class="room-detail-mini-grid">
        ${buildFact("Réseau", item.network || "—")}
        ${buildFact("Hauteur", item.height || "—")}
        ${buildFact("Débit", item.flow || "—")}
        ${buildFact("Puissance", item.power || "—")}
        ${buildFact("Catégorie GMAO", item.gmao_category_proposal || "—")}
        ${buildFact("Statut du code", item.element_code_status || "À confirmer")}
      </dl>
      <div class="room-detail-id-block">
        <span>Identifiants calculés</span>
        ${ids.length
          ? `<code>${ids.map(escapeRoomHtml).join(" · ")}</code>`
          : '<em>En attente du code local, du trigramme ou de la quantité.</em>'}
      </div>
      <div class="room-detail-cpv-grid">
        <div><span>CPV fourniture</span><strong>${escapeRoomHtml(cpvSupply || "Non déterminé")}</strong></div>
        <div><span>CPV travaux</span><strong>${escapeRoomHtml(cpvWork || "Non déterminé")}</strong></div>
        <div><span>Lot proposé</span><strong>${escapeRoomHtml(item.cpv_lot_proposal || "Non déterminé")}</strong></div>
      </div>
      ${sources.length
        ? `<details><summary>Voir les preuves de cet élément</summary>${sources.map(buildSourceDetail).join("")}</details>`
        : ""}
    </article>
  `;
}

function buildStructuredCards(items, mapper) {
  if (!items.length) {
    return '<p class="room-detail-empty">Aucune information détectée.</p>';
  }

  return `<div class="room-structured-grid">${items.map((item) => {
    const mapped = mapper(item);
    return `
      <article class="room-structured-card">
        <div><h4>${escapeRoomHtml(mapped.title)}</h4><span>${escapeRoomHtml(mapped.badge || "—")}</span></div>
        <dl>${mapped.body.map(([label, value]) =>
          value
            ? `<div><dt>${escapeRoomHtml(label)}</dt><dd>${escapeRoomHtml(value)}</dd></div>`
            : ""
        ).join("")}</dl>
      </article>
    `;
  }).join("")}</div>`;
}

function buildPendingList(questions, contradictions) {
  const uniqueQuestions = [...new Set(questions.map(String).filter(Boolean))];
  const uniqueContradictions = [...new Set(
    contradictions.map(String).filter(Boolean)
  )];

  if (!uniqueQuestions.length && !uniqueContradictions.length) {
    return '<div class="room-detail-ready-block">✓ Aucun point ouvert pour ce local.</div>';
  }

  return `
    <div class="room-pending-columns">
      <div>
        <h4>Questions</h4>
        ${uniqueQuestions.length
          ? `<ul>${uniqueQuestions.map(item => `<li>${escapeRoomHtml(item)}</li>`).join("")}</ul>`
          : '<p class="room-detail-empty">Aucune question.</p>'}
      </div>
      <div>
        <h4>Contradictions</h4>
        ${uniqueContradictions.length
          ? `<ul>${uniqueContradictions.map(item => `<li>${escapeRoomHtml(item)}</li>`).join("")}</ul>`
          : '<p class="room-detail-empty">Aucune contradiction.</p>'}
      </div>
    </div>
  `;
}

function buildSourceDetail(source) {
  const label = [
    source?.folio,
    source?.discipline,
    Number(source?.page) > 0 ? `page ${source.page}` : ""
  ].filter(Boolean).join(" · ");

  return `
    <div class="room-source-item">
      <strong>${escapeRoomHtml(label || "Source")}</strong>
      <span>${escapeRoomHtml(source?.evidence || "Preuve non renseignée")}</span>
    </div>
  `;
}

function formatRoomNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("fr-BE", {
    maximumFractionDigits: 2
  }).format(number);
}

function getRoomQuestionQueue(analysis = ariaState.roomAnalysis) {
  const questions = Array.isArray(analysis?.questions)
    ? analysis.questions
    : Array.isArray(analysis?.global_questions)
      ? analysis.global_questions
      : [];

  const priority = { high: 0, medium: 1, low: 2 };
  const scope = {
    project: 0,
    document: 0,
    bureau: 1,
    equipment_type: 2,
    local: 3,
    equipment: 4
  };

  return questions
    .filter(question =>
      !["answered", "accepted", "resolved", "deferred"].includes(
        question?.status
      )
    )
    .sort((a, b) =>
      Number(Boolean(b?.blocking)) - Number(Boolean(a?.blocking)) ||
      (priority[a?.priority] ?? 9) - (priority[b?.priority] ?? 9) ||
      (scope[a?.scope] ?? 9) - (scope[b?.scope] ?? 9) ||
      String(a?.question || "").localeCompare(
        String(b?.question || ""),
        "fr"
      )
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

  const targetCount = Array.isArray(question.target_entity_ids)
    ? question.target_entity_ids.filter(Boolean).length
    : 0;
  const target = (question.target_entity_ids || [])
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
  const extraTargetCount = Math.max(0, targetCount - 3);
  roomGet("room-question-scope").textContent =
    `${question.blocking ? "BLOQUANT · " : ""}${question.scope || "document"} · ${question.priority || "priorité normale"}${target ? ` · ${target}` : ""}${extraTargetCount ? ` · +${extraTargetCount}` : ""}`;
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

  const isElementCode =
    question.target_field === "element_code" &&
    question.target_entity_type === "equipment";
  const learningOptions = roomGet("room-question-learning-options");
  learningOptions.hidden = !isElementCode;

  if (isElementCode) {
    const similarCount =
      Number(question.similar_target_count) ||
      targetCount ||
      1;
    roomGet("room-question-apply-similar").checked = true;
    roomGet("room-question-remember-brain").checked = true;
    roomGet("room-question-learning-summary").textContent =
      similarCount > 1
        ? `Cette réponse peut mettre à jour ${similarCount} groupes identiques et éviter que la question soit reposée lors des prochaines analyses.`
        : "Cette réponse peut être enregistrée dans BRAIN pour les prochaines analyses.";
  }

  roomGet("room-answer-input").value = "";
}

function getRoomAnswerValue(forcedValue, question) {
  const isEvent =
    typeof Event !== "undefined" &&
    forcedValue instanceof Event;
  const isObject =
    forcedValue !== null &&
    typeof forcedValue === "object";
  let value = String(
    isEvent || isObject
      ? roomGet("room-answer-input").value
      : forcedValue ?? roomGet("room-answer-input").value
  ).trim();

  if (/^\[object\s+[a-z]*event\]$/i.test(value)) {
    value = "";
  }

  if (
    question?.target_field === "element_code" &&
    value !== "Je ne sais pas"
  ) {
    value = value.toUpperCase().replace(/\s+/g, "");
  }

  return value;
}

async function saveCurrentRoomAnswer(forcedValue) {
  const question = getCurrentRoomQuestion();
  if (!question) return false;

  const value = getRoomAnswerValue(forcedValue, question);
  if (!value) {
    setState(
      "idle",
      "Réponse requise.",
      "Réponds, choisis une option ou utilise « Je ne sais pas »."
    );
    return false;
  }

  const isElementCode =
    question.target_field === "element_code" &&
    question.target_entity_type === "equipment";
  if (
    isElementCode &&
    value !== "Je ne sais pas" &&
    (
      !/^(?=.{2,10}$)(?=.*[A-Z0-9])[A-Z0-9-]+$/.test(value) ||
      ["OBJECTPOIN", "POINTEREVE", "POINTEREVENT", "OBJECTEVENT"].includes(value)
    )
  ) {
    setState(
      "idle",
      "Trigramme invalide.",
      "Utilise 2 à 10 caractères A-Z, 0-9 ou tiret, par exemple PR, PRIRJ ou CTA--."
    );
    return false;
  }

  const answer = {
    question_id: question.question_id,
    question: question.question,
    answer: value,
    scope: question.scope,
    apply_to_similar: isElementCode
      ? roomGet("room-question-apply-similar").checked
      : true,
    remember_in_brain: isElementCode
      ? roomGet("room-question-remember-brain").checked
      : false,
    status: value === "Je ne sais pas" ? "deferred" : "answered",
    answered_at: new Date().toISOString()
  };

  const existingIndex = roomAnswers.findIndex(
    item => item.question_id === answer.question_id
  );
  const previousAnswer = existingIndex >= 0
    ? roomAnswers[existingIndex]
    : null;
  if (existingIndex >= 0) roomAnswers[existingIndex] = answer;
  else roomAnswers.push(answer);

  const input = roomGet("room-answer-input");
  const saveButton = roomGet("save-room-answer");
  input.disabled = true;
  saveButton.disabled = true;
  saveButton.textContent = "Application…";

  const request = createRoomRequestController(
    config.roomsRequestTimeoutMs || 210000
  );
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
      throw new Error(
        data?.error ||
        "La réponse n’a pas pu être appliquée aux fiches."
      );
    }

    ariaState.roomAnalysis = data.analysis;
    roomCurrentQuestionIndex = 0;
    updateRoomIntelligenceInterface();
    const remaining = getRoomQuestionQueue().length;
    const appliedCount =
      Number(data?.application?.applied_count) ||
      Number(data?.analysis?.last_application?.applied_count) ||
      0;
    const skippedConflicts =
      Number(data?.application?.skipped_conflicts) || 0;
    const learningResult = Array.isArray(data?.learning)
      ? data.learning.find(item => item?.saved)
      : null;
    const learningFailure = Array.isArray(data?.learning)
      ? data.learning.find(item => item && !item.saved)
      : null;

    const details = [];
    if (appliedCount > 1) {
      details.push(`${appliedCount} groupes identiques mis à jour.`);
    } else if (appliedCount === 1) {
      details.push("1 groupe mis à jour.");
    }
    if (skippedConflicts) {
      details.push(`${skippedConflicts} conflit(s) validé(s) ont été conservés.`);
    }
    if (learningResult) {
      details.push("Codification enregistrée dans BRAIN.");
    } else if (answer.remember_in_brain && learningFailure) {
      details.push(
        learningFailure.message ||
        "La codification a été appliquée, mais BRAIN n’a pas pu l’enregistrer."
      );
    }
    details.push(
      remaining
        ? `${remaining} question(s) restent à traiter.`
        : "Toutes les questions actuellement détectées ont été traitées."
    );

    setState(
      "idle",
      value === "Je ne sais pas"
        ? "Question reportée."
        : "Réponse appliquée.",
      details.join(" ")
    );
    return true;
  } catch (error) {
    if (existingIndex >= 0 && previousAnswer) {
      roomAnswers[existingIndex] = previousAnswer;
    } else {
      roomAnswers = roomAnswers.filter(
        item => item.question_id !== answer.question_id
      );
    }
    setState(
      "error",
      "La réponse n’a pas été appliquée.",
      getReadableError(error)
    );
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

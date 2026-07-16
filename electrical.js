"use strict";

const ELECTRICAL_METADATA_LABELS = Object.freeze({
  pole: "Pôle",
  phase: "Phase",
  site: "Site",
  bloc: "Bloc",
  etage: "Étage",
  numero: "Numéro",
  type_document: "Type de document",
  discipline: "Discipline",
  technique: "Technique",
  indice: "Indice",
  date: "Date",
  description: "Description"
});

const ELECTRICAL_FIELD_LABELS = Object.freeze({
  designation: "Désignation du tableau",
  functional_name: "Nom fonctionnel",
  table_type: "Type de tableau",
  location: "Localisation",
  service_voltage: "Tension de service",
  frequency: "Fréquence",
  phase_system: "Système de phases",
  neutral_presence: "Présence du neutre",
  rated_current: "Courant nominal",
  earthing_system: "Régime de neutre",
  breaking_capacity: "Pouvoir de coupure",
  main_protection: "Protection générale",
  supply_configuration: "Type d’alimentation",
  upstream_source: "Source amont",
  normal_source: "Source normale",
  emergency_source: "Source secours",
  ups_source: "Source UPS / ASI"
});

const ELECTRICAL_COUNT_LABELS = Object.freeze({
  positions: "Positions",
  protective_devices: "Protections",
  circuit_breakers: "Disjoncteurs",
  differential_devices: "Différentiels",
  reserves: "Réserves",
  unidentified_circuits: "Circuits non identifiés",
  outgoing_circuits: "Départs",
  downstream_panels: "Tableaux aval"
});

const ELECTRICAL_ORIGIN_LABELS = Object.freeze({
  pdf_text: "Texte du PDF",
  filename: "Nom du fichier",
  visual_structure: "Structure visuelle",
  official_reference: "Référentiel officiel",
  learned_rule: "Règle apprise",
  combined: "Indices combinés",
  not_determined: "Non déterminé"
});

const ELECTRICAL_STATUS_LABELS = Object.freeze({
  detected: "Détectée",
  official_reference: "Référentiel",
  proposed: "Proposée",
  validated: "Validée",
  automatic: "Automatique",
  not_determined: "Non déterminée"
});

const ELECTRICAL_SUPPLY_OPTIONS = Object.freeze([
  ["", "Non déterminé"],
  ["normal", "Normal"],
  ["normal_secours", "Normal secours"],
  ["ups", "UPS / ASI"],
  ["normal_plus_normal_secours", "Normal + Normal secours"],
  ["normal_plus_ups", "Normal + UPS"],
  ["normal_secours_plus_ups", "Normal secours + UPS"],
  ["normal_plus_normal_secours_plus_ups", "Normal + Normal secours + UPS"]
]);

const ELECTRICAL_KEY_FIELDS = Object.freeze([
  "designation",
  "functional_name",
  "table_type",
  "service_voltage",
  "frequency",
  "phase_system",
  "neutral_presence",
  "rated_current",
  "supply_configuration",
  "upstream_source",
  "main_protection",
  "earthing_system",
  "breaking_capacity"
]);

const ELECTRICAL_TECHNICAL_CONTROLS = Object.freeze([
  { path: "technical.designation", group: "technical_fields", key: "designation", type: "text" },
  { path: "technical.table_type", group: "technical_fields", key: "table_type", type: "text" },
  { path: "technical.service_voltage", group: "technical_fields", key: "service_voltage", type: "text" },
  { path: "technical.rated_current", group: "technical_fields", key: "rated_current", type: "text" },
  { path: "technical.supply_configuration", group: "technical_fields", key: "supply_configuration", type: "select" },
  { path: "technical.upstream_source", group: "technical_fields", key: "upstream_source", type: "text" },
  { path: "counts.circuit_breakers", group: "counts", key: "circuit_breakers", type: "number" },
  { path: "counts.outgoing_circuits", group: "counts", key: "outgoing_circuits", type: "number" },
  { path: "counts.reserves", group: "counts", key: "reserves", type: "number" },
  { path: "counts.differential_devices", group: "counts", key: "differential_devices", type: "number" }
]);

function ensureElectricalState() {
  const defaults = {
    electricalAnalysis: null,
    electricalDocumentId: "",
    electricalAnalysisBusy: false,
    electricalAnalysisProgress: 0,
    electricalAnalysisStage: "",
    electricalAnalysisProgressTimer: null,
    electricalAnalysisError: null,
    electricalAnalysisDiagnostics: null,
    electricalPersistence: null,
    electricalLearning: null,
    electricalDecisionMap: {},
    electricalMetadataEdits: {},
    electricalTechnicalEdits: {},
    electricalTechnicalDecisions: {},
    electricalValidationBusy: false,
    electricalClassificationSignature: "",
    electricalSourcePathname: "",
    electricalAnalysisStale: false,
    electricalLastSavedAt: "",
    electricalModuleUiBound: false
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (typeof ariaState[key] === "undefined") {
      ariaState[key] = value;
    }
  }
}

function initializeElectricalAnalyst() {
  ensureElectricalState();

  if (
    ariaState.electricalModuleUiBound
  ) {
    updateElectricalAnalystInterface();
    return;
  }

  ariaState.electricalModuleUiBound =
    true;

  getElement("run-electrical-analysis-button").addEventListener(
    "click",
    (event) => {
      if (
        ariaState.electricalBootstrapBusy
      ) {
        return;
      }

      runElectricalAnalysis(event);
    }
  );
  getElement("rerun-electrical-analysis-button").addEventListener(
    "click",
    runElectricalAnalysis
  );
  getElement("accept-reliable-electrical-proposals").addEventListener(
    "click",
    acceptReliableElectricalProposals
  );
  getElement("accept-reliable-technical-values").addEventListener(
    "click",
    acceptReliableTechnicalValues
  );
  getElement("save-electrical-decisions-button").addEventListener(
    "click",
    saveElectricalDecisions
  );
  getElement("copy-electrical-analysis-button").addEventListener(
    "click",
    copyElectricalAnalysis
  );
  getElement("clear-electrical-analysis-button").addEventListener(
    "click",
    clearElectricalAnalysisWithConfirmation
  );
  getElement("electrical-proposals-list").addEventListener(
    "click",
    handleElectricalProposalClick
  );
  getElement("electrical-proposals-list").addEventListener(
    "input",
    handleElectricalProposalInput
  );
  getElement("electrical-technical-validation-form").addEventListener(
    "input",
    handleElectricalTechnicalInput
  );
  getElement("electrical-technical-validation-form").addEventListener(
    "change",
    handleElectricalTechnicalInput
  );

  loadElectricalAnalysisSession();
  reconcileElectricalDocumentState();
  updateElectricalAnalystInterface();
}

function getElectricalStoragePayload() {
  if (!ariaState.electricalAnalysis || !ariaState.pendingPdf) {
    return null;
  }

  return {
    sourcePathname: ariaState.pendingPdf.pathname,
    documentId: ariaState.electricalDocumentId,
    analysis: ariaState.electricalAnalysis,
    diagnostics: ariaState.electricalAnalysisDiagnostics,
    persistence: ariaState.electricalPersistence,
    learning: ariaState.electricalLearning,
    decisionMap: ariaState.electricalDecisionMap,
    metadataEdits: ariaState.electricalMetadataEdits,
    technicalEdits: ariaState.electricalTechnicalEdits,
    technicalDecisions: ariaState.electricalTechnicalDecisions,
    classificationSignature: ariaState.electricalClassificationSignature,
    lastSavedAt: ariaState.electricalLastSavedAt,
    savedAt: new Date().toISOString()
  };
}

function saveElectricalAnalysisSession() {
  const payload = getElectricalStoragePayload();

  for (const [storage, key] of [
    [sessionStorage, config.electricalAnalysisSessionKey],
    [localStorage, config.electricalAnalysisPersistentKey]
  ]) {
    try {
      if (payload) {
        storage.setItem(key, JSON.stringify(payload));
      } else {
        storage.removeItem(key);
      }
    } catch (error) {
      console.warn("Impossible de mémoriser la préanalyse électrique.", error);
    }
  }
}

function loadElectricalAnalysisSession() {
  try {
    const raw =
      sessionStorage.getItem(config.electricalAnalysisSessionKey) ||
      localStorage.getItem(config.electricalAnalysisPersistentKey);

    if (!raw || !ariaState.pendingPdf) return;

    const parsed = JSON.parse(raw);

    if (
      parsed?.sourcePathname !== ariaState.pendingPdf.pathname ||
      !parsed?.analysis ||
      typeof parsed.analysis !== "object"
    ) {
      return;
    }

    ariaState.electricalSourcePathname = parsed.sourcePathname;
    ariaState.electricalDocumentId = String(parsed.documentId || "");
    ariaState.electricalAnalysis = parsed.analysis;
    ariaState.electricalAnalysisDiagnostics = parsed.diagnostics || null;
    ariaState.electricalPersistence = parsed.persistence || null;
    ariaState.electricalLearning = parsed.learning || null;
    ariaState.electricalDecisionMap = parsed.decisionMap || {};
    ariaState.electricalMetadataEdits = parsed.metadataEdits || {};
    ariaState.electricalTechnicalEdits = parsed.technicalEdits || {};
    ariaState.electricalTechnicalDecisions = parsed.technicalDecisions || {};
    ariaState.electricalClassificationSignature = String(
      parsed.classificationSignature || ""
    );
    ariaState.electricalLastSavedAt = String(parsed.lastSavedAt || "");
  } catch (error) {
    console.warn("Préanalyse électrique mémorisée invalide.", error);
  }
}

function clearElectricalAnalysis({ persist = true } = {}) {
  stopElectricalProgress(0);
  ariaState.electricalAnalysis = null;
  ariaState.electricalDocumentId = "";
  ariaState.electricalAnalysisError = null;
  ariaState.electricalAnalysisDiagnostics = null;
  ariaState.electricalPersistence = null;
  ariaState.electricalLearning = null;
  ariaState.electricalDecisionMap = {};
  ariaState.electricalMetadataEdits = {};
  ariaState.electricalTechnicalEdits = {};
  ariaState.electricalTechnicalDecisions = {};
  ariaState.electricalClassificationSignature = "";
  ariaState.electricalSourcePathname = ariaState.pendingPdf?.pathname || "";
  ariaState.electricalAnalysisStale = false;
  ariaState.electricalLastSavedAt = "";

  if (persist) saveElectricalAnalysisSession();
  updateElectricalAnalystInterface();
}

function clearElectricalAnalysisWithConfirmation() {
  if (!ariaState.electricalAnalysis) return;

  if (!window.confirm("Retirer uniquement la préanalyse électrique de ce document ?")) {
    return;
  }

  clearElectricalAnalysis();
  setState(
    "idle",
    "Préanalyse électrique retirée.",
    "Le classement documentaire et le PDF restent disponibles."
  );
}

function buildElectricalClassificationSignature(classification = ariaState.documentAnalysis) {
  const metadata = classification?.metadata || {};

  return JSON.stringify({
    source: classification?.source_name || ariaState.pendingPdf?.name || "",
    pole: metadata.pole || "",
    phase: metadata.phase || "",
    site: metadata.site || "",
    bloc: metadata.bloc || "",
    etage: metadata.etage || "",
    numero: metadata.numero || "",
    type_document: metadata.type_document || metadata.effective_type || "",
    discipline: metadata.discipline || "",
    technique: metadata.technique || "",
    indice: metadata.indice || "",
    date: metadata.date || "",
    description: metadata.description || ""
  });
}

function reconcileElectricalDocumentState() {
  ensureElectricalState();
  const pathname = ariaState.pendingPdf?.pathname || "";

  if (!pathname) {
    if (ariaState.electricalAnalysis) {
      clearElectricalAnalysis({ persist: true });
    }
    return;
  }

  if (
    ariaState.electricalSourcePathname &&
    ariaState.electricalSourcePathname !== pathname
  ) {
    clearElectricalAnalysis({ persist: true });
    ariaState.electricalSourcePathname = pathname;
  } else if (!ariaState.electricalSourcePathname) {
    ariaState.electricalSourcePathname = pathname;
  }

  if (ariaState.electricalAnalysis && ariaState.documentAnalysis) {
    const currentSignature = buildElectricalClassificationSignature();
    ariaState.electricalAnalysisStale = Boolean(
      ariaState.electricalClassificationSignature &&
      currentSignature !== ariaState.electricalClassificationSignature
    );
  }
}

async function electricalApiRequest(payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    Number(config.electricalRequestTimeoutMs) || 270000
  );

  try {
    const response = await fetch(config.electricalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ariaState.accessToken}`
      },
      body: JSON.stringify({
        ...payload,
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
          : `ARIA Electrical Analyst a répondu avec le statut ${response.status}.`
      );
      error.status = response.status;
      error.stage = data.stage || null;
      error.requestId = data.requestId || null;
      error.diagnosticCode = data.diagnosticCode || null;
      error.retryable = Boolean(data.retryable);
      throw error;
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getElectricalProgressStage(progress) {
  if (progress < 16) return "Préparation du document";
  if (progress < 32) return "Chargement des référentiels Hélora";
  if (progress < 50) return "Lecture du schéma et des cartouches";
  if (progress < 68) return "Recherche des alimentations et protections";
  if (progress < 84) return "Comptage des départs et réserves";
  return "Construction des propositions argumentées";
}

function startElectricalProgress() {
  stopElectricalProgress(0);
  ariaState.electricalAnalysisProgress = 4;
  ariaState.electricalAnalysisStage = getElectricalProgressStage(4);
  ariaState.electricalAnalysisProgressTimer = window.setInterval(() => {
    const current = ariaState.electricalAnalysisProgress;
    if (current >= 94) return;
    const increment = current < 45 ? 3 : current < 75 ? 2 : 1;
    ariaState.electricalAnalysisProgress = Math.min(94, current + increment);
    ariaState.electricalAnalysisStage = getElectricalProgressStage(
      ariaState.electricalAnalysisProgress
    );
    updateElectricalProgressInterface();
  }, 950);
  updateElectricalProgressInterface();
}

function stopElectricalProgress(finalProgress = null) {
  if (ariaState.electricalAnalysisProgressTimer) {
    window.clearInterval(ariaState.electricalAnalysisProgressTimer);
    ariaState.electricalAnalysisProgressTimer = null;
  }

  if (Number.isFinite(finalProgress)) {
    ariaState.electricalAnalysisProgress = finalProgress;
    ariaState.electricalAnalysisStage = getElectricalProgressStage(finalProgress);
  }

  if (domReady) updateElectricalProgressInterface();
}

function updateElectricalProgressInterface() {
  if (!domReady) return;
  const visible = Boolean(
    ariaState.electricalAnalysisBusy ||
    (ariaState.electricalAnalysisProgress > 0 &&
      ariaState.electricalAnalysisProgress < 100)
  );
  const progress = Math.round(ariaState.electricalAnalysisProgress || 0);

  getElement("electrical-analysis-progress").hidden = !visible;
  getElement("electrical-progress-bar").value = progress;
  getElement("electrical-progress-value").textContent = `${progress} %`;
  getElement("electrical-progress-label").textContent =
    ariaState.electricalAnalysisStage || "Préparation de la préanalyse";
}

async function runElectricalAnalysis() {
  if (ariaState.electricalAnalysisBusy || ariaState.electricalValidationBusy) return;

  const pdf = ariaState.pendingPdf;
  const classification = ariaState.documentAnalysis;

  if (!pdf || !classification) {
    setState(
      "error",
      "Classement initial requis.",
      "Analyse et classe d’abord le PDF avant de lancer la préanalyse électrique."
    );
    return;
  }

  if (!ariaState.accessToken) {
    setState("idle", "Connexion requise.", "Connecte ARIA Core avant la préanalyse.");
    openAccessDialog();
    return;
  }

  ariaState.electricalAnalysisBusy = true;
  ariaState.electricalAnalysisError = null;
  startElectricalProgress();
  updateElectricalAnalystInterface();
  setState(
    "thinking",
    "Préanalyse électrique…",
    "ARIA recherche les tableaux, tensions, alimentations, protections, départs et métadonnées manquantes."
  );

  try {
    const data = await electricalApiRequest({
      action: "analyze",
      pdf: {
        pathname: pdf.pathname,
        name: pdf.name,
        size: pdf.size,
        detail: pdf.detail || "auto"
      },
      classification
    });

    if (!data.analysis || typeof data.analysis !== "object") {
      throw new Error("ARIA Core n’a renvoyé aucune préanalyse électrique exploitable.");
    }

    ariaState.electricalAnalysis = data.analysis;
    ariaState.electricalDocumentId = String(data.documentId || "");
    ariaState.electricalPersistence = data.persistence || null;
    ariaState.electricalLearning = data.learning || null;
    ariaState.electricalAnalysisDiagnostics = data.diagnostics || null;
    ariaState.electricalDecisionMap = {};
    ariaState.electricalMetadataEdits = {};
    ariaState.electricalTechnicalEdits = {};
    ariaState.electricalTechnicalDecisions = {};
    ariaState.electricalSourcePathname = pdf.pathname;
    ariaState.electricalClassificationSignature =
      buildElectricalClassificationSignature(classification);
    ariaState.electricalAnalysisStale = false;
    ariaState.electricalLastSavedAt = "";
    stopElectricalProgress(100);
    saveElectricalAnalysisSession();
    updateElectricalAnalystInterface();

    const proposalCount = Array.isArray(data.analysis.metadata_proposals)
      ? data.analysis.metadata_proposals.length
      : 0;

    setState(
      "idle",
      data.analysis.is_electrical_document
        ? "Préanalyse électrique terminée."
        : "Document peu compatible avec l’analyse électrique.",
      data.analysis.is_electrical_document
        ? `${proposalCount} proposition(s) de métadonnées ont été préparées.`
        : "ARIA conserve ses constats, mais recommande de vérifier la nature du document."
    );

    window.requestAnimationFrame(() => {
      getElement("electrical-analysis-card").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  } catch (error) {
    console.error("Electrical analysis failed:", error);
    stopElectricalProgress(0);
    ariaState.electricalAnalysisError = {
      message: getReadableError(error),
      code:
        error?.diagnosticCode ||
        (error?.stage ? `ARIA-ELEC-${error.stage}-${error.status || "error"}` : "")
    };
    setState(
      "error",
      "Préanalyse électrique impossible.",
      getReadableError(error)
    );
  } finally {
    ariaState.electricalAnalysisBusy = false;
    updateElectricalAnalystInterface();
    if (ariaState.electricalAnalysisProgress >= 100) {
      window.setTimeout(() => {
        ariaState.electricalAnalysisProgress = 0;
        ariaState.electricalAnalysisStage = "";
        updateElectricalProgressInterface();
      }, 650);
    }
  }
}

function formatElectricalConfidence(value) {
  const confidence = Number(value);
  return Number.isFinite(confidence)
    ? `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)} %`
    : "—";
}

function formatElectricalSupply(value) {
  return ELECTRICAL_SUPPLY_OPTIONS.find(([code]) => code === value)?.[1] || value || "Non déterminé";
}

function createElectricalConfidenceBadge(confidence, status = "") {
  const badge = document.createElement("span");
  badge.className = "electrical-field-confidence";
  const percentage = Math.round((Number(confidence) || 0) * 100);
  badge.classList.toggle("high", percentage >= 90);
  badge.classList.toggle("medium", percentage >= 65 && percentage < 90);
  badge.classList.toggle("low", percentage < 65);
  badge.textContent = `${formatElectricalConfidence(confidence)} · ${
    ELECTRICAL_STATUS_LABELS[status] || "Proposée"
  }`;
  return badge;
}

function renderElectricalKeyFields() {
  const container = getElement("electrical-key-fields");
  container.replaceChildren();
  const fields = ariaState.electricalAnalysis?.technical_fields || {};

  for (const key of ELECTRICAL_KEY_FIELDS) {
    const field = fields[key] || {};
    const article = document.createElement("article");
    article.className = "electrical-key-field";
    article.classList.toggle("unknown", !field.value);

    const label = document.createElement("span");
    label.textContent = ELECTRICAL_FIELD_LABELS[key] || key;
    const value = document.createElement("strong");
    value.textContent =
      key === "supply_configuration"
        ? formatElectricalSupply(field.value)
        : field.value || "Non déterminé";
    const meta = document.createElement("div");
    meta.append(
      createElectricalConfidenceBadge(field.confidence, field.status)
    );
    const origin = document.createElement("small");
    origin.textContent = ELECTRICAL_ORIGIN_LABELS[field.origin] || "Origine non précisée";
    meta.append(origin);

    if (Array.isArray(field.contradictions) && field.contradictions.length) {
      article.classList.add("contradicted");
      article.title = field.contradictions.join("\n");
    }

    article.append(label, value, meta);
    container.append(article);
  }
}

function renderElectricalCounts() {
  const container = getElement("electrical-count-grid");
  container.replaceChildren();
  const counts = ariaState.electricalAnalysis?.counts || {};

  for (const [key, label] of Object.entries(ELECTRICAL_COUNT_LABELS)) {
    const field = counts[key] || {};
    const article = document.createElement("article");
    article.className = "electrical-count-card";
    article.classList.toggle("unknown", field.status === "not_determined");
    article.classList.toggle(
      "contradicted",
      Array.isArray(field.contradictions) && field.contradictions.length > 0
    );
    const value = document.createElement("strong");
    value.textContent = field.status === "not_determined" ? "—" : String(field.value ?? "—");
    const name = document.createElement("span");
    name.textContent = label;
    const confidence = document.createElement("small");
    confidence.textContent = formatElectricalConfidence(field.confidence);
    article.append(value, name, confidence);
    container.append(article);
  }
}

function getTechnicalSource(control) {
  const analysis = ariaState.electricalAnalysis || {};
  return analysis?.[control.group]?.[control.key] || {};
}

function getTechnicalEditValue(control) {
  if (Object.prototype.hasOwnProperty.call(ariaState.electricalTechnicalEdits, control.path)) {
    return ariaState.electricalTechnicalEdits[control.path];
  }
  const source = getTechnicalSource(control);
  return source.status === "not_determined" ? "" : String(source.value ?? "");
}

function renderElectricalTechnicalValidation() {
  const form = getElement("electrical-technical-validation-form");
  form.replaceChildren();

  for (const control of ELECTRICAL_TECHNICAL_CONTROLS) {
    const source = getTechnicalSource(control);
    const wrapper = document.createElement("label");
    wrapper.className = "electrical-technical-control";
    wrapper.dataset.path = control.path;

    const heading = document.createElement("span");
    heading.className = "electrical-technical-control-heading";
    const title = document.createElement("strong");
    title.textContent =
      control.group === "counts"
        ? ELECTRICAL_COUNT_LABELS[control.key]
        : ELECTRICAL_FIELD_LABELS[control.key];
    const confidence = document.createElement("small");
    confidence.textContent = formatElectricalConfidence(source.confidence);
    heading.append(title, confidence);

    let input;
    if (control.type === "select") {
      input = document.createElement("select");
      for (const [value, label] of ELECTRICAL_SUPPLY_OPTIONS) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        input.append(option);
      }
    } else {
      input = document.createElement("input");
      input.type = control.type;
      if (control.type === "number") {
        input.min = "0";
        input.step = "1";
      }
    }
    input.dataset.electricalTechnicalPath = control.path;
    input.value = getTechnicalEditValue(control);

    const validation = document.createElement("span");
    validation.className = "electrical-technical-validation-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.electricalTechnicalDecision = control.path;
    checkbox.checked = Boolean(ariaState.electricalTechnicalDecisions[control.path]);
    const validationText = document.createElement("span");
    validationText.textContent = checkbox.checked ? "Valeur validée" : "À valider";
    validation.append(checkbox, validationText);

    wrapper.classList.toggle("validated", checkbox.checked);
    wrapper.append(heading, input, validation);
    form.append(wrapper);
  }
}

function getElectricalProposalId(proposal, index) {
  return String(proposal?.id || `${proposal?.field || "field"}:${index}`);
}

function renderElectricalProposals() {
  const list = getElement("electrical-proposals-list");
  const empty = getElement("electrical-proposals-empty");
  list.replaceChildren();
  const proposals = Array.isArray(ariaState.electricalAnalysis?.metadata_proposals)
    ? ariaState.electricalAnalysis.metadata_proposals
    : [];
  empty.hidden = proposals.length > 0;

  proposals.forEach((proposal, index) => {
    const id = getElectricalProposalId(proposal, index);
    const decision = ariaState.electricalDecisionMap[id] || "";
    const editedValue = Object.prototype.hasOwnProperty.call(
      ariaState.electricalMetadataEdits,
      id
    )
      ? ariaState.electricalMetadataEdits[id]
      : proposal.proposed_value || "";

    const article = document.createElement("article");
    article.className = "electrical-proposal-card";
    article.dataset.proposalId = id;
    article.classList.toggle("accepted", decision === "accepted");
    article.classList.toggle("corrected", decision === "corrected");
    article.classList.toggle("ignored", decision === "ignored");

    const heading = document.createElement("div");
    heading.className = "electrical-proposal-heading";
    const copy = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = ELECTRICAL_METADATA_LABELS[proposal.field] || proposal.field;
    const values = document.createElement("strong");
    values.textContent = proposal.current_value
      ? `Actuel : ${proposal.current_value}`
      : "Valeur actuelle non renseignée";
    copy.append(label, values);
    const confidence = createElectricalConfidenceBadge(
      proposal.confidence,
      proposal.auto_fill_eligible ? "automatic" : "proposed"
    );
    heading.append(copy, confidence);

    const input = document.createElement("input");
    input.className = "electrical-proposal-input";
    input.type = proposal.field === "date" ? "date" : "text";
    input.value = editedValue;
    input.dataset.electricalProposalInput = id;
    input.maxLength = proposal.field === "description" ? 180 : 60;

    const rationale = document.createElement("p");
    rationale.textContent = proposal.rationale || "Proposition issue de l’analyse du PDF.";

    const badges = document.createElement("div");
    badges.className = "electrical-proposal-badges";
    const origin = document.createElement("span");
    origin.textContent = ELECTRICAL_ORIGIN_LABELS[proposal.origin] || "Indices combinés";
    badges.append(origin);
    if (proposal.official_valid === false) {
      const invalid = document.createElement("span");
      invalid.className = "warning";
      invalid.textContent = "À vérifier dans le référentiel";
      badges.append(invalid);
    }
    if (proposal.auto_fill_eligible) {
      const auto = document.createElement("span");
      auto.className = "automatic";
      auto.textContent = "Éligible à l’automatisation future";
      badges.append(auto);
    }

    const actions = document.createElement("div");
    actions.className = "electrical-proposal-actions";
    for (const [action, text, className] of [
      ["accept", "Accepter", ""],
      ["validate", "Valider cette valeur", "secondary"],
      ["ignore", "Ignorer", "secondary"]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.dataset.electricalProposalAction = action;
      button.dataset.proposalId = id;
      if (className) button.className = className;
      actions.append(button);
    }

    const evidence = document.createElement("details");
    evidence.className = "electrical-proposal-evidence";
    const evidenceSummary = document.createElement("summary");
    evidenceSummary.textContent = `Voir les preuves (${proposal.evidence?.length || 0})`;
    const evidenceList = document.createElement("ul");
    const evidenceItems = Array.isArray(proposal.evidence) ? proposal.evidence : [];
    if (!evidenceItems.length) {
      const item = document.createElement("li");
      item.textContent = "Aucune preuve textuelle courte disponible.";
      evidenceList.append(item);
    } else {
      for (const itemData of evidenceItems) {
        const item = document.createElement("li");
        item.textContent = `Page ${itemData.page || 0} · ${itemData.quote || itemData.reason}`;
        evidenceList.append(item);
      }
    }
    evidence.append(evidenceSummary, evidenceList);

    article.append(heading, input, rationale, badges, actions, evidence);
    list.append(article);
  });
}

function renderElectricalCollections() {
  const analysis = ariaState.electricalAnalysis || {};
  renderElectricalChips(
    "electrical-calibres-list",
    analysis.calibres,
    (item) => `${item.value}${item.count ? ` × ${item.count}` : ""}`
  );
  renderElectricalChips(
    "electrical-cables-list",
    analysis.cables,
    (item) => [item.designation, item.conductors, item.section].filter(Boolean).join(" · ")
  );
  renderElectricalChips(
    "electrical-downstream-list",
    analysis.downstream_boards,
    (item) => `${item.designation}${item.page ? ` · p.${item.page}` : ""}`
  );

  const body = getElement("electrical-circuits-body");
  body.replaceChildren();
  const circuits = Array.isArray(analysis.notable_circuits)
    ? analysis.notable_circuits
    : [];

  if (!circuits.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Aucun circuit remarquable extrait.";
    row.append(cell);
    body.append(row);
  } else {
    for (const circuit of circuits) {
      const row = document.createElement("tr");
      for (const value of [
        circuit.identifier,
        circuit.designation,
        circuit.protection,
        circuit.calibre,
        circuit.supply_type,
        circuit.page || "—"
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.append(cell);
      }
      body.append(row);
    }
  }

  renderElectricalFeedbackList("electrical-contradictions-list", analysis.contradictions);
  renderElectricalFeedbackList("electrical-points-to-verify-list", analysis.points_to_verify);
}

function renderElectricalChips(elementId, items, formatter) {
  const container = getElement(elementId);
  container.replaceChildren();
  const list = Array.isArray(items) ? items : [];

  if (!list.length) {
    const empty = document.createElement("span");
    empty.className = "electrical-empty-chip";
    empty.textContent = "Non déterminé";
    container.append(empty);
    return;
  }

  for (const item of list) {
    const chip = document.createElement("span");
    chip.textContent = formatter(item) || "—";
    container.append(chip);
  }
}

function renderElectricalFeedbackList(elementId, values) {
  const list = getElement(elementId);
  list.replaceChildren();
  const items = Array.isArray(values) ? values : [];

  if (!items.length) {
    const item = document.createElement("li");
    item.textContent = "Aucun élément signalé.";
    list.append(item);
    return;
  }

  for (const value of items) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }
}

function handleElectricalProposalInput(event) {
  const input = event.target.closest("[data-electrical-proposal-input]");
  if (!input) return;
  const id = input.dataset.electricalProposalInput;
  ariaState.electricalMetadataEdits[id] = input.value;
  const proposal = findElectricalProposal(id);
  const previous = proposal?.proposed_value || "";
  if (ariaState.electricalDecisionMap[id] === "accepted" && input.value !== previous) {
    ariaState.electricalDecisionMap[id] = "corrected";
  }
  saveElectricalAnalysisSession();
  updateElectricalDecisionButtons();
}

function handleElectricalProposalClick(event) {
  const button = event.target.closest("[data-electrical-proposal-action]");
  if (!button) return;
  const id = button.dataset.proposalId;
  const action = button.dataset.electricalProposalAction;
  const proposal = findElectricalProposal(id);
  if (!proposal) return;

  if (action === "ignore") {
    ariaState.electricalDecisionMap[id] = "ignored";
  } else {
    const edited = ariaState.electricalMetadataEdits[id] ?? proposal.proposed_value ?? "";
    if (!String(edited).trim()) {
      setState("error", "Valeur vide.", "Saisis une valeur avant de la valider.");
      return;
    }
    ariaState.electricalMetadataEdits[id] = edited;
    ariaState.electricalDecisionMap[id] =
      action === "accept" && edited === proposal.proposed_value
        ? "accepted"
        : "corrected";
  }

  saveElectricalAnalysisSession();
  renderElectricalProposals();
  updateElectricalDecisionButtons();
}

function findElectricalProposal(id) {
  const proposals = Array.isArray(ariaState.electricalAnalysis?.metadata_proposals)
    ? ariaState.electricalAnalysis.metadata_proposals
    : [];
  return proposals.find((proposal, index) => getElectricalProposalId(proposal, index) === id);
}

function acceptReliableElectricalProposals() {
  const proposals = Array.isArray(ariaState.electricalAnalysis?.metadata_proposals)
    ? ariaState.electricalAnalysis.metadata_proposals
    : [];
  let accepted = 0;

  proposals.forEach((proposal, index) => {
    const id = getElectricalProposalId(proposal, index);
    const reliable =
      Number(proposal.confidence) >= 0.85 &&
      proposal.official_valid !== false &&
      (!Array.isArray(proposal.contradictions) || proposal.contradictions.length === 0) &&
      Boolean(proposal.proposed_value);
    if (!reliable) return;
    ariaState.electricalMetadataEdits[id] = proposal.proposed_value;
    ariaState.electricalDecisionMap[id] = "accepted";
    accepted += 1;
  });

  saveElectricalAnalysisSession();
  renderElectricalProposals();
  updateElectricalDecisionButtons();
  setState(
    "idle",
    `${accepted} proposition(s) sélectionnée(s).`,
    "Contrôle les valeurs puis clique sur « Enregistrer les décisions »."
  );
}

function handleElectricalTechnicalInput(event) {
  const input = event.target;
  const path = input.dataset.electricalTechnicalPath;
  const decisionPath = input.dataset.electricalTechnicalDecision;

  if (path) {
    ariaState.electricalTechnicalEdits[path] = input.value;
    const control = ELECTRICAL_TECHNICAL_CONTROLS.find((item) => item.path === path);
    const sourceValue = String(getTechnicalSource(control)?.value ?? "");
    const changed = input.value !== sourceValue && input.value !== "";

    if (changed) {
      ariaState.electricalTechnicalDecisions[path] = true;
      const checkbox = getElement("electrical-technical-validation-form")
        .querySelector(`[data-electrical-technical-decision="${CSS.escape(path)}"]`);
      if (checkbox) checkbox.checked = true;
    }

    const wrapper = input.closest(".electrical-technical-control");
    if (wrapper) {
      const checked = Boolean(ariaState.electricalTechnicalDecisions[path]);
      wrapper.classList.toggle("validated", checked);
      const text = wrapper.querySelector(".electrical-technical-validation-toggle span");
      if (text) text.textContent = checked ? "Valeur validée" : "À valider";
    }
  }

  if (decisionPath) {
    ariaState.electricalTechnicalDecisions[decisionPath] = input.checked;
    const wrapper = input.closest(".electrical-technical-control");
    if (wrapper) {
      wrapper.classList.toggle("validated", input.checked);
      const text = wrapper.querySelector(".electrical-technical-validation-toggle span");
      if (text) text.textContent = input.checked ? "Valeur validée" : "À valider";
    }
  }

  saveElectricalAnalysisSession();
  updateElectricalDecisionButtons();
}

function acceptReliableTechnicalValues() {
  let accepted = 0;
  for (const control of ELECTRICAL_TECHNICAL_CONTROLS) {
    const source = getTechnicalSource(control);
    const hasValue =
      source.status !== "not_determined" &&
      String(source.value ?? "").trim() !== "";
    const reliable =
      hasValue &&
      Number(source.confidence) >= 0.85 &&
      (!Array.isArray(source.contradictions) || source.contradictions.length === 0);
    if (!reliable) continue;
    ariaState.electricalTechnicalEdits[control.path] = String(source.value);
    ariaState.electricalTechnicalDecisions[control.path] = true;
    accepted += 1;
  }

  saveElectricalAnalysisSession();
  renderElectricalTechnicalValidation();
  updateElectricalDecisionButtons();
  setState(
    "idle",
    `${accepted} valeur(s) technique(s) sélectionnée(s).`,
    "Tu peux encore les corriger avant l’enregistrement."
  );
}

function collectElectricalDecisions() {
  const decisions = [];
  const proposals = Array.isArray(ariaState.electricalAnalysis?.metadata_proposals)
    ? ariaState.electricalAnalysis.metadata_proposals
    : [];

  proposals.forEach((proposal, index) => {
    const id = getElectricalProposalId(proposal, index);
    const state = ariaState.electricalDecisionMap[id];
    if (!state) return;
    const finalValue = String(
      ariaState.electricalMetadataEdits[id] ?? proposal.proposed_value ?? ""
    ).trim();
    decisions.push({
      field: `metadata.${proposal.field}`,
      metadata_field: proposal.field,
      action: state,
      proposed_value: proposal.proposed_value || "",
      final_value: state === "ignored" ? "" : finalValue,
      confidence: Number(proposal.confidence) || 0,
      rationale: proposal.rationale || "",
      evidence: proposal.evidence || []
    });
  });

  for (const control of ELECTRICAL_TECHNICAL_CONTROLS) {
    if (!ariaState.electricalTechnicalDecisions[control.path]) continue;
    const source = getTechnicalSource(control);
    const proposed = source.status === "not_determined" ? "" : String(source.value ?? "");
    const finalValue = String(getTechnicalEditValue(control)).trim();
    if (!finalValue) continue;
    decisions.push({
      field: control.path,
      action: finalValue === proposed ? "accepted" : "corrected",
      proposed_value: proposed,
      final_value: finalValue,
      confidence: Number(source.confidence) || 0,
      rationale: `${control.group === "counts" ? "Comptage" : "Valeur technique"} validé par Anand.`,
      evidence: source.evidence || []
    });
  }

  return decisions;
}

function buildMetadataFromElectricalDecisions(decisions) {
  const metadata = {
    ...(ariaState.documentEditorMetadata || ariaState.documentAnalysis?.metadata || {})
  };

  for (const decision of decisions) {
    if (
      !decision.metadata_field ||
      decision.action === "ignored" ||
      !decision.final_value
    ) {
      continue;
    }
    metadata[decision.metadata_field] = decision.final_value;
  }

  return metadata;
}

async function saveElectricalDecisions() {
  if (
    !ariaState.electricalAnalysis ||
    ariaState.electricalValidationBusy ||
    ariaState.electricalAnalysisBusy
  ) {
    return;
  }

  const decisions = collectElectricalDecisions();
  if (!decisions.length) {
    setState(
      "error",
      "Aucune décision sélectionnée.",
      "Accepte, corrige ou ignore au moins une proposition, ou valide une valeur technique."
    );
    return;
  }

  ariaState.electricalValidationBusy = true;
  updateElectricalAnalystInterface();
  setState(
    "thinking",
    "Enregistrement des décisions…",
    "ARIA applique les métadonnées acceptées puis enregistre les validations dans la mémoire privée."
  );

  let metadataResult = null;
  try {
    const metadata = buildMetadataFromElectricalDecisions(decisions);
    const hasMetadataDecision = decisions.some(
      (decision) => decision.metadata_field && decision.action !== "ignored"
    );

    if (hasMetadataDecision) {
      metadataResult = await normalizeEditedDocumentMetadata(metadata);
      if (metadataResult?.ok) {
        commitDocumentCards({ manuallyValidated: true, persist: true });
      }
    }

    ariaState.electricalClassificationSignature =
      buildElectricalClassificationSignature(ariaState.documentAnalysis);
    ariaState.electricalAnalysisStale = false;

    const data = await electricalApiRequest({
      action: "save_validation",
      documentId: ariaState.electricalDocumentId,
      pdf: {
        pathname: ariaState.pendingPdf?.pathname,
        name: ariaState.pendingPdf?.name,
        size: ariaState.pendingPdf?.size
      },
      classification: ariaState.documentAnalysis,
      analysis: ariaState.electricalAnalysis,
      decisions
    });

    ariaState.electricalAnalysis.validation = {
      status: "validated",
      decisions,
      validated_at: data.validation?.validatedAt || new Date().toISOString()
    };
    ariaState.electricalLastSavedAt =
      data.validation?.validatedAt || new Date().toISOString();
    ariaState.electricalLearning = {
      ...(ariaState.electricalLearning || {}),
      totals: {
        validated_documents: data.validation?.learning?.validatedDocuments || 0,
        decisions: data.validation?.learning?.totalDecisions || 0,
        automation_eligible_rules:
          data.validation?.learning?.automationEligibleRules || 0
      }
    };
    saveElectricalAnalysisSession();
    updateElectricalAnalystInterface();

    setState(
      "idle",
      "Décisions électriques enregistrées.",
      metadataResult?.coreValidated === false
        ? "Les valeurs sont conservées et la mémoire d’apprentissage est mise à jour. La validation documentaire Core a utilisé le mode local de secours."
        : "Les corrections et validations alimenteront les futures propositions d’ARIA."
    );
  } catch (error) {
    console.error("Electrical validation save failed:", error);
    ariaState.electricalAnalysis.validation = {
      status: "validated_locally",
      decisions,
      validated_at: new Date().toISOString()
    };
    ariaState.electricalLastSavedAt = new Date().toISOString();
    saveElectricalAnalysisSession();
    updateElectricalAnalystInterface();
    setState(
      "error",
      "Décisions conservées localement.",
      `La mémoire privée n’a pas pu être mise à jour : ${getReadableError(error)}`
    );
  } finally {
    ariaState.electricalValidationBusy = false;
    updateElectricalAnalystInterface();
  }
}

function updateElectricalDecisionButtons() {
  if (!domReady) return;
  const decisions = collectElectricalDecisions();
  const button = getElement("save-electrical-decisions-button");
  button.textContent = ariaState.electricalValidationBusy
    ? "Enregistrement…"
    : decisions.length
      ? `Enregistrer les décisions (${decisions.length})`
      : "Enregistrer les décisions";
  button.disabled =
    ariaState.electricalValidationBusy ||
    ariaState.electricalAnalysisBusy ||
    decisions.length === 0;
}

async function copyElectricalAnalysis() {
  if (!ariaState.electricalAnalysis) return;
  try {
    await writeClipboardText(
      JSON.stringify(
        {
          documentId: ariaState.electricalDocumentId,
          analysis: ariaState.electricalAnalysis,
          decisions: collectElectricalDecisions(),
          learning: ariaState.electricalLearning
        },
        null,
        2
      )
    );
    setState("idle", "Préanalyse copiée.", "Le JSON est disponible dans le presse-papiers.");
  } catch (error) {
    setState("error", "Copie impossible.", getReadableError(error));
  }
}

function updateElectricalMemoryStatus() {
  const analysis = ariaState.electricalAnalysis;
  const validationStatus = analysis?.validation?.status || "proposed";
  const persistence = ariaState.electricalPersistence;
  const totals = ariaState.electricalLearning?.totals || {};
  const validatedDocuments = Number(
    totals.validated_documents ?? totals.validatedDocuments ?? 0
  ) || 0;
  const decisions = Number(totals.decisions ?? totals.totalDecisions ?? 0) || 0;
  const eligible = Number(
    totals.automation_eligible_rules ?? totals.automationEligibleRules ?? 0
  ) || 0;

  let status = "Préanalyse non validée";
  let detail = persistence?.saved
    ? "La préanalyse brute est enregistrée. Seules tes décisions alimentent l’apprentissage."
    : "La préanalyse est conservée dans ce navigateur en attendant la validation.";

  if (validationStatus === "validated") {
    status = "Décisions validées et mémorisées";
    detail = `${decisions} décision(s) humaines enregistrée(s). ${eligible} règle(s) atteignent actuellement le seuil d’automatisation.`;
  } else if (validationStatus === "validated_locally") {
    status = "Décisions conservées localement";
    detail = "La mémoire privée devra être resynchronisée lors d’un prochain enregistrement.";
  }

  getElement("electrical-memory-status").textContent = status;
  getElement("electrical-memory-detail").textContent = detail;
  getElement("electrical-learning-counter").textContent =
    `${validatedDocuments} document${validatedDocuments > 1 ? "s" : ""} validé${validatedDocuments > 1 ? "s" : ""}`;
}

function updateElectricalAnalystInterface() {
  if (!domReady) return;
  ensureElectricalState();
  reconcileElectricalDocumentState();

  const card = getElement("electrical-analysis-card");
  const analysis = ariaState.electricalAnalysis;
  const documentReady = Boolean(ariaState.pendingPdf && ariaState.documentAnalysis);
  card.hidden = !documentReady;

  if (!documentReady) return;

  updateElectricalProgressInterface();
  const empty = getElement("electrical-analysis-empty");
  const content = getElement("electrical-analysis-content");
  const errorBlock = getElement("electrical-analysis-error");
  const confidenceBadge = getElement("electrical-confidence-badge");
  const runButton = getElement("run-electrical-analysis-button");
  const rerunButton = getElement("rerun-electrical-analysis-button");
  const staleBadge = getElement("electrical-stale-badge");

  empty.hidden = Boolean(analysis) || ariaState.electricalAnalysisBusy;
  content.hidden = !analysis;
  errorBlock.hidden = !ariaState.electricalAnalysisError;
  confidenceBadge.hidden = !analysis;
  runButton.disabled = ariaState.electricalAnalysisBusy || ariaState.documentAnalysisBusy;
  rerunButton.disabled = ariaState.electricalAnalysisBusy || ariaState.electricalValidationBusy;

  if (ariaState.electricalAnalysisError) {
    getElement("electrical-analysis-error-text").textContent =
      ariaState.electricalAnalysisError.message || "Erreur inconnue.";
    getElement("electrical-analysis-error-code").textContent =
      ariaState.electricalAnalysisError.code || "";
  }

  if (!analysis) {
    updateElectricalDecisionButtons();
    return;
  }

  const confidence = formatElectricalConfidence(analysis.overall_confidence);
  confidenceBadge.textContent = `Confiance ${confidence}`;
  confidenceBadge.classList.toggle(
    "high",
    Number(analysis.overall_confidence) >= 0.9
  );
  confidenceBadge.classList.toggle(
    "medium",
    Number(analysis.overall_confidence) >= 0.65 &&
      Number(analysis.overall_confidence) < 0.9
  );
  confidenceBadge.classList.toggle(
    "low",
    Number(analysis.overall_confidence) < 0.65
  );

  getElement("electrical-document-kind").textContent =
    `${analysis.document_kind?.code || "NON_DETERMINE"} — ${
      analysis.document_kind?.label || "Nature non déterminée"
    }`;
  getElement("electrical-analysis-summary").textContent =
    analysis.analysis_summary || "Aucun résumé technique disponible.";

  staleBadge.hidden = !ariaState.electricalAnalysisStale;
  staleBadge.textContent = ariaState.electricalAnalysisStale
    ? "Métadonnées modifiées · préanalyse à actualiser"
    : "À jour";

  renderElectricalKeyFields();
  renderElectricalCounts();
  renderElectricalTechnicalValidation();
  renderElectricalProposals();
  renderElectricalCollections();
  updateElectricalMemoryStatus();
  updateElectricalDecisionButtons();

  getElement("clear-electrical-analysis-button").disabled =
    ariaState.electricalAnalysisBusy || ariaState.electricalValidationBusy;
  getElement("copy-electrical-analysis-button").disabled =
    ariaState.electricalAnalysisBusy;
}

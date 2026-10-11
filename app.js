const claimCases = {
  caseA: {
    title: "Case A — Routine Review",
    summary: [
      ["Practice patient", "Morgan Lee (synthetic)", "ok"],
      ["Training record ID", "SYN-1001", "ok"],
      ["Coverage", "Harbor Health Plan (fictional)", "ok"],
      ["Provider reference", "TRAIN-NPI-001", "ok"],
      ["Service reference", "TRAIN-SVC-A", "ok"],
      ["Diagnosis reference", "TRAIN-DX-A", "ok"],
      ["Service date", "2026-09-18", "ok"],
      ["Authorization review", "Not indicated in this scenario", "ok"],
      ["Documentation", "Visit note marked complete", "ok"]
    ],
    expected: ["patient", "coverage", "provider", "service", "dates", "authorization", "documentation"],
    followUp: [],
    explanation: "This synthetic record presents every listed administrative item as complete. In real work, a complete-looking record still does not guarantee payment, coverage, compliance, or correct coding."
  },
  caseB: {
    title: "Case B — Missing Information",
    summary: [
      ["Practice patient", "Avery Stone (synthetic)", "ok"],
      ["Training record ID", "SYN-1002", "ok"],
      ["Coverage", "Plan name present; member reference missing", "issue"],
      ["Provider reference", "TRAIN-NPI-002", "ok"],
      ["Service reference", "TRAIN-SVC-B", "ok"],
      ["Diagnosis reference", "TRAIN-DX-B", "ok"],
      ["Service date", "2026-09-21", "ok"],
      ["Authorization review", "Not documented", "attention"],
      ["Documentation", "Visit note marked complete", "ok"]
    ],
    expected: ["patient", "provider", "service", "dates", "documentation"],
    followUp: [
      "Coverage information needs follow-up because the scenario says the member reference is missing.",
      "Authorization status needs review because the scenario says it is not documented."
    ],
    explanation: "The safest training decision is to avoid marking incomplete or undocumented items as ready. The goal is to identify what needs follow-up before a workflow moves forward."
  },
  caseC: {
    title: "Case C — Needs Follow-up",
    summary: [
      ["Practice patient", "Jordan Park (synthetic)", "ok"],
      ["Training record ID", "SYN-1003", "ok"],
      ["Coverage", "Northline Benefit Plan (fictional)", "ok"],
      ["Provider reference", "Not listed", "issue"],
      ["Service reference", "TRAIN-SVC-C", "ok"],
      ["Diagnosis reference", "TRAIN-DX-C", "ok"],
      ["Service date", "2026-10-03", "ok"],
      ["Authorization review", "Scenario says review is required", "attention"],
      ["Documentation", "Supporting note status not confirmed", "attention"]
    ],
    expected: ["patient", "coverage", "service", "dates"],
    followUp: [
      "Provider identifier information is missing in the scenario.",
      "Authorization review is required in the scenario and should not be treated as complete yet.",
      "Supporting documentation status needs confirmation."
    ],
    explanation: "This case is intentionally not ready. A careful workflow pauses for the missing provider information, authorization review, and documentation confirmation."
  }
};

const coverageCases = {
  coverageA: {
    title: "Case A — Information Aligns",
    summary: [
      ["Practice member", "Taylor Reed (synthetic)", "ok"],
      ["Member reference", "TRAIN-MBR-401", "ok"],
      ["Fictional plan", "Cedar Benefit Plan", "ok"],
      ["Coverage period", "2026-01-01 through 2026-12-31", "ok"],
      ["Service date", "2026-10-02", "ok"],
      ["Coverage status", "Shown as active in scenario", "ok"],
      ["Authorization note", "Scenario states not required", "ok"],
      ["Network note", "Scenario states reviewed", "ok"]
    ],
    followUp: [],
    explanation: "The information supplied in this fictional snapshot aligns. In real workflows, eligibility or coverage information is time-sensitive and does not by itself guarantee payment or benefits."
  },
  coverageB: {
    title: "Case B — Missing Member Reference",
    summary: [
      ["Practice member", "Casey Morgan (synthetic)", "ok"],
      ["Member reference", "Missing", "issue"],
      ["Fictional plan", "Pine Valley Coverage", "ok"],
      ["Coverage period", "2026-01-01 through 2026-12-31", "ok"],
      ["Service date", "2026-10-05", "ok"],
      ["Coverage status", "Shown as active in scenario", "ok"],
      ["Authorization note", "Not documented", "attention"],
      ["Network note", "Scenario states reviewed", "ok"]
    ],
    followUp: ["member", "authorization"],
    explanation: "This scenario needs follow-up because the member reference is missing and the authorization requirement is not documented."
  },
  coverageC: {
    title: "Case C — Coverage Date Mismatch",
    summary: [
      ["Practice member", "Riley Chen (synthetic)", "ok"],
      ["Member reference", "TRAIN-MBR-403", "ok"],
      ["Fictional plan", "Summit Care Plan", "ok"],
      ["Coverage period", "2026-01-01 through 2026-08-31", "attention"],
      ["Service date", "2026-09-14", "issue"],
      ["Coverage status", "Old snapshot says active", "attention"],
      ["Authorization note", "Scenario states reviewed", "ok"],
      ["Network note", "Not confirmed", "attention"]
    ],
    followUp: ["dates", "status", "network"],
    explanation: "The service date falls outside the stated coverage period, the status snapshot may be outdated, and network information is not confirmed. Those items should be reviewed before relying on the snapshot."
  }
};

const completedModules = new Set();
const humanClaimLabels = {
  patient: "patient demographic information",
  coverage: "coverage / payer information",
  provider: "provider identifier information",
  service: "service and diagnosis references",
  dates: "date consistency",
  authorization: "authorization review",
  documentation: "supporting documentation status"
};
const coverageLabels = {
  member: "member / subscriber reference",
  dates: "coverage dates compared with the service date",
  status: "coverage status information",
  authorization: "authorization requirement",
  network: "network / provider participation information"
};

function updateProgress() {
  const count = completedModules.size;
  const percent = Math.round((count / 3) * 100);
  document.getElementById("progress-label").textContent = `${count} of 3 modules completed`;
  document.getElementById("progress-bar").style.width = `${percent}%`;
}

function renderSummary(element, rows) {
  element.innerHTML = rows.map(([label, value, state]) => {
    const stateClass = state === "issue" ? " issue" : state === "attention" ? " attention" : "";
    return `<div class="summary-item${stateClass}"><span>${label}</span><strong>${value}</strong></div>`;
  }).join("");
}

// Module 1: Claim readiness
const readinessForm = document.getElementById("readiness-form");
const claimTitle = document.getElementById("case-title");
const claimSummary = document.getElementById("case-summary");
const claimResult = document.getElementById("result-panel");
const claimReset = document.getElementById("reset-button");
const claimButtons = [...document.querySelectorAll(".case-button")];
let currentClaimCase = "caseA";

function renderClaimCase(key) {
  currentClaimCase = key;
  const practiceCase = claimCases[key];
  claimTitle.textContent = practiceCase.title;
  renderSummary(claimSummary, practiceCase.summary);
  claimButtons.forEach((button) => {
    const active = button.dataset.case === key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  readinessForm.reset();
  claimResult.className = "result-panel";
  claimResult.innerHTML = "";
}

readinessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const practiceCase = claimCases[currentClaimCase];
  const selected = [...readinessForm.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.name);
  const expectedSet = new Set(practiceCase.expected);
  const selectedSet = new Set(selected);
  const incorrect = selected.filter((item) => !expectedSet.has(item));
  const missed = practiceCase.expected.filter((item) => !selectedSet.has(item));
  const totalItems = 7 + practiceCase.followUp.length;
  const correctDecisions = Math.max(0, practiceCase.expected.length - incorrect.length);
  const score = Math.round((correctDecisions / totalItems) * 100);

  const feedback = [...practiceCase.followUp];
  incorrect.forEach((item) => feedback.push(`You marked ${humanClaimLabels[item]} as complete, but this scenario shows that item still needs attention.`));
  missed.forEach((item) => feedback.push(`You left ${humanClaimLabels[item]} unchecked even though the synthetic scenario presents it as complete.`));

  if (score === 100) completedModules.add("claim");
  updateProgress();

  claimResult.className = `result-panel show ${feedback.length ? "warning" : "success"}`;
  claimResult.innerHTML = `
    <div class="score-row"><span class="score-pill">Training score: ${score}%</span><span class="score-pill">${feedback.length ? `${feedback.length} review item${feedback.length === 1 ? "" : "s"}` : "No follow-up items"}</span></div>
    <h4>${score === 100 ? "Excellent review." : "Review the highlighted follow-up points."}</h4>
    <p>${practiceCase.explanation}</p>
    ${feedback.length ? `<ul class="result-list">${feedback.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    <p><strong>Reminder:</strong> This is educational feedback for a fictional scenario, not a real claim determination.</p>`;
  claimResult.focus();
});

claimButtons.forEach((button) => button.addEventListener("click", () => renderClaimCase(button.dataset.case)));
claimReset.addEventListener("click", () => {
  readinessForm.reset();
  claimResult.className = "result-panel";
  claimResult.innerHTML = "";
});

// Module 2: Coverage review
const coverageForm = document.getElementById("coverage-form");
const coverageTitle = document.getElementById("coverage-title");
const coverageSummary = document.getElementById("coverage-summary");
const coverageResult = document.getElementById("coverage-result-panel");
const coverageReset = document.getElementById("coverage-reset-button");
const coverageButtons = [...document.querySelectorAll(".coverage-case-button")];
let currentCoverageCase = "coverageA";

function renderCoverageCase(key) {
  currentCoverageCase = key;
  const practiceCase = coverageCases[key];
  coverageTitle.textContent = practiceCase.title;
  renderSummary(coverageSummary, practiceCase.summary);
  coverageButtons.forEach((button) => {
    const active = button.dataset.coverageCase === key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  coverageForm.reset();
  coverageResult.className = "result-panel";
  coverageResult.innerHTML = "";
}

coverageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const practiceCase = coverageCases[currentCoverageCase];
  const selected = [...coverageForm.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.name);
  const expected = new Set(practiceCase.followUp);
  const selectedSet = new Set(selected);
  const incorrect = selected.filter((item) => !expected.has(item));
  const missed = practiceCase.followUp.filter((item) => !selectedSet.has(item));
  const correctCount = 5 - incorrect.length - missed.length;
  const score = Math.max(0, Math.round((correctCount / 5) * 100));

  const feedback = [];
  missed.forEach((item) => feedback.push(`This scenario indicates that ${coverageLabels[item]} needs follow-up.`));
  incorrect.forEach((item) => feedback.push(`The scenario presents ${coverageLabels[item]} as already reviewed or complete.`));

  if (score === 100) completedModules.add("coverage");
  updateProgress();

  coverageResult.className = `result-panel show ${feedback.length ? "warning" : "success"}`;
  coverageResult.innerHTML = `
    <div class="score-row"><span class="score-pill">Training score: ${score}%</span><span class="score-pill">${practiceCase.followUp.length ? `${practiceCase.followUp.length} scenario follow-up item${practiceCase.followUp.length === 1 ? "" : "s"}` : "No scenario follow-up items"}</span></div>
    <h4>${score === 100 ? "Great coverage-review thinking." : "Take another look at the scenario details."}</h4>
    <p>${practiceCase.explanation}</p>
    ${feedback.length ? `<ul class="result-list">${feedback.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    <p><strong>Important:</strong> This exercise is not eligibility verification and does not determine benefits, payment, network status, or authorization for any real person.</p>`;
  coverageResult.focus();
});

coverageButtons.forEach((button) => button.addEventListener("click", () => renderCoverageCase(button.dataset.coverageCase)));
coverageReset.addEventListener("click", () => {
  coverageForm.reset();
  coverageResult.className = "result-panel";
  coverageResult.innerHTML = "";
});

// Module 3: Privacy awareness
const privacyForm = document.getElementById("privacy-form");
const privacyResult = document.getElementById("privacy-result-panel");
const privacyReset = document.getElementById("privacy-reset-button");
const privateItems = new Set(["realName", "realMemberId", "realMrn", "realDob"]);
const privacyLabels = {
  realName: "a real patient's full name",
  syntheticName: "a clearly labeled fictional name",
  realMemberId: "a real insurance member ID",
  trainingId: "a fictional training record ID",
  realMrn: "a real medical record number",
  genericLabel: "a generic workflow label",
  realDob: "a real patient's date of birth",
  fictionalDate: "a fictional training date"
};

privacyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = [...privacyForm.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.name);
  const selectedSet = new Set(selected);
  const missed = [...privateItems].filter((item) => !selectedSet.has(item));
  const incorrect = selected.filter((item) => !privateItems.has(item));
  const correctCount = 8 - missed.length - incorrect.length;
  const score = Math.max(0, Math.round((correctCount / 8) * 100));

  const feedback = [];
  missed.forEach((item) => feedback.push(`Do not enter ${privacyLabels[item]} into this public training demo.`));
  incorrect.forEach((item) => feedback.push(`${privacyLabels[item][0].toUpperCase()}${privacyLabels[item].slice(1)} is safe for this exercise when it is truly fictional and not linked to a real person.`));

  if (score === 100) completedModules.add("privacy");
  updateProgress();

  privacyResult.className = `result-panel show ${feedback.length ? "warning" : "success"}`;
  privacyResult.innerHTML = `
    <div class="score-row"><span class="score-pill">Training score: ${score}%</span><span class="score-pill">Privacy awareness</span></div>
    <h4>${score === 100 ? "Excellent — you kept the public demo synthetic." : "Review which information belongs outside a public demo."}</h4>
    <p>Real patient identifiers and real insurance or medical-record identifiers should not be entered here. This project is intentionally designed around fictional examples instead.</p>
    ${feedback.length ? `<ul class="result-list">${feedback.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    <p><strong>Reminder:</strong> When in doubt, do not enter real patient or employer-confidential information into a public training tool.</p>`;
  privacyResult.focus();
});

privacyReset.addEventListener("click", () => {
  privacyForm.reset();
  privacyResult.className = "result-panel";
  privacyResult.innerHTML = "";
});

renderClaimCase(currentClaimCase);
renderCoverageCase(currentCoverageCase);
updateProgress();

import { state } from "./state.mjs";
import { renderDashboard } from "./dashboard.mjs";
import {
  populateEvidenceDropdowns,
  applyStoredBookmarkFlags,
  renderEvidenceList,
} from "./evidence.mjs";
import { populateTimelineDropdowns, renderTimeline } from "./timeline.mjs";
import { populateHypothesisDropdowns } from "./workspace.mjs";
import { renderPeople } from "./peoplelocations.mjs";

// ---------------------------------------------------------------------
// LOADING OVERLAY
// ---------------------------------------------------------------------

const showLoadingOverlay = (msg) => {
  const overlay = document.getElementById("loadingOverlay");
  const text = document.getElementById("loadingText");
  if (text) text.textContent = msg;
  if (overlay) overlay.classList.remove("hidden");
};

const hideLoadingStep = () => {
  state.loadingStepsRemaining--;
  if (state.loadingStepsRemaining <= 0) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("hidden");
  }
};

const populateAllDropdowns = () => {
  populateEvidenceDropdowns();
  populateTimelineDropdowns();
  populateHypothesisDropdowns();
};

// ---------------------------------------------------------------------
// DATA LOADING
// ---------------------------------------------------------------------

const fetchJson = async (url) => {
  const res = await fetch(url);
  return res.json();
};

// Sequential on purpose (parallelising is a later exercise): each file is only requested
// after the previous one has been fetched and parsed.
const loadCorePeopleAndLocations = async () => {
  state.caseData = await fetchJson("data/case.json");
  state.allPeople = await fetchJson("data/people.json");
  state.allLocations = await fetchJson("data/locations.json");

  hideLoadingStep();
  renderDashboard();
  populateAllDropdowns();
};

const loadEvidenceData = async () => {
  try {
    state.allEvidence = await fetchJson("data/evidence.json");
    applyStoredBookmarkFlags();
    state.filteredEvidence = [...state.allEvidence]; // a copy, never an alias of allEvidence
    renderDashboard();
    populateAllDropdowns();
    if (state.currentPage === "people") renderPeople(); // evidence counts on the cards were 0 until now
  } catch (err) {
    console.error("Failed to load evidence.json", err);
    alert("Evidence could not be loaded. Some views may be incomplete.");
  } finally {
    // Whether it worked or not, the request is no longer pending. Without this the evidence
    // list stays on its loading spinner forever.
    state.evidenceViewLoading = false;
    if (state.currentPage === "evidence") renderEvidenceList();
  }
};

const loadTimelineData = async () => {
  try {
    state.allTimeline = await fetchJson("data/timeline.json");
    renderDashboard();
    if (state.currentPage === "timeline") renderTimeline();
    populateAllDropdowns();
  } catch (err) {
    console.log("timeline load error", err);
  } finally {
    hideLoadingStep();
  }
};

export const loadAllData = async () => {
  showLoadingOverlay("Loading case file…");
  state.loadingStepsRemaining = 2;
  await loadCorePeopleAndLocations();
  // Both requests are started together (as before) and are now also awaited, so callers
  // know when *all* data is in.
  await Promise.all([loadEvidenceData(), loadTimelineData()]);
};

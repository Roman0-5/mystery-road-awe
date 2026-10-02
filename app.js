// Entry point: wires up navigation and event listeners, then loads the data.
// Everything else lives in ./modules/ (state, data loading, storage, one module per view).
import { state } from "./modules/state.ts";
import { navigateTo } from "./modules/navigation.mjs";
import {
  loadBookmarksFromStorage,
  loadNotesFromStorage,
  loadNoteAsync,
} from "./modules/storage.ts";
import { loadAllData } from "./modules/data.ts";
import { renderDashboard } from "./modules/dashboard.mjs";
import {
  renderEvidenceList,
  handleEvidenceListClick,
  handleDetailClick,
  handleSearchInput,
  clearFilters,
} from "./modules/evidence.mjs";
import {
  renderPeople,
  renderLocations,
  switchPeopleTab,
} from "./modules/peoplelocations.mjs";
import { renderTimeline } from "./modules/timeline.mjs";
import { renderWorkspace, saveHypothesis } from "./modules/workspace.mjs";

// ---------------------------------------------------------------------
// NAVIGATION / HASH ROUTING
// ---------------------------------------------------------------------

const VALID_VIEWS = [
  "dashboard",
  "evidence",
  "people",
  "timeline",
  "workspace",
];

const handleHashChange = () => {
  let hash = window.location.hash.replace("#", "");
  if (!VALID_VIEWS.includes(hash)) {
    hash = "dashboard";
  }
  state.currentPage = hash;

  document
    .querySelectorAll(".view")
    .forEach((section) => section.classList.remove("active"));
  document.getElementById("view-" + hash).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-view") === hash);
  });

  // Dashboard, people and workspace are cheap and show data that changes while the app is used
  // (bookmarks, review status, late-arriving evidence), so they re-render on every visit.
  if (hash === "dashboard") {
    renderDashboard();
  } else if (hash === "evidence" && !state.viewRendered.evidence) {
    renderEvidenceList();
    state.viewRendered.evidence = true;
  } else if (hash === "people") {
    renderPeople();
    renderLocations();
  } else if (hash === "timeline" && !state.viewRendered.timeline) {
    renderTimeline();
    state.viewRendered.timeline = true;
  } else if (hash === "workspace") {
    renderWorkspace();
  }
};

// ---------------------------------------------------------------------
// EVENT LISTENER SETUP
// ---------------------------------------------------------------------

const setupEventListeners = () => {
  window.addEventListener("hashchange", handleHashChange);

  // Nav bar and the "Go to ..." buttons. Module functions are not reachable from inline onclick=""
  // attributes, so index.html declares the target (data-view / data-nav) and this one listener acts on it.
  document.addEventListener("click", (e) => {
    const navEl = e.target.closest("[data-nav], .nav-btn");
    if (navEl) navigateTo(navEl.dataset.nav || navEl.dataset.view);
  });

  document
    .getElementById("evidenceSearch")
    .addEventListener("input", handleSearchInput);

  [
    "filterType",
    "filterPerson",
    "filterLocation",
    "filterStatus",
    "filterRelevance",
    "sortEvidence",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("change", renderEvidenceList);
  });
  document
    .getElementById("clearFiltersBtn")
    .addEventListener("click", clearFilters);

  // Delegated once here instead of on every re-render.
  document
    .getElementById("evidenceList")
    .addEventListener("click", handleEvidenceListClick);
  document
    .getElementById("evidenceDetailSection")
    .addEventListener("click", handleDetailClick);

  [
    "timelineOrder",
    "timelinePersonFilter",
    "timelineLocationFilter",
    "timelineTypeFilter",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("change", renderTimeline);
  });

  document
    .getElementById("tabPeopleBtn")
    .addEventListener("click", () => switchPeopleTab("people"));
  document
    .getElementById("tabLocationsBtn")
    .addEventListener("click", () => switchPeopleTab("locations"));

  document
    .getElementById("saveHypothesisBtn")
    .addEventListener("click", saveHypothesis);
  document.getElementById("hypConfidence").addEventListener("input", (e) => {
    document.getElementById("hypConfidenceValue").textContent = e.target.value;
  });
};

// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------

const initApp = async () => {
  loadBookmarksFromStorage();
  loadNotesFromStorage();
  setupEventListeners();

  await loadAllData();
  handleHashChange();
  const firstNote = await loadNoteAsync("E01");
  console.log("First note preview:", firstNote);
};

window.addEventListener("DOMContentLoaded", initApp);

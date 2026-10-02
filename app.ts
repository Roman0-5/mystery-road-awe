// Entry point: wires up navigation and event listeners, then loads the data.
// Everything else lives in ./modules/ (state, data loading, storage, one module per view).
import { state } from "./modules/state.ts";
import { getEl } from "./modules/utils.ts";
import { navigateTo } from "./modules/navigation.ts";
import {
  loadBookmarksFromStorage,
  loadNotesFromStorage,
  loadNoteAsync,
} from "./modules/storage.ts";
import { loadAllData } from "./modules/data.ts";
import { renderDashboard } from "./modules/dashboard.ts";
import {
  renderEvidenceList,
  handleEvidenceListClick,
  handleDetailClick,
  handleSearchInput,
  clearFilters,
} from "./modules/evidence.ts";
import {
  renderPeople,
  renderLocations,
  switchPeopleTab,
} from "./modules/peoplelocations.ts";
import { renderTimeline } from "./modules/timeline.ts";
import { renderWorkspace, saveHypothesis } from "./modules/workspace.ts";

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

const handleHashChange = (): void => {
  let hash = window.location.hash.replace("#", "");
  if (!VALID_VIEWS.includes(hash)) {
    hash = "dashboard";
  }
  state.currentPage = hash;

  document
    .querySelectorAll(".view")
    .forEach((section) => section.classList.remove("active"));
  getEl("view-" + hash).classList.add("active");

  document.querySelectorAll<HTMLElement>(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === hash);
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

const setupEventListeners = (): void => {
  window.addEventListener("hashchange", handleHashChange);

  // Nav bar and the "Go to ..." buttons. Module functions are not reachable from inline onclick=""
  // attributes, so index.html declares the target (data-view / data-nav) and this one listener acts on it.
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const navEl = e.target.closest<HTMLElement>("[data-nav], .nav-btn");
    const target = navEl?.dataset.nav ?? navEl?.dataset.view;
    if (target) navigateTo(target);
  });

  getEl("evidenceSearch").addEventListener("input", (e) => {
    void handleSearchInput(e);
  });

  [
    "filterType",
    "filterPerson",
    "filterLocation",
    "filterStatus",
    "filterRelevance",
    "sortEvidence",
  ].forEach((id) => {
    getEl(id).addEventListener("change", renderEvidenceList);
  });
  getEl("clearFiltersBtn").addEventListener("click", clearFilters);

  // Delegated once here instead of on every re-render.
  getEl("evidenceList").addEventListener("click", handleEvidenceListClick);
  getEl("evidenceDetailSection").addEventListener("click", handleDetailClick);

  [
    "timelineOrder",
    "timelinePersonFilter",
    "timelineLocationFilter",
    "timelineTypeFilter",
  ].forEach((id) => {
    getEl(id).addEventListener("change", renderTimeline);
  });

  getEl("tabPeopleBtn").addEventListener("click", () =>
    switchPeopleTab("people"),
  );
  getEl("tabLocationsBtn").addEventListener("click", () =>
    switchPeopleTab("locations"),
  );

  getEl("saveHypothesisBtn").addEventListener("click", saveHypothesis);
  const confidence = getEl("hypConfidence", HTMLInputElement);
  confidence.addEventListener("input", () => {
    getEl("hypConfidenceValue").textContent = confidence.value;
  });
};

// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------

const initApp = async (): Promise<void> => {
  loadBookmarksFromStorage();
  loadNotesFromStorage();
  setupEventListeners();

  await loadAllData();
  handleHashChange();
  const firstNote = await loadNoteAsync("E01");
  console.log("First note preview:", firstNote);
};

window.addEventListener("DOMContentLoaded", () => {
  void initApp();
});

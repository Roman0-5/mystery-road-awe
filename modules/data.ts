import { state } from "./state.ts";
import type {
  CaseData,
  Evidence,
  EvidenceRelevance,
  EvidenceStatus,
  Location,
  Person,
  TimelineEvent,
} from "./types.ts";
import { renderDashboard } from "./dashboard.ts";
import {
  populateEvidenceDropdowns,
  applyStoredBookmarkFlags,
  renderEvidenceList,
} from "./evidence.ts";
import { populateTimelineDropdowns, renderTimeline } from "./timeline.ts";
import { populateHypothesisDropdowns } from "./workspace.ts";
import { renderPeople } from "./peoplelocations.ts";

// ---------------------------------------------------------------------
// LOADING OVERLAY
// ---------------------------------------------------------------------

const showLoadingOverlay = (msg: string): void => {
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

// The type parameter is a promise, not a guarantee: TypeScript cannot check what the JSON file
// actually contains at runtime. Callers must normalise anything the file may get wrong.
const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  return (await res.json()) as T;
};

// evidence.json mixes casings ("Reviewed", "Unknown", "Test-Report"). The app already compared
// everything with toLowerCase(); now that status/relevance are union types we decide once, here:
// lowercase is the canonical form.
type RawEvidence = Omit<Evidence, "type" | "status" | "relevance"> & {
  type: string;
  status: string;
  relevance: string;
};

const normalizeEvidence = (raw: RawEvidence): Evidence => ({
  ...raw,
  type: raw.type.toLowerCase(),
  status: raw.status.toLowerCase() as EvidenceStatus,
  relevance: raw.relevance.toLowerCase() as EvidenceRelevance,
});

// Sequential on purpose (parallelising is a later exercise): each file is only requested
// after the previous one has been fetched and parsed.
const loadCorePeopleAndLocations = async () => {
  state.caseData = await fetchJson<CaseData>("data/case.json");
  state.allPeople = await fetchJson<Person[]>("data/people.json");
  state.allLocations = await fetchJson<Location[]>("data/locations.json");

  hideLoadingStep();
  renderDashboard();
  populateAllDropdowns();
};

const loadEvidenceData = async () => {
  try {
    const raw = await fetchJson<RawEvidence[]>("data/evidence.json");
    state.allEvidence = raw.map(normalizeEvidence);
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
    state.allTimeline = await fetchJson<TimelineEvent[]>("data/timeline.json");
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

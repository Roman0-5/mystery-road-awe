// Single shared, mutable application state.
// ES module bindings are read-only for importers (`allEvidence = []` in another module throws),
// so the state lives on one exported object whose *properties* any module may change.
export const state = {
  allEvidence: [],
  filteredEvidence: [],
  selectedEvidence: null,
  bookmarks: [],
  currentPage: "dashboard",

  allPeople: [],
  allLocations: [],
  allTimeline: [],
  caseData: {},

  currentPeopleTab: "people",
  loadingStepsRemaining: 2,
  evidenceViewLoading: true,

  viewRendered: {
    evidence: false,
    timeline: false,
  },

  notesStore: {},
};

export const STORAGE_KEY_BOOKMARKS = "remotion_bookmarks";
export const STORAGE_KEY_NOTES = "remotion_notes";
export const STORAGE_KEY_HYPOTHESIS = "remotion_hypothesis";

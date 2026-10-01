import type { Evidence, Person, Location, TimelineEvent, PeopleTab } from "./types.ts";

interface AppState {
  allEvidence: Evidence[];
  filteredEvidence: Evidence[];
  selectedEvidence: Evidence | null;
  bookmarks: string[]; // prüfen: Ids oder Objekte?
  currentPage: string;

  allPeople: Person[];
  allLocations: Location[];
  allTimeline: TimelineEvent[];
  caseData: Record<string, unknown>; // Platzhalter, in Demo 6 echtes Interface

  currentPeopleTab: PeopleTab;
  loadingStepsRemaining: number;
  evidenceViewLoading: boolean;

  viewRendered: { evidence: boolean; timeline: boolean };
  notesStore: Record<string, string>;
}

export const state: AppState = {
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

  viewRendered: { evidence: false, timeline: false },
  notesStore: {},
};

export const STORAGE_KEY_BOOKMARKS = "remotion_bookmarks";
export const STORAGE_KEY_NOTES = "remotion_notes";
export const STORAGE_KEY_HYPOTHESIS = "remotion_hypothesis";
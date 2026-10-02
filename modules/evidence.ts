import { state } from "./state.ts";
import type { Evidence, EvidenceRelevance, EvidenceStatus } from "./types.ts";
import {
  findEvidenceById,
  findPersonById,
  findLocationById,
  evidenceMentionsPerson,
  formatDate,
  getStatusBadgeClass,
  getRelevanceBadgeClass,
  escapeHtml,
  fillSelect,
  getEl,
} from "./utils.ts";
import {
  saveBookmarksToStorage,
  saveNoteForEvidence,
  loadNoteForEvidence,
} from "./storage.ts";

// ---------------------------------------------------------------------
// FILTERING, SORTING & LIST
// ---------------------------------------------------------------------

export const populateEvidenceDropdowns = (): void => {
  const typeSelect = document.getElementById("filterType");
  const personSelect = document.getElementById("filterPerson");
  const locationSelect = document.getElementById("filterLocation");
  if (
    !(typeSelect instanceof HTMLSelectElement) ||
    !(personSelect instanceof HTMLSelectElement) ||
    !(locationSelect instanceof HTMLSelectElement)
  )
    return;

  const types = [...new Set(state.allEvidence.map((ev) => ev.type))];
  fillSelect(
    typeSelect,
    "All types",
    types.map((t) => ({ value: t, label: t })),
  );
  fillSelect(
    personSelect,
    "All people",
    state.allPeople.map((p) => ({ value: p.id, label: p.name })),
  );
  fillSelect(
    locationSelect,
    "All locations",
    state.allLocations.map((l) => ({
      value: l.id,
      label: l.id + " - " + l.name,
    })),
  );
};

const timeOf = (ev: Evidence): number => new Date(ev.timestamp).getTime();

const sortEvidence = (items: Evidence[], sortValue: string): Evidence[] => {
  if (sortValue === "title-asc")
    return items.sort((a, b) => a.title.localeCompare(b.title));
  if (sortValue === "title-desc")
    return items.sort((a, b) => b.title.localeCompare(a.title));
  if (sortValue === "date-asc")
    return items.sort((a, b) => timeOf(a) - timeOf(b));
  return items.sort((a, b) => timeOf(b) - timeOf(a));
};

const getFilteredEvidence = (): Evidence[] => {
  const searchTerm = getEl("evidenceSearch", HTMLInputElement)
    .value.toLowerCase()
    .trim();
  const typeVal = getEl("filterType", HTMLSelectElement).value;
  const personVal = getEl("filterPerson", HTMLSelectElement).value;
  const locationVal = getEl("filterLocation", HTMLSelectElement).value;
  const statusVal = getEl("filterStatus", HTMLSelectElement).value;
  const relevanceVal = getEl("filterRelevance", HTMLSelectElement).value;
  const sortValue = getEl("sortEvidence", HTMLSelectElement).value;

  const person = personVal ? findPersonById(personVal) : null;

  // .filter() returns a NEW array, so sorting it below can never reorder state.allEvidence.
  const results = state.allEvidence.filter((item) => {
    if (searchTerm) {
      const haystack = (
        item.title +
        " " +
        item.summary +
        " " +
        item.tags.join(" ")
      ).toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    if (typeVal && item.type !== typeVal) return false;
    if (personVal && (!person || !evidenceMentionsPerson(item, person)))
      return false;
    if (locationVal && !item.locationIds.includes(locationVal)) return false;
    if (statusVal && item.status !== statusVal) return false;
    if (relevanceVal && item.relevance !== relevanceVal) return false;
    return true;
  });

  state.filteredEvidence = sortEvidence(results, sortValue);
  return state.filteredEvidence;
};

export function renderEvidenceList(): void {
  const container = document.getElementById("evidenceList");
  if (!container) return;

  const loadingIndicator = document.getElementById("evidenceLoadingIndicator");
  if (state.evidenceViewLoading) {
    if (loadingIndicator) loadingIndicator.classList.remove("hidden");
    container.innerHTML = "";
    return;
  }
  if (loadingIndicator) loadingIndicator.classList.add("hidden");

  const results = getFilteredEvidence();

  let html = "";
  if (results.length === 0) {
    html = "<p>No evidence matches the current filters.</p>";
  }
  results.forEach((ev) => {
    html += renderEvidenceCardHTML(ev);
  });
  container.innerHTML = html;
}

const renderEvidenceCardHTML = (ev: Evidence): string => {
  const isBookmarked = state.bookmarks.includes(ev.id);
  let html = '<div class="evidence-card" data-id="' + ev.id + '">';
  html +=
    '<button class="bookmark-btn ' +
    (isBookmarked ? "active" : "") +
    '" data-action="bookmark" data-id="' +
    ev.id +
    '" aria-label="Toggle bookmark for ' +
    ev.title +
    '"><span class="bookmark-icon">' +
    (isBookmarked ? "★" : "☆") +
    "</span></button>";
  html += "<h3>" + ev.title + "</h3>";
  html +=
    '<div class="evidence-meta">' +
    ev.id +
    " &middot; " +
    ev.type +
    " &middot; " +
    formatDate(ev.timestamp) +
    "</div>";
  html += '<div class="evidence-summary">' + ev.summary + "</div>";

  if (ev.tags.includes("critical")) {
    html += '<span class="badge badge-critical">Critical</span>';
  }
  html +=
    '<span class="badge ' +
    getStatusBadgeClass(ev.status) +
    '">' +
    ev.status +
    "</span>";
  html +=
    '<span class="badge ' +
    getRelevanceBadgeClass(ev.relevance) +
    '">' +
    ev.relevance +
    "</span>";
  html += "<div>";
  ev.tags.forEach((tag) => {
    html += '<span class="tag-chip">' + tag + "</span>";
  });
  html += "</div>";
  html += "</div>";
  return html;
};

// Registered ONCE on #evidenceList (see app.ts): event delegation for card clicks / bookmark button.
export const handleEvidenceListClick = (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return;
  // closest(): the click may land on the <span> star inside the button, not on the button itself.
  const bookmarkBtn = event.target.closest<HTMLElement>(
    '[data-action="bookmark"]',
  );
  if (bookmarkBtn) {
    event.stopPropagation();
    handleBookmarkClick(bookmarkBtn.dataset.id ?? "");
    return;
  }

  const card = event.target.closest<HTMLElement>(".evidence-card");
  if (card) {
    openEvidenceDetail(card.dataset.id ?? "");
  }
};

const handleBookmarkClick = (evidenceId: string): void => {
  const ev = findEvidenceById(evidenceId);
  if (!ev) return;

  if (!state.bookmarks.includes(evidenceId)) {
    state.bookmarks.push(evidenceId);
    ev.bookmarked = true;
  } else {
    state.bookmarks = state.bookmarks.filter((id) => id !== evidenceId);
    ev.bookmarked = false;
  }
  saveBookmarksToStorage();
  if (state.currentPage === "evidence") renderEvidenceList();
};

export const applyStoredBookmarkFlags = (): void => {
  state.allEvidence.forEach((ev) => {
    ev.bookmarked = state.bookmarks.includes(ev.id);
  });
};

export const clearFilters = (): void => {
  getEl("evidenceSearch", HTMLInputElement).value = "";
  getEl("filterType", HTMLSelectElement).value = "";
  getEl("filterPerson", HTMLSelectElement).value = "";
  getEl("filterLocation", HTMLSelectElement).value = "";
  getEl("filterStatus", HTMLSelectElement).value = "";
  getEl("filterRelevance", HTMLSelectElement).value = "";
  renderEvidenceList();
};

const simulateAsyncSearch = (term: string): Promise<string> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(term), 300);
  });

let latestSearchRequestId = 0;

export const handleSearchInput = async (event: Event): Promise<void> => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const requestId = ++latestSearchRequestId;

  await simulateAsyncSearch(event.target.value);

  // Only apply this response if nothing newer has been typed meanwhile.
  if (requestId !== latestSearchRequestId) return;
  renderEvidenceList();
};

// ---------------------------------------------------------------------
// EVIDENCE DETAIL
// ---------------------------------------------------------------------

export const openEvidenceDetail = (evidenceId: string): void => {
  const ev = findEvidenceById(evidenceId);
  if (!ev) return;
  state.selectedEvidence = ev;

  const section = getEl("evidenceDetailSection");
  section.classList.remove("hidden");

  renderEvidenceDetail(ev);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
};

const closeEvidenceDetail = (): void => {
  const section = getEl("evidenceDetailSection");
  section.classList.add("hidden");
  section.innerHTML = "";
  state.selectedEvidence = null;
};

// Registered ONCE on #evidenceDetailSection (see app.ts); replaces the inline onclick="" attributes,
// which cannot see module-scoped functions.
export const handleDetailClick = (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return;
  const actionEl = event.target.closest<HTMLElement>("[data-action]");
  if (!actionEl) return;
  if (actionEl.dataset.action === "close-detail") closeEvidenceDetail();
  if (actionEl.dataset.action === "save-note") saveCurrentNote();
};

const renderEvidenceDetail = (ev: Evidence): void => {
  const section = getEl("evidenceDetailSection");

  const personNames = ev.personIds.map((id) => {
    const person = findPersonById(id);
    return person ? person.name : id;
  });

  const locationNames = ev.locationIds.map((id) => {
    const loc = findLocationById(id);
    return loc ? loc.id + " - " + loc.name : id;
  });

  const tagsHtml = ev.tags
    .map((tag) => '<span class="tag-chip">' + tag + "</span>")
    .join("");

  const storedNote = escapeHtml(loadNoteForEvidence(ev.id));

  let html = "";
  html += '<div class="evidence-detail-header">';
  html += "<div><h2>" + ev.title + "</h2>";
  html +=
    '<div class="evidence-meta">' +
    ev.id +
    " &middot; " +
    ev.type +
    " &middot; " +
    formatDate(ev.timestamp) +
    "</div></div>";
  html +=
    '<button type="button" class="btn btn-secondary btn-small" data-action="close-detail">Close</button>';
  html += "</div>";

  if (ev.tags.includes("critical")) {
    html +=
      '<div class="warning-banner">This item is tagged as critical evidence.</div>';
  }

  html +=
    '<div class="detail-field"><strong>Summary</strong>' +
    ev.summary +
    "</div>";
  html += '<div class="evidence-detail-content">' + ev.content + "</div>";
  html +=
    '<div class="detail-field"><strong>Related people</strong>' +
    personNames.join(", ") +
    "</div>";
  html +=
    '<div class="detail-field"><strong>Related locations</strong>' +
    locationNames.join(", ") +
    "</div>";
  html +=
    '<div class="detail-field"><strong>Tags</strong>' + tagsHtml + "</div>";

  html += '<div class="detail-field"><strong>Review status</strong>';
  html += '<select id="detailStatusSelect">';
  html += statusOptionHTML(ev.status, "unreviewed", "Unreviewed");
  html += statusOptionHTML(ev.status, "reviewed", "Reviewed");
  html += statusOptionHTML(ev.status, "flagged", "Flagged");
  html += "</select></div>";

  html += '<div class="detail-field"><strong>Relevance</strong>';
  html += '<select id="detailRelevanceSelect">';
  html += statusOptionHTML(ev.relevance, "unknown", "Unknown");
  html += statusOptionHTML(ev.relevance, "relevant", "Relevant");
  html += statusOptionHTML(ev.relevance, "irrelevant", "Irrelevant");
  html += "</select></div>";

  html += '<div class="detail-field"><strong>Investigator note</strong>';
  html +=
    '<textarea id="evidenceNoteInput" class="note-textarea" rows="3" data-evidence-id="' +
    ev.id +
    '" placeholder="Add a private note about this evidence...">' +
    storedNote +
    "</textarea>";
  html +=
    '<button type="button" class="btn btn-primary btn-small" style="margin-top:6px;" data-action="save-note">Save note</button>';
  html += "</div>";

  html +=
    '<div class="detail-field"><strong>Note preview</strong><div id="notePreview">' +
    storedNote +
    "</div></div>";

  section.innerHTML = html;

  const statusSelect = getEl("detailStatusSelect", HTMLSelectElement);
  statusSelect.addEventListener("change", () => {
    // The <option> values are exactly the EvidenceStatus values (see statusOptionHTML).
    ev.status = statusSelect.value as EvidenceStatus; // direct mutation of the loaded evidence object
    renderEvidenceDetail(ev);
    if (state.viewRendered.evidence) renderEvidenceList();
  });
  const relevanceSelect = getEl("detailRelevanceSelect", HTMLSelectElement);
  relevanceSelect.addEventListener("change", () => {
    ev.relevance = relevanceSelect.value as EvidenceRelevance;
    renderEvidenceDetail(ev);
    if (state.viewRendered.evidence) renderEvidenceList();
  });
};

const statusOptionHTML = (
  current: string,
  value: string,
  label: string,
): string => {
  const selected = current === value ? " selected" : "";
  return '<option value="' + value + '"' + selected + ">" + label + "</option>";
};

const saveCurrentNote = (): void => {
  const textarea = document.getElementById("evidenceNoteInput");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const evidenceId = textarea.dataset.evidenceId; // note id is read back off the DOM
  if (!evidenceId) return;
  const text = textarea.value;
  saveNoteForEvidence(evidenceId, text);
  const preview = document.getElementById("notePreview");
  if (preview) preview.innerHTML = escapeHtml(text);
};

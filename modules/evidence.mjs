import { state } from "./state.ts";
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
} from "./utils.ts";
import {
  saveBookmarksToStorage,
  saveNoteForEvidence,
  loadNoteForEvidence,
} from "./storage.ts";

// ---------------------------------------------------------------------
// FILTERING, SORTING & LIST
// ---------------------------------------------------------------------

export const populateEvidenceDropdowns = () => {
  const typeSelect = document.getElementById("filterType");
  const personSelect = document.getElementById("filterPerson");
  const locationSelect = document.getElementById("filterLocation");
  if (!typeSelect || !personSelect || !locationSelect) return;

  const types = [
    ...new Set(state.allEvidence.map((ev) => ev.type.toLowerCase())),
  ];
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

const sortEvidence = (items, sortValue) => {
  if (sortValue === "title-asc")
    return items.sort((a, b) => a.title.localeCompare(b.title));
  if (sortValue === "title-desc")
    return items.sort((a, b) => b.title.localeCompare(a.title));
  if (sortValue === "date-asc")
    return items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const getFilteredEvidence = () => {
  const searchBox = document.getElementById("evidenceSearch");
  const searchTerm = searchBox ? searchBox.value.toLowerCase().trim() : "";
  const typeVal = document.getElementById("filterType").value;
  const personVal = document.getElementById("filterPerson").value;
  const locationVal = document.getElementById("filterLocation").value;
  const statusVal = document.getElementById("filterStatus").value;
  const relevanceVal = document.getElementById("filterRelevance").value;
  const sortValue = document.getElementById("sortEvidence").value;

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
    if (typeVal && item.type.toLowerCase() !== typeVal) return false;
    if (personVal && (!person || !evidenceMentionsPerson(item, person)))
      return false;
    if (locationVal && !item.locationIds.includes(locationVal)) return false;
    if (statusVal && (item.status || "").toLowerCase() !== statusVal)
      return false;
    if (relevanceVal && (item.relevance || "").toLowerCase() !== relevanceVal)
      return false;
    return true;
  });

  state.filteredEvidence = sortEvidence(results, sortValue);
  return state.filteredEvidence;
};

export function renderEvidenceList() {
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

const renderEvidenceCardHTML = (ev) => {
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

// Registered ONCE on #evidenceList (see app.js): event delegation for card clicks / bookmark button.
export const handleEvidenceListClick = (event) => {
  // closest(): the click may land on the <span> star inside the button, not on the button itself.
  const bookmarkBtn = event.target.closest('[data-action="bookmark"]');
  if (bookmarkBtn) {
    event.stopPropagation();
    handleBookmarkClick(bookmarkBtn.dataset.id);
    return;
  }

  const card = event.target.closest(".evidence-card");
  if (card) {
    openEvidenceDetail(card.getAttribute("data-id"));
  }
};

const handleBookmarkClick = (evidenceId) => {
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

export const applyStoredBookmarkFlags = () => {
  state.allEvidence.forEach((ev) => {
    ev.bookmarked = state.bookmarks.includes(ev.id);
  });
};

export const clearFilters = () => {
  document.getElementById("evidenceSearch").value = "";
  document.getElementById("filterType").value = "";
  document.getElementById("filterPerson").value = "";
  document.getElementById("filterLocation").value = "";
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterRelevance").value = "";
  renderEvidenceList();
};

const simulateAsyncSearch = (term) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(term), 300);
  });

let latestSearchRequestId = 0;

export const handleSearchInput = async (event) => {
  const requestId = ++latestSearchRequestId;

  await simulateAsyncSearch(event.target.value);

  // Only apply this response if nothing newer has been typed meanwhile.
  if (requestId !== latestSearchRequestId) return;
  renderEvidenceList();
};

// ---------------------------------------------------------------------
// EVIDENCE DETAIL
// ---------------------------------------------------------------------

export const openEvidenceDetail = (evidenceId) => {
  const ev = findEvidenceById(evidenceId);
  if (!ev) return;
  state.selectedEvidence = ev;

  const section = document.getElementById("evidenceDetailSection");
  section.classList.remove("hidden");

  renderEvidenceDetail(ev);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
};

const closeEvidenceDetail = () => {
  const section = document.getElementById("evidenceDetailSection");
  section.classList.add("hidden");
  section.innerHTML = "";
  state.selectedEvidence = null;
};

// Registered ONCE on #evidenceDetailSection (see app.js); replaces the inline onclick="" attributes,
// which cannot see module-scoped functions.
export const handleDetailClick = (event) => {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  if (actionEl.dataset.action === "close-detail") closeEvidenceDetail();
  if (actionEl.dataset.action === "save-note") saveCurrentNote();
};

const renderEvidenceDetail = (ev) => {
  const section = document.getElementById("evidenceDetailSection");

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

  document
    .getElementById("detailStatusSelect")
    .addEventListener("change", (e) => {
      ev.status = e.target.value; // direct mutation of the loaded evidence object
      renderEvidenceDetail(ev);
      if (state.viewRendered.evidence) renderEvidenceList();
    });
  document
    .getElementById("detailRelevanceSelect")
    .addEventListener("change", (e) => {
      ev.relevance = e.target.value;
      renderEvidenceDetail(ev);
      if (state.viewRendered.evidence) renderEvidenceList();
    });
};

const statusOptionHTML = (current, value, label) => {
  const selected = (current || "").toLowerCase() === value ? " selected" : "";
  return '<option value="' + value + '"' + selected + ">" + label + "</option>";
};

const saveCurrentNote = () => {
  const textarea = document.getElementById("evidenceNoteInput");
  if (!textarea) return;
  const evidenceId = textarea.getAttribute("data-evidence-id"); // note id is read back off the DOM
  const text = textarea.value;
  saveNoteForEvidence(evidenceId, text);
  const preview = document.getElementById("notePreview");
  if (preview) preview.innerHTML = escapeHtml(text);
};

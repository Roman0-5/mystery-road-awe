import { state, STORAGE_KEY_HYPOTHESIS } from "./state.ts";
import { escapeHtml, fillSelect } from "./utils.ts";
import { navigateTo } from "./navigation.mjs";
import { openEvidenceDetail } from "./evidence.mjs";

export function renderWorkspace() {
  renderBookmarksList();
  renderNotesList();
  populateHypothesisDropdowns();
  loadHypothesisFromStorage();
}

const renderBookmarksList = () => {
  const container = document.getElementById("bookmarksList");
  if (!container) return;

  const bookmarkedItems = state.allEvidence.filter((ev) => ev.bookmarked);

  if (bookmarkedItems.length === 0) {
    container.innerHTML =
      "<p>No bookmarked evidence yet. Bookmark items from the Evidence view.</p>";
    return;
  }

  let html = "";
  bookmarkedItems.forEach((ev) => {
    html +=
      '<div class="mini-list-item"><strong>' +
      ev.id +
      "</strong> &mdash; " +
      ev.title +
      ' <button type="button" class="btn btn-small btn-secondary" data-open-evidence="' +
      ev.id +
      '">Open</button></div>';
  });
  container.innerHTML = html;

  container.querySelectorAll("[data-open-evidence]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      navigateTo("evidence");
      const id = e.target.getAttribute("data-open-evidence");
      setTimeout(() => {
        openEvidenceDetail(id);
      }, 0);
    });
  });
};

const renderNotesList = () => {
  const container = document.getElementById("notesList");
  if (!container) return;

  const noteEntries = state.allEvidence
    .map((ev, index) => ({
      index,
      evidenceId: ev.id,
      title: ev.title,
      text: state.notesStore[ev.id],
    }))
    .filter((entry) => entry.text);

  if (noteEntries.length === 0) {
    container.innerHTML =
      "<p>No notes yet. Add one from an evidence item's detail view.</p>";
    return;
  }

  let html = "";
  noteEntries.forEach((entry) => {
    html +=
      '<div class="mini-list-item"><strong>' +
      entry.evidenceId +
      "</strong> &mdash; " +
      entry.title;
    html +=
      '<div id="noteText-' +
      entry.index +
      '">' +
      escapeHtml(entry.text) +
      "</div></div>";
  });
  container.innerHTML = html;
};

export const populateHypothesisDropdowns = () => {
  const suspectSelect = document.getElementById("hypSuspect");
  const evidenceSelect = document.getElementById("hypEvidence");
  if (!suspectSelect || !evidenceSelect) return;

  fillSelect(
    suspectSelect,
    "Select a person…",
    state.allPeople.map((p) => ({ value: p.id, label: p.name })),
  );

  evidenceSelect.innerHTML = "";
  state.allEvidence.forEach((ev) => {
    evidenceSelect.add(new Option(ev.id + " - " + ev.title, ev.id));
  });
};

export const saveHypothesis = () => {
  const draft = {
    suspectId: document.getElementById("hypSuspect").value,
    nature: document.getElementById("hypNature").value,
    evidenceIds: getSelectedOptions(document.getElementById("hypEvidence")),
    confidence: document.getElementById("hypConfidence").value,
    explanation: document.getElementById("hypExplanation").value,
    alternative: document.getElementById("hypAlternative").value,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_HYPOTHESIS, JSON.stringify(draft));
  } catch (err) {
    console.error("Could not save hypothesis draft", err);
    alert("Your hypothesis could not be saved to local storage.");
    return;
  }

  const msg = document.getElementById("hypothesisSavedMsg");
  msg.classList.remove("hidden");
  setTimeout(() => {
    msg.classList.add("hidden");
  }, 2000);
};

const getSelectedOptions = (selectEl) =>
  [...selectEl.options]
    .filter((option) => option.selected)
    .map((option) => option.value);

const readHypothesisFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HYPOTHESIS);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    console.warn("Could not read stored hypothesis draft, ignoring it", err);
    return null;
  }
};

const loadHypothesisFromStorage = () => {
  const draft = readHypothesisFromStorage();
  if (!draft) return;

  document.getElementById("hypSuspect").value = draft.suspectId || "";
  document.getElementById("hypNature").value = draft.nature || "";
  document.getElementById("hypConfidence").value = draft.confidence || 50;
  document.getElementById("hypConfidenceValue").textContent =
    draft.confidence || 50;
  document.getElementById("hypExplanation").value = draft.explanation || "";
  document.getElementById("hypAlternative").value = draft.alternative || "";

  const savedIds = Array.isArray(draft.evidenceIds) ? draft.evidenceIds : [];
  [...document.getElementById("hypEvidence").options].forEach((option) => {
    option.selected = savedIds.includes(option.value);
  });
};

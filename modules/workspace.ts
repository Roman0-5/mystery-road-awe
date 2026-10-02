import { state, STORAGE_KEY_HYPOTHESIS } from "./state.ts";
import { escapeHtml, fillSelect, getEl } from "./utils.ts";
import { navigateTo } from "./navigation.ts";
import { openEvidenceDetail } from "./evidence.ts";

interface HypothesisDraft {
  suspectId: string;
  nature: string;
  evidenceIds: string[];
  confidence: string; // value of an <input type="range">, which is always a string
  explanation: string;
  alternative: string;
  savedAt?: string;
}

export function renderWorkspace(): void {
  renderBookmarksList();
  renderNotesList();
  populateHypothesisDropdowns();
  loadHypothesisFromStorage();
}

const renderBookmarksList = (): void => {
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
      if (!(e.target instanceof HTMLElement)) return;
      navigateTo("evidence");
      const id = e.target.dataset.openEvidence ?? "";
      setTimeout(() => {
        openEvidenceDetail(id);
      }, 0);
    });
  });
};

const renderNotesList = (): void => {
  const container = document.getElementById("notesList");
  if (!container) return;

  // notesStore[id] is string | undefined (noUncheckedIndexedAccess), so flatMap both looks the
  // note up and drops evidence without a (non-empty) note, leaving a plain string.
  const noteEntries = state.allEvidence.flatMap((ev, index) => {
    const text = state.notesStore[ev.id];
    return text ? [{ index, evidenceId: ev.id, title: ev.title, text }] : [];
  });

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

export const populateHypothesisDropdowns = (): void => {
  const suspectSelect = document.getElementById("hypSuspect");
  const evidenceSelect = document.getElementById("hypEvidence");
  if (
    !(suspectSelect instanceof HTMLSelectElement) ||
    !(evidenceSelect instanceof HTMLSelectElement)
  )
    return;

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

export const saveHypothesis = (): void => {
  const draft: HypothesisDraft = {
    suspectId: getEl("hypSuspect", HTMLSelectElement).value,
    nature: getEl("hypNature", HTMLSelectElement).value,
    evidenceIds: getSelectedOptions(getEl("hypEvidence", HTMLSelectElement)),
    confidence: getEl("hypConfidence", HTMLInputElement).value,
    explanation: getEl("hypExplanation", HTMLTextAreaElement).value,
    alternative: getEl("hypAlternative", HTMLTextAreaElement).value,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_HYPOTHESIS, JSON.stringify(draft));
  } catch (err) {
    console.error("Could not save hypothesis draft", err);
    alert("Your hypothesis could not be saved to local storage.");
    return;
  }

  const msg = getEl("hypothesisSavedMsg");
  msg.classList.remove("hidden");
  setTimeout(() => {
    msg.classList.add("hidden");
  }, 2000);
};

const getSelectedOptions = (selectEl: HTMLSelectElement): string[] =>
  [...selectEl.options]
    .filter((option) => option.selected)
    .map((option) => option.value);

// localStorage content is untrusted (old version, hand-edited), so every field is checked
// instead of the whole object being cast to HypothesisDraft.
const readHypothesisFromStorage = (): Partial<HypothesisDraft> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HYPOTHESIS);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    const str = (v: unknown): string | undefined =>
      typeof v === "string" ? v : undefined;
    return {
      suspectId: str(rec.suspectId),
      nature: str(rec.nature),
      confidence: str(rec.confidence),
      explanation: str(rec.explanation),
      alternative: str(rec.alternative),
      evidenceIds: Array.isArray(rec.evidenceIds)
        ? rec.evidenceIds.filter((x): x is string => typeof x === "string")
        : undefined,
    };
  } catch (err) {
    console.warn("Could not read stored hypothesis draft, ignoring it", err);
    return null;
  }
};

const loadHypothesisFromStorage = (): void => {
  const draft = readHypothesisFromStorage();
  if (!draft) return;

  const confidence = draft.confidence ?? "50";
  getEl("hypSuspect", HTMLSelectElement).value = draft.suspectId ?? "";
  getEl("hypNature", HTMLSelectElement).value = draft.nature ?? "";
  getEl("hypConfidence", HTMLInputElement).value = confidence;
  getEl("hypConfidenceValue").textContent = confidence;
  getEl("hypExplanation", HTMLTextAreaElement).value = draft.explanation ?? "";
  getEl("hypAlternative", HTMLTextAreaElement).value = draft.alternative ?? "";

  const savedIds = draft.evidenceIds ?? [];
  [...getEl("hypEvidence", HTMLSelectElement).options].forEach((option) => {
    option.selected = savedIds.includes(option.value);
  });
};

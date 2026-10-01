import { state, STORAGE_KEY_BOOKMARKS, STORAGE_KEY_NOTES } from "./state.mjs";

export const saveBookmarksToStorage = () => {
  localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(state.bookmarks));
};

export const loadBookmarksFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    const parsed = raw ? JSON.parse(raw) : [];
    state.bookmarks = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read stored bookmarks, starting empty", err);
    state.bookmarks = [];
  }
};

export const saveNoteForEvidence = (evidenceId, text) => {
  state.notesStore[evidenceId] = text;
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(state.notesStore));
};

export const loadNoteForEvidence = (evidenceId) => state.notesStore[evidenceId] || "";

export const loadNotesFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    const parsed = raw ? JSON.parse(raw) : {};
    state.notesStore = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.warn("Could not read stored notes, starting empty", err);
    state.notesStore = {};
  }
};

export const loadNoteAsync = async (evidenceId) => state.notesStore[evidenceId] || "";

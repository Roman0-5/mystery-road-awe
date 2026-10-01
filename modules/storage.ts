import { state, STORAGE_KEY_BOOKMARKS, STORAGE_KEY_NOTES } from "./state.ts";

export const saveBookmarksToStorage = (): void => {
  localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(state.bookmarks));
};

export const loadBookmarksFromStorage = (): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    state.bookmarks = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch (err) {
    console.warn("Could not read stored bookmarks, starting empty", err);
    state.bookmarks = [];
  }
};

export const saveNoteForEvidence = (evidenceId: string, text: string): void => {
  state.notesStore[evidenceId] = text;
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(state.notesStore));
};

export const loadNoteForEvidence = (evidenceId: string): string =>
  state.notesStore[evidenceId] ?? "";

export const loadNotesFromStorage = (): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const notes: Record<string, string> = {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") notes[key] = value;
      }
    }
    state.notesStore = notes;
  } catch (err) {
    console.warn("Could not read stored notes, starting empty", err);
    state.notesStore = {};
  }
};

export const loadNoteAsync = (evidenceId: string): Promise<string> =>
  Promise.resolve(state.notesStore[evidenceId] ?? "");
import type { Evidence, Person, Location } from "./types.ts";
import { state } from "./state.ts";

export const findEvidenceById = (id: string): Evidence | null =>
  state.allEvidence.find((ev) => ev.id === id) ?? null;
export const findPersonById = (id: string): Person | null =>
  state.allPeople.find((p) => p.id === id) ?? null;
export const findLocationById = (id: string): Location | null =>
  state.allLocations.find((l) => l.id === id) ?? null;

export const evidenceMentionsPerson = (
  ev: Evidence,
  person: Person,
): boolean => {
  if (!ev.personIds) return false;
  return ev.personIds.includes(person.id) || ev.personIds.includes(person.name);
};

export const formatDate = (ts: string | null | undefined): string => {
  if (!ts) return "Unknown date";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return (
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
};

export const getStatusBadgeClass = (
  status: string | null | undefined,
): string => {
  const s = (status ?? "").toLowerCase();
  if (s === "reviewed") return "badge-reviewed";
  if (s === "flagged") return "badge-flagged";
  return "badge-unreviewed";
};

export const getRelevanceBadgeClass = (
  relevance: string | null | undefined,
): string => {
  const r = (relevance ?? "").toLowerCase();
  if (r === "relevant") return "badge-relevant";
  return "badge-unreviewed";
};

// Escapes user-typed text (notes) before it is placed into innerHTML.
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const fillSelect = (
  select: HTMLSelectElement,
  placeholderLabel: string,
  options: { value: string; label: string }[],
): void => {
  const previous = select.value;
  select.innerHTML = "";
  select.add(new Option(placeholderLabel, ""));
  options.forEach(({ value, label }) => select.add(new Option(label, value)));
  if (options.some((o) => o.value === previous)) select.value = previous;
};

// Looks up an element by id and checks its type. Throws if it is missing or the wrong kind, so
// callers never have to deal with `null` (and we never need a `!` assertion).
export const getEl = <T extends HTMLElement = HTMLElement>(
  id: string,
  type: new () => T = HTMLElement as unknown as new () => T,
): T => {
  const el = document.getElementById(id);
  if (!(el instanceof type)) {
    throw new Error(`#${id} is missing or is not a ${type.name}`);
  }
  return el;
};

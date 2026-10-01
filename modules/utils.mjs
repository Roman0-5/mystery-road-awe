import { state } from "./state.mjs";

export const findEvidenceById = (id) =>
  state.allEvidence.find((ev) => ev.id === id) || null;
export const findPersonById = (id) =>
  state.allPeople.find((p) => p.id === id) || null;
export const findLocationById = (id) =>
  state.allLocations.find((l) => l.id === id) || null;

export const evidenceMentionsPerson = (ev, person) => {
  if (!ev.personIds) return false;
  return ev.personIds.includes(person.id) || ev.personIds.includes(person.name);
};

export const formatDate = (ts) => {
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

export const getStatusBadgeClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "reviewed") return "badge-reviewed";
  if (s === "flagged") return "badge-flagged";
  return "badge-unreviewed";
};

export const getRelevanceBadgeClass = (relevance) => {
  const r = (relevance || "").toLowerCase();
  if (r === "relevant") return "badge-relevant";
  return "badge-unreviewed";
};

// Escapes user-typed text (notes) before it is placed into innerHTML.
export const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Rebuilds a <select> from [{ value, label }] and keeps the user's current choice if it still exists.
export const fillSelect = (select, placeholderLabel, options) => {
  const previous = select.value;
  select.innerHTML = "";
  select.add(new Option(placeholderLabel, ""));
  options.forEach(({ value, label }) => select.add(new Option(label, value)));
  if (options.some((o) => o.value === previous)) select.value = previous;
};

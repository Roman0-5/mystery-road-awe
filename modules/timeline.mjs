import { state } from "./state.mjs";
import {
  findEvidenceById,
  findLocationById,
  formatDate,
  fillSelect,
} from "./utils.mjs";
import { navigateTo } from "./navigation.mjs";
import { openEvidenceDetail } from "./evidence.mjs";

export const populateTimelineDropdowns = () => {
  const personSelect = document.getElementById("timelinePersonFilter");
  const locationSelect = document.getElementById("timelineLocationFilter");
  const typeSelect = document.getElementById("timelineTypeFilter");
  if (!personSelect || !locationSelect || !typeSelect) return;

  fillSelect(
    personSelect,
    "All people",
    state.allPeople.map((p) => ({ value: p.id, label: p.name })),
  );
  fillSelect(
    locationSelect,
    "All locations",
    state.allLocations.map((l) => ({ value: l.id, label: l.id })),
  );

  const types = [...new Set(state.allTimeline.map((evt) => evt.type))];
  fillSelect(
    typeSelect,
    "All event types",
    types.map((t) => ({ value: t, label: t })),
  );
};

const certaintyBadgeClass = (certainty) => {
  if (certainty === "confirmed") return "reviewed";
  if (certainty === "contradictory") return "critical";
  if (certainty === "reported") return "flagged";
  return "unreviewed";
};

export function renderTimeline() {
  const container = document.getElementById("timelineContainer");
  if (!container) return;

  const order = document.getElementById("timelineOrder").value;
  const personFilter = document.getElementById("timelinePersonFilter").value;
  const locationFilter = document.getElementById(
    "timelineLocationFilter",
  ).value;
  const typeFilter = document.getElementById("timelineTypeFilter").value;

  const events = state.allTimeline
    .filter((evt) => {
      if (personFilter && !evt.personIds.includes(personFilter)) return false;
      if (locationFilter && !evt.locationIds.includes(locationFilter))
        return false;
      if (typeFilter && evt.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.time) - new Date(b.time);
      return order === "desc" ? -diff : diff;
    });

  let html = "";
  events.forEach((item) => {
    html += '<div class="timeline-event certainty-' + item.certainty + '">';
    html +=
      '<div class="timeline-time">' +
      formatDate(item.time) +
      '&nbsp;&middot;&nbsp;<span class="badge badge-' +
      certaintyBadgeClass(item.certainty) +
      '">' +
      item.certainty +
      "</span></div>";
    html += "<h3>" + item.title + "</h3>";
    html += "<p>" + item.description + "</p>";

    const eventLocationNames = item.locationIds.map((id) => {
      const loc = findLocationById(id);
      return loc ? loc.id + " - " + loc.name : id;
    });
    if (eventLocationNames.length > 0) {
      html +=
        '<p class="evidence-meta">Location: ' +
        eventLocationNames.join(", ") +
        "</p>";
    }

    item.evidenceIds.forEach((evidenceId) => {
      html +=
        '<button type="button" class="evidence-link-btn" data-evidence-id="' +
        evidenceId +
        '">View ' +
        evidenceId +
        "</button>";
    });
    html += "</div>";
  });
  if (events.length === 0) {
    html = "<p>No timeline events match the current filters.</p>";
  }
  container.innerHTML = html;

  container.querySelectorAll(".evidence-link-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openEvidenceModal(e.target.getAttribute("data-evidence-id"));
    });
  });
}

// --- Quick-view modal (used from the timeline) -------------------------

const handleModalClick = (e) => {
  const modal = document.getElementById("quickViewModal");
  if (
    e.target.classList.contains("modal-close-btn") ||
    e.target.classList.contains("modal-backdrop")
  ) {
    modal.innerHTML = "";
  }
  if (e.target.getAttribute && e.target.getAttribute("data-open-full")) {
    const evidenceId = e.target.getAttribute("data-open-full");
    modal.innerHTML = "";
    navigateTo("evidence");
    setTimeout(() => {
      openEvidenceDetail(evidenceId);
    }, 0);
  }
};

const openEvidenceModal = (evidenceId) => {
  const ev = findEvidenceById(evidenceId);
  if (!ev) return;

  let modal = document.getElementById("quickViewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "quickViewModal";
    document.body.appendChild(modal);
    // The modal element is created once and reused, so its listener is attached once, here.
    modal.addEventListener("click", handleModalClick);
  }

  modal.innerHTML =
    '<div class="modal-backdrop"><div class="modal-box">' +
    '<button type="button" class="modal-close-btn" aria-label="Close">&times;</button>' +
    "<h3>" +
    ev.title +
    "</h3>" +
    '<p class="evidence-meta">' +
    ev.id +
    " &middot; " +
    ev.type +
    " &middot; " +
    formatDate(ev.timestamp) +
    "</p>" +
    "<p>" +
    ev.summary +
    "</p>" +
    '<button type="button" class="btn btn-primary btn-small" data-open-full="' +
    ev.id +
    '">Open full evidence</button>' +
    "</div></div>";
};

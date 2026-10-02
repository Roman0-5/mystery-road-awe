import { state } from "./state.ts";
import { formatDate, getStatusBadgeClass } from "./utils.ts";

const statCardHTML = (value: number, label: string): string =>
  '<div class="stat-card"><div class="stat-value">' +
  value +
  '</div><div class="stat-label">' +
  label +
  "</div></div>";

export function renderDashboard(): void {
  const container = document.getElementById("dashboardContent");
  if (!container) return;

  const {
    allEvidence,
    allPeople,
    allLocations,
    allTimeline,
    bookmarks,
    caseData,
  } = state;

  // caseData is null until case.json has loaded; the dashboard is re-rendered once it arrives.
  const caseTitle = caseData?.title ?? "Case";
  const caseStatus = caseData?.status ?? "unknown";
  const caseSummary = caseData?.summary ?? "";

  const reviewedCount = allEvidence.filter(
    (ev) => ev.status === "reviewed",
  ).length;
  const progressPct =
    allEvidence.length === 0
      ? 0
      : Math.round((reviewedCount / allEvidence.length) * 100);

  let html = "";
  html += '<div class="case-summary-card">';
  html += "<h3>" + caseTitle + "</h3>";
  html +=
    '<p><span class="badge badge-flagged">' +
    caseStatus.toUpperCase() +
    "</span></p>";
  html += "<p>" + caseSummary + "</p>";
  html += "</div>";

  html += '<div class="stat-grid">';
  html += statCardHTML(allEvidence.length, "Evidence items");
  html += statCardHTML(allPeople.length, "People");
  html += statCardHTML(allLocations.length, "Locations");
  html += statCardHTML(bookmarks.length, "Bookmarked");
  html += statCardHTML(reviewedCount, "Reviewed");
  html += "</div>";

  html += '<div class="dashboard-panel">';
  html += "<h3>Review progress</h3>";
  html +=
    '<div class="progress-bar-outer"><div class="progress-bar-inner" style="width:' +
    progressPct +
    '%;"></div></div>';
  html += "<p>" + progressPct + "% of evidence reviewed</p>";
  html += "</div>";

  html += '<div class="dashboard-columns">';

  html += '<div class="dashboard-panel"><h3>Recent evidence</h3>';
  const recentEvidence = allEvidence.slice(-5).reverse();
  if (recentEvidence.length === 0) {
    html += "<p>No evidence loaded yet.</p>";
  }
  recentEvidence.forEach((ev) => {
    html +=
      '<div class="mini-list-item"><strong>' +
      ev.id +
      "</strong> &mdash; " +
      ev.title +
      ' <span class="badge ' +
      getStatusBadgeClass(ev.status) +
      '">' +
      ev.status +
      "</span></div>";
  });
  html += "</div>";

  html += '<div class="dashboard-panel"><h3>Recent timeline events</h3>';
  const recentTimeline = allTimeline.slice(-5).reverse();
  if (recentTimeline.length === 0) {
    html += "<p>No timeline events loaded yet.</p>";
  }
  recentTimeline.forEach((evt) => {
    html +=
      '<div class="mini-list-item"><strong>' +
      formatDate(evt.time) +
      "</strong><br>" +
      evt.title +
      "</div>";
  });
  html += "</div>";

  html += "</div>"; // dashboard-columns

  container.innerHTML = html;
}

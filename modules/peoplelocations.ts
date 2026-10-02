import { state } from "./state.ts";
import type { Person, PeopleTab } from "./types.ts";
import { evidenceMentionsPerson, getEl } from "./utils.ts";
import { navigateTo } from "./navigation.ts";
import { renderEvidenceList } from "./evidence.ts";

export const switchPeopleTab = (tab: PeopleTab): void => {
  state.currentPeopleTab = tab;
  const peoplePanel = getEl("peoplePanel");
  const locationsPanel = getEl("locationsPanel");
  const peopleTabBtn = getEl("tabPeopleBtn");
  const locationsTabBtn = getEl("tabLocationsBtn");

  if (tab === "people") {
    peoplePanel.classList.remove("hidden");
    locationsPanel.classList.add("hidden");
    peopleTabBtn.classList.add("active");
    locationsTabBtn.classList.remove("active");
  } else {
    peoplePanel.classList.add("hidden");
    locationsPanel.classList.remove("hidden");
    peopleTabBtn.classList.remove("active");
    locationsTabBtn.classList.add("active");
  }
};

const countEvidenceForPerson = (person: Person): number =>
  state.allEvidence.filter((ev) => evidenceMentionsPerson(ev, person)).length;

export function renderPeople(): void {
  const container = getEl("peoplePanel");
  let html = "";
  state.allPeople.forEach((person) => {
    const count = countEvidenceForPerson(person);

    html += '<div class="person-card">';
    html += '<div class="person-card-header">';
    html +=
      '<img class="person-avatar" src="' +
      person.avatar +
      '" alt="Portrait of ' +
      person.name +
      '">';
    html +=
      "<div><h3>" +
      person.name +
      '</h3><div class="person-role">' +
      person.role +
      "</div></div>";
    html += "</div>";
    html += "<p><strong>Speciality:</strong> " + person.speciality + "</p>";
    html += "<ul>";
    person.responsibilities.forEach((resp) => {
      html += "<li>" + resp + "</li>";
    });
    html += "</ul>";
    html +=
      '<div class="person-statement">&ldquo;' +
      person.statement +
      "&rdquo;</div>";
    html +=
      "<p>" +
      count +
      " related evidence item" +
      (count === 1 ? "" : "s") +
      " &mdash; ";
    html +=
      '<button type="button" class="evidence-count-link" data-person-id="' +
      person.id +
      '">view</button></p>';
    html += "</div>";
  });
  container.innerHTML = html;

  container.querySelectorAll(".evidence-count-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const personId = e.target.dataset.personId ?? "";
      getEl("filterPerson", HTMLSelectElement).value = personId;
      navigateTo("evidence");
      setTimeout(() => {
        renderEvidenceList();
      }, 0);
    });
  });
}

export function renderLocations(): void {
  const container = getEl("locationsPanel");
  let html = "";
  state.allLocations.forEach((loc) => {
    html += '<div class="location-card">';
    html += "<h3>" + loc.id + " &mdash; " + loc.name + "</h3>";
    html += "<p>" + loc.description + "</p>";
    html += "<p><strong>Contains:</strong></p><ul>";
    loc.contains.forEach((item) => {
      html += "<li>" + item + "</li>";
    });
    html += "</ul></div>";
  });
  container.innerHTML = html;
}

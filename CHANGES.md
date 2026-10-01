# CHANGES — Exercise 1 refactor

"Before" = `git show HEAD:app.js` / `git show HEAD:index.html` (the original single-file app).
Nothing is committed yet; commit whenever you like so you can diff before/after in class.
Your unfinished module split was backed up before I rewrote it (see the end of this file).

None of this has been run in a browser — please test each item yourself (repro steps are listed per bug).

---

## Demo 1 — Module split

| File | Contains | Exports (public API) |
|---|---|---|
| `app.js` (entry) | hash routing (`handleHashChange`), `setupEventListeners`, `initApp` | nothing |
| `modules/state.mjs` | the shared state object, `STORAGE_KEY_*` constants | `state`, 3 keys |
| `modules/utils.mjs` | lookups, `formatDate`, badge classes, `escapeHtml`, `fillSelect` | all helpers |
| `modules/navigation.mjs` | `navigateTo` | `navigateTo` |
| `modules/storage.mjs` | localStorage helpers for bookmarks & notes | all 6 |
| `modules/data.mjs` | fetching JSON, loading overlay, `populateAllDropdowns` | `loadAllData` only |
| `modules/dashboard.mjs` | dashboard view | `renderDashboard` (`statCardHTML` is private) |
| `modules/evidence.mjs` | evidence list, filters, sort, bookmarks, detail, notes | 9 functions; `getFilteredEvidence`, `renderEvidenceCardHTML`, `handleBookmarkClick`, `renderEvidenceDetail`, `closeEvidenceDetail`, `saveCurrentNote`, `statusOptionHTML`, `sortEvidence` are private |
| `modules/peoplelocations.mjs` | people & locations view | `renderPeople`, `renderLocations`, `switchPeopleTab` (`countEvidenceForPerson` private) |
| `modules/timeline.mjs` | timeline view + quick-view modal | `renderTimeline`, `populateTimelineDropdowns` (`openEvidenceModal`, `certaintyBadgeClass` private) |
| `modules/workspace.mjs` | workspace view + hypothesis form | `renderWorkspace`, `saveHypothesis`, `populateHypothesisDropdowns` |

Dependency direction (no import cycles): `app → data → views → evidence/navigation/storage/utils → state`.

- **Shared state:** the old top-level `var`s (`allEvidence`, `bookmarks`, …) became properties of one exported `state` object.
  An importing module cannot reassign an imported binding (`allEvidence = x` throws `TypeError: Assignment to constant variable`),
  but it can change `state.allEvidence`. That is why it is an object.
- **Named exports everywhere**, no default exports: one name per thing, and the importing side is forced to spell the same name (grep-able, refactor-safe). Modules export several functions, which suits named exports.
- **`index.html`:** `<script src="app.js">` → `<script type="module" src="app.js">`. Inline handlers (`onclick="navigateTo(...)"`, `onchange="handleSortChange()"`, `onclick="switchPeopleTab(..)"`, `onclick="saveHypothesis()"`) removed, because inline attributes can only see globals and module functions are no longer global.
  Replaced with `data-nav="…"` / ids + `addEventListener` in `app.js`. The same for the two dynamically generated buttons in the evidence detail (`onclick="closeEvidenceDetail()"`, `onclick="saveCurrentNote()"` → `data-action="close-detail"` / `"save-note"`, handled by `handleDetailClick`).
- Removed the debug-only `modalCloseListenerCount` (see bug 6) and the unused `loadNoteAsync` `new Promise` wrapper style.
- **Not a pure refactor:** I did the split, bug fixes, `let/const`, async/await and arrows in one pass, so there is no intermediate "pure split" state to diff. If you need one for class, compare against `HEAD` and use the per-bug notes below.

## Bugs fixed

### Bug 1 — mutation/reference bug (Demo 2): sorting reorders the shared data
- **Where:** `loadEvidenceData` (`filteredEvidence = allEvidence`) + `handleSortChange` (`filteredEvidence.sort(...)`).
- **Repro:** open the app, go to Evidence, pick "Title (Z–A)" in the sort dropdown, go to Dashboard → "Recent evidence" (uses `allEvidence.slice(-5)`) is now different / in the wrong order.
- **Cause:** `filteredEvidence` and `allEvidence` are the *same array* (reference, not copy) until a filter runs, and `Array.prototype.sort` sorts in place.
  Also, `renderEvidenceList` calls `getFilteredEvidence()` which rebuilds the list from `allEvidence` in its original order, so the sort had no visible effect on the list either.
- **Fix:** `state.filteredEvidence = [...state.allEvidence]` (a copy), and sorting now happens inside `getFilteredEvidence` on the fresh array `.filter()` returns, via the `#sortEvidence` value. `handleSortChange` is gone; the dropdown just calls `renderEvidenceList`.
- **Side effect:** the default order is now "newest first", matching the dropdown label (before, the list showed file order while the dropdown claimed "Newest first").

### Bug 2 — async bug (Demo 3): evidence list stuck on the loading spinner
- **Where:** `evidenceViewLoading` is set to `true` and *never* set to `false`; `renderEvidenceList` returns early while it is `true`.
- **Repro:** open Evidence → spinner forever, no cards.
- **Cause:** the `fetch("data/evidence.json")` promise resolved fine, but its `.then` never recorded that loading was over.
- **Fix:** `loadEvidenceData` (`modules/data.mjs`) sets `state.evidenceViewLoading = false` in `finally` and re-renders if the evidence page is showing.
- **Related:** `loadEvidenceData` had no `return`, so `loadAllData().then(...)` did not wait for evidence. `loadAllData` now does `await Promise.all([loadEvidenceData(), loadTimelineData()])` — the two requests still start together, exactly as before.

### Bug 3 — silent bug (Demo 4), two of them
- **3a. Nav-button loop (`setupEventListeners`):** `for (var i…) { addEventListener("click", function () { navButtons[i]… }) }`. Every closure shares one `var i`; by click time `i === navButtons.length`, so `navButtons[i]` is `undefined` → `TypeError: Cannot read properties of undefined (reading 'getAttribute')` in the console on every nav click, while the inline `onclick` still navigated, so the UI looked fine. Fix: removed the loop; one delegated document click listener navigates using `data-view` / `data-nav`.
- **3b. `console.log("First note preview:", firstNote)`** printed `Promise {<fulfilled>: ""}` because `loadNoteAsync(...)` returns a Promise and it was not awaited. Fix: `await loadNoteAsync("E01")` in `initApp`.

## More bugs found (Demo 5)

| # | Symptom / repro | Root cause | Fix |
|---|---|---|---|
| 4 | Bookmark toggling stops working / toggles several times after switching filters or navigating a few times (bookmark, change a filter 2×, click a star → toggles 3×) | `renderEvidenceList` did `container.addEventListener("click", …)` on **every render** → N identical listeners | listener registered once in `setupEventListeners` |
| 5 | Clicking exactly on the ☆ opens the detail instead of bookmarking | `target.dataset.action` checked on the clicked element, which is the inner `<span>` | `event.target.closest('[data-action="bookmark"]')` |
| 6 | Timeline → "View E0x" modal: console shows "active close listeners: 1, 2, 3…"; "Open full evidence" runs N times | a new click listener was added to the same reused `#quickViewModal` on every open | listener added once, only when the modal element is created |
| 7 | Timeline event shows `Location: [object Object]` | pushed the location *object* into the names array | push `"L02 - Name"` (same format as the evidence detail) |
| 8 | Corrupt `remotion_notes` in localStorage → app never starts (uncaught `JSON.parse` error in `initApp`); corrupt `remotion_hypothesis` breaks the Workspace | no `try/catch` (bookmarks had one) | try/catch + shape check in `loadNotesFromStorage`; `readHypothesisFromStorage` in workspace |
| 9 | `#filterStatus` re-rendered twice per change | had both `addEventListener("change")` and an `onchange` attribute set via `setAttribute` | one listener |
| 10 | `hashchange` handler ran twice per navigation | registered in `setupEventListeners` *and* at the bottom of the file | registered once |
| 11 | Dashboard "Bookmarked"/"Reviewed" numbers stale after bookmarking / changing status | dashboard was only rendered on the first visit (`viewRendered.dashboard`) | dashboard re-renders on every visit |
| 12 | With a slow connection: People cards say "0 related evidence items" forever if People was opened before evidence arrived | People rendered once, counts computed from still-empty `allEvidence` | People re-renders on every visit and after evidence loads |
| 13 | Filter dropdown selections reset when a late data load repopulated the `<select>`s | `innerHTML =` rebuilt them without restoring the value | `fillSelect` in `utils.mjs` keeps the current value |
| 14 | A note containing `</textarea>` or `<b>`/`<script>` breaks the detail view / renders as HTML | note text was concatenated into `innerHTML` unescaped | `escapeHtml` for note textarea, preview and the workspace notes list |

Still-known, **deliberately not changed** (out of scope / your call):
- If `case.json`, `people.json` or `locations.json` fails (e.g. 404), the core chain rejects, the loading overlay stays visible and nothing is rendered (`fetch` never checks `res.ok`). Original behavior kept, since Demo 7 asks how the app currently reacts.
- Status/relevance edits in the detail view mutate the in-memory object only and are lost on reload.
- Data quirk: evidence `E04` lists `"Nova Byte"` (a name) in `personIds`; the app tolerates it via `evidenceMentionsPerson`.
- Other data-driven text (titles, summaries, content) is still inserted with `innerHTML` (trusted local JSON).

## Demo 8 — globals, `var`/`let`/`const`, smells
- Original top-level `var`s: `allEvidence, filteredEvidence, selectedEvidence, bookmarks, currentPage, allPeople, allLocations, allTimeline, caseData, currentPeopleTab, loadingStepsRemaining, evidenceViewLoading, viewRendered, notesStore, modalCloseListenerCount, STORAGE_KEY_*` (+ `latestSearchRequestId` mid-file). Now: none are globals; state is in `state`, constants are `export const`, `latestSearchRequestId` is a module-private `let`.
- Every `var` → `const` (never reassigned) or `let` (`html` accumulators, loop counters, `modal`, `hash`, `latestSearchRequestId`, `state` properties are assigned as properties so the object itself is `const`). No `var` remains.
- Smells fixed: (1) `<select>` population copy-pasted 6× with string-concatenated `innerHTML +=` → `fillSelect`; (2) listener leaks/duplicates (bugs 4, 6, 9, 10); (3) manual index `for` loops for lookups/filters → `find` / `filter` / `map`; (4) inline `onclick` attributes coupling HTML to globals; (5) debug counter `modalCloseListenerCount`; (6) `viewRendered.dashboard/people/workspace` flags that were unused or wrong.

## Demo 9 — `async`/`await`
- **Deepest chain:** `loadCorePeopleAndLocations`: 3 fetches × (`fetch().then` → `res.json().then`) = 6 nested levels; each level only starts after the previous one succeeded. Now 3 sequential `await fetchJson(...)` lines (`modules/data.mjs`), still sequential.
- Also converted: `loadEvidenceData` and `loadTimelineData` (`.then/.catch/.finally` → `try/catch/finally`, same messages), `handleSearchInput` (`.then` → `await`, same "ignore stale result" check), `loadNoteAsync` (now `async`), `initApp` (`loadAllData().then(...)` → `await`).
- Behavior change on purpose: `loadAllData` awaits evidence/timeline (bug 2 note).

## Demo 10 — arrow functions
- Converted (examples): every callback passed to `addEventListener`, `.filter/.map/.sort`, `setTimeout`; and small top-level helpers `statCardHTML`, `formatDate`, `getStatusBadgeClass`, `navigateTo`, `saveHypothesis`, `handleSearchInput` (also `async`).
- Kept as `function` declarations: the view render entry points `renderDashboard`, `renderEvidenceList`, `renderPeople`, `renderLocations`, `renderTimeline`, `renderWorkspace` — they are the "main function of a module", read well as declarations, and are hoisted. Nothing in this codebase uses `this`, `arguments` or `new`, so no function was *forced* to stay a declaration. The one you would refuse to convert: an object method or a constructor, or a callback that relies on the element via `this` (`el.addEventListener("click", function () { this.classList… })`) — arrows do not bind `this` (they capture the outer one), have no `arguments`, and cannot be used with `new`.
- Proposed rule: `function` declarations for top-level named functions, arrows for callbacks and small helpers, method shorthand for object methods.

## Files touched
`app.js` (rewritten as entry point), `index.html` (script tag + inline handlers), `modules/*.mjs` (rewritten / new: `state`, `utils`, `navigation`, `storage`, `data`), `CHANGES.md` (new).

## Your earlier work
Your unfinished split (`app.js`, `index.html`, `modules/*.mjs` as they were before I started) is backed up outside the repo in the Claude scratchpad `wip-backup/` folder of this session (e.g. `…\Temp\claude\…\scratchpad\wip-backup`). As it stood it could not have run: the modules used globals (`allEvidence`, `bookmarks`, …) that no longer existed, and the data-loading code that had been moved into `peoplelocations.mjs` used `../data/...` paths (relative to the page, `data/...` is correct).

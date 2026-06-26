# Event Report — Implementation Plan

## Strategy

Build a lightweight **Event Summary** page first (80% value, 20% effort). No publish workflow, no staleness detection — just an auto-generated, always-up-to-date summary of the completed event. Can be enhanced later if needed.

Deliverable per phase: working feature + tests.

---

## Phase 1 — Data Model & Generator (Engine + Models)

### Step 1.1: Report data model
File: `js/models/report.js`

```js
Report = {
  eventId: string,
  eventName: string,
  generatedAt: number,
  appreciation: string,      // editable by admin
  closing: string,           // editable by admin
  photos: string[],          // URLs / paths
  sports: [{
    name: string,
    competitions: [{
      templateId: string,
      label: string,
      champion: string,
      runnerUp: string,
      matches: number,
      completed: number
    }],
    participants: number,
    totalMatches: number
  }],
  totals: {
    participants: number,
    competitions: number,
    sports: number,
    matches: number
  }
}
```

### Step 1.2: Report generator
File: `js/engine/reportGenerator.js`

Function: `generateEventReport(eventId)` — pure function, no DOM, no storage.

Logic:
1. Load event + templates + categories for this event
2. For each template (competition):
   - Load tournament state via `localLoad(tmpl.id)`
   - Extract champion/runnerUp from knockout final
   - Count fixtures + knockout matches
   - Count completed matches
3. Aggregate totals across all competitions
4. Return full Report object
5. Import existing appreciation/closing/photos if a report already exists (preserve edits)

### Testing: `js/test/report_test.js`
- Test generator with empty event
- Test generator with single completed competition
- Test generator with multiple competitions across sports
- Test generator preserves existing appreciation/closing/photos from previous report
- Edge: competition with no tournament state (phase === 'setup')
- Edge: competition with unstarted knockout

---

## Phase 2 — Storage

### Step 2.1: Report storage
File: `js/storage/reportStorage.js`

- `saveReport(eventId, report)` — localStorage + Supabase
- `loadReport(eventId)` — localStorage (with Supabase fallback)
- Storage key: `btm_report_<eventId>`
- Follows same pattern as tournament state

### Testing: `js/test/report_storage_test.js`
- Test save/load roundtrip (localStorage)
- Test returns null for non-existent report
- Test save/load with Supabase stub

---

## Phase 3 — UI

### Step 3.1: Report renderer
File: `js/ui/reportRenderer.js`

Function: `renderEventReport()`

Sections:
1. **Event Banner** — event name, status, sport icons
2. **Appreciation** — editable textarea for admin, display for viewer
3. **Tournament Highlights** — total participants, competitions, sports, matches
4. **Champions** — list all competitions with 🥇🥈
5. **Sport Summaries** — grouped by sport, participants + matches + champion links
6. **Photo Gallery** — existing photo upload display
7. **Closing Message** — editable textarea for admin, display for viewer

### Step 3.2: Admin controls on report
- Generate button in champion screen (admin only)
- Appreciation + closing textareas editable inline (admin only)
- Photo upload integration (reuse existing champion photo upload)
- Navigate to report from champion screen

### Step 3.3: Navigation
- Add report view to navigation (between champion and results)
- Breadcrumb: Event → Sport → Competition → Champion → Report
- Viewer access via report button on champion screen

### Testing: `js/test/report_ui_test.js`
- Test renderEventReport with mock data
- Test admin sees editable fields
- Test viewer sees text-only display
- Test photo gallery renders existing photos

---

## Phase 4 — Integration

### Step 4.1: Wire into app.js
- Import report models, engine, storage, UI
- Add `renderAll` handler for 'report' view
- Add navigation function `goToEventReport()`
- Add "View Report" button on champion screen

### Step 4.2: Wire into breadcrumb
- Add 'report' to navigation phases
- Show report link after champion

### Testing: `js/test/report_integration_test.js`
- Test full flow: generate → render → view
- Test admin vs viewer rendering
- Test navigation to/from report
- Edge: event with no completed competitions

---

## Phase 5 (Future) — Publish Workflow

Only if the lightweight version proves insufficient:

- Publish button → freezes report snapshot
- "Stale" badge when tournament data changes
- Regenerate while preserving edits
- Published = read-only for everyone (including admin)

---

## Files to Create

```
js/models/report.js
js/engine/reportGenerator.js
js/storage/reportStorage.js
js/ui/reportRenderer.js
js/test/report_test.js
js/test/report_storage_test.js
js/test/report_ui_test.js
js/test/report_integration_test.js
```

## Files to Modify

```
index.html               — add script tags, report container
css/styles.css           — add report section styles
js/ui/app.js             — navigation, saveState, renderAll
js/ui/champion.js        — add "View Report" button
```

## Test Runner

Add to `js/test/runner.js`:
```
- report_test.js
- report_storage_test.js
- report_ui_test.js
- report_integration_test.js
```

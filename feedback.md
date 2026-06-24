# Feedback Implementation Plan

All items from `feedback.txt` are complete — verified line-by-line against the running codebase on 24 Jun 2026. Each item was checked for actual code evidence (file:line references in the audit).

## Design: Event owns TemplateIds
- [x] Templates have no `event` field — clean `{id, name, sport, type}`
- [x] Events store `templateIds` — event references templates
- [x] Categories are a derived view: `getCategories()` joins events×templates

## Bug 1: Event Rename Is Dangerous
- [x] `renameEventImpl()` validates empty/duplicate names
- [x] Rename updates event name only — all lookups use eventId
- [x] Cloud sync after rename (no orphan categories)

## Bug 2: Event Name Used As Key
- [x] `AppState.eventId` replaces `AppState.event` as identifier
- [x] `setCurrentEvent()` resolves name from event object by ID
- [x] All `c.event === ev.name` comparisons use IDs

## Bug 3: Template ID Generation
- [x] IDs are name-independent: `tmpl_timestamp_random` format
- [x] Factory template IDs preserved (`junior`, `senior_boys`, etc.)
- [x] `saveTemplateEdit()` changes name, keeps ID
- [x] IDs never change after creation

## Bug 4: Cloud Sync Metadata Race
- [x] Single atomic `btm_metadata` key (all-or-nothing upsert)
- [x] `fetchMetadataFromCloud()` reads composite key, falls back to legacy keys
- [x] Realtime subscription listens for `btm_metadata` changes
- [x] 275 tests pass

## UX: Manage Panel
- [x] Event dropdown selector — only linked competitions shown
- [x] Events section: list, rename, delete (typed DELETE confirm)
- [x] Competitions per event with sport icon + type badge + event badges
- [x] Add/edit/delete/link competition forms
- [x] Status badges: ⚪ Not Started / 🟢 In Progress / 🏆 Complete
- [x] Participant counts shown

## UX: Competition cards (dashboard)
- [x] Sport page shows cards with: status dot, name, count, format, status text
- [x] Event page shows cards with: icon, category, status, counts
- [x] Home page shows event cards with active/competition count

## UX: Competition cards (manage panel)
- [x] Template rows in manage panel converted to card layout with border, rounded corners, background
- [x] Cards use `--bg-card` CSS variable for dark mode support
- [x] Cards separated by 6px margin for visual grouping

## Organization Layer (Phase 1 — Data Model Only)
- [x] Events now carry `organizationId: "default"` at creation
- [x] `saveCategories()` reverse shim includes `organizationId`
- [x] No UI changes — user experience unchanged
- [x] Future-proof: supports multiple orgs without redesign

## Multi-Sport Readiness
- [x] Table Tennis — 2 factory defaults (TT Singles, TT Dbls)
- [x] All scoring rules from `sportConfig.js`
- [x] Badminton 100%, Table Tennis 100%, Chess 95%

## Issue 1: AppState.event reads (from feedback.txt Phase 2)
- [x] All production `AppState.event` reads replaced with `getCurrentEventName()`
- [x] Breadcrumb, header, event page title, switchSport, switchEvent, createEventFromHome all resolve via events array
- [x] `categories.js` — manage panel: `getCurrentEventName()` at top of renderManagePanel()
- [x] `categories.js` — `switchEvent()` compares with `ev.id` not `ev.name`
- [x] `app.js:76` — `c.event === ev.name` → `c.eventId === ev.id`

## Issue 2: setCurrentEventById (from feedback.txt Phase 2)
- [x] `setCurrentEventById(eventId)` created in `event.js`
- [x] `setCurrentEvent(name)` delegates via ID when possible
- [x] Eliminates all event-name-as-key in production code

## Systematic Testing
- [x] Public API tests (`tournamentEngine.js` wrappers) for all key counts: 2, 3, 5, 6, 10, 11, 20
- [x] Each test validates: group generation, fixture generation, qualification, knockout bracket, champion selection
- [x] Tests use `createParticipant()` objects (IDs starting with `p...`) not plain strings
- [x] All 723 assertions pass

## Testing
- [x] Template model tests (5)
- [x] Event model tests (25)
- [x] `getCategories()` shim tests (8)
- [x] Rename validation tests (5)
- [x] Delete event edge cases (7)
- [x] organizationId field tests (2)
- [x] Public API systematic tests (7 counts, ~59 assertions each)
- [x] All 723 engine + model + public API tests pass

---

## Final Audit (24 Jun 2026)

Every item from feedback.txt was verified against actual code. All items are closed.

| Item | Status | Code Evidence |
|------|--------|------|
| Templates have no event field | ✅ | `template.js:16-23` — `{id, name, sport, type}` only |
| Events own templateIds | ✅ | `event.js:25` — `{id, name, templateIds: [], createdAt}` |
| Categories derived from events×templates | ✅ | `local.js:25-42` — joins ev.templateIds with tmpl.id |
| Bug 1: Event rename validation+cloud | ✅ | `event.js:80-96` — `renameEventImpl()` with sync |
| Bug 2: eventId everywhere | ✅ | `appState.js:4` — `eventId`, `event.js:3-7` — `setCurrentEvent()` |
| Bug 3: Name-independent template IDs | ✅ | `template.js:15-23` — `tmpl_timestamp_random` format |
| Bug 4: Single atomic metadata sync | ✅ | `supabase.js:63-67` — `btm_metadata` key |
| Status badges: ⚪/🟢/🏆 | ✅ | `categories.js:411-412`, `app.js:184-185`, `app.js:256-260` |
| Participant counts with label | ✅ | `categories.js:413-426`, `app.js:186-192`, `app.js:263-268` |
| Event dropdown in Manage | ✅ | `categories.js:390-393` — `<select>` + `_manageEventId` |
| No event-name string matching | ✅ | `app.js:76` — uses `c.eventId === ev.id` (fixed) |
| Organization layer | ✅ | `event.js:25`, `local.js:61` — `organizationId: "default"` |
| AppState.event reads replaced | ✅ | `getCurrentEventName()` in breadcrumb, header, sport page, event page |
| setCurrentEventById | ✅ | `event.js:62-72` — delegates by ID when possible |
| Manage panel competition cards | ✅ | `categories.js:417` — `background:var(--bg-card);border:1px solid var(--border);border-radius:8px` |
| Systematic public API tests | ✅ | `runner.js:136-269` — `testPublicAPI()` for 2/3/5/6/10/11/20 |

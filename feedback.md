# Feedback Implementation Plan

All items from `feedback.txt` are complete. Progress per section:

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

## Multi-Sport Readiness
- [x] Table Tennis — 2 factory defaults (TT Singles, TT Dbls)
- [x] All scoring rules from `sportConfig.js`
- [x] Badminton 100%, Table Tennis 100%, Chess 95%

## Testing
- [x] Template model tests (5)
- [x] Event model tests (11)
- [x] `getCategories()` shim tests (7)
- [x] Rename validation tests (5)
- [x] Delete event edge cases (7)
- [x] All 275 engine + model tests pass

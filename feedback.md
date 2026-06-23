# Feedback Implementation

Tracking all items from `feedback.txt`. Will work through one at a time.

## Bugs / Risks

- [x] **Bug 1 (High): `updateNavigationVisibility()`** — Renamed from `updateGlobalNavigation()`, now sole source of truth for catBar/actionBar/tournamentTabs visibility. Purged all duplicate `style.display` calls from `renderHomePage()`, `renderEventPage()`, `renderSportPage()`, `renderActionBar()`, `showResultsPage()`, `renderAll()`. One edge-case override remains (viewer "no active" screen).
- [x] **Bug 2 (Med): Login Duplicate State** — Both `onAuthStateChange()` and `login()` update `AppState.user`. Make `onAuthStateChange()` the sole source.
- [x] **Bug 3 (Med): Category Switch Race Condition** — Added `AppState.loadingCategory` guard. Set at start of `switchCategory()`, checked after `await flushCloudSave()` and `await fetchState()` to discard stale async responses on rapid switching.
- [x] **Bug 4 (Low): Viewer Role** — `AppState.user` defaults to `{ role: 'viewer' }` instead of `null`. `onAuthStateChange()` sets `{ role: 'viewer' }` when no session. `isAdmin()` still works correctly (checks `role === 'admin'`).

## Architecture

- [x] **`navigateTo(view)` (High)** — Central function setting `AppState.view + renderAll()`. Replaces repeated pattern in `goHome()`, `goToEventPage()`, `goToSportPage()`, `goToGroups()`, `goToFixtures()`, `goToKnockout()`, `viewKnockout()`, `goToFixturesFromKnockout()`, `goBackFromChampion()`, `viewChampion()`, `switchCategory()`, `resetCategory()`, `switchSport()`, `switchEvent()`, `newTournament()`, `startTournament()`, `logout()`, and viewer redirect path.
- [x] **Session Service (Med)** — Extract auth (login/logout/session/role) from `supabase.js` into `storage/auth.js`.
- [x] **App Events (Low)** — Introduce `emit('categoryChanged')`, `emit('userLoggedIn')`, etc. instead of direct function calls. `events.js` defines `on/off/emit`. `auth.js` emits `userLoggedIn`/`userLoggedOut`. `app.js` subscribes and handles rendering/banners/navigation.

## UX

- [x] **Category Status Badges (High)** — ⚪🟢🏆 on sport page cards (done)
- [x] **Participant Counts (High)** — "X Teams" / "X Players" on sport page cards (done)
- [x] **Clickable Breadcrumbs (Med)** — Every level clickable (Home › Event › Sport › Category). Added `onclick` to `bc-current` items, removed `cursor: default` CSS restriction.
- [x] **Admin/Viewer Mode Banner (Med)** — 👁 Viewer Mode / 🔧 Admin Mode banner (done)

## Testing

- [x] **Player Count Validation (High)** — 275 tests covering 2/3/5/6/10/11/20 players (done)

## Summary

| Area | Total | Done | Remaining |
|------|-------|------|-----------|
| Bugs/Risks | 4 | 4 | 0 |
| Architecture | 3 | 3 | 0 |
| UX | 4 | 4 | 0 |
| Testing | 1 | 1 | 0 |
| **Total** | **12** | **12** | **0** |

## Post-Feedback Enhancements

- [x] **Event Dropdown + Category Editing (Med)** — Replace free-text event input in Add Category form with a dropdown of existing events + "New Event…" option. Add inline edit button per category to change label, event, sport, or format without delete+recreate.
- [x] **Global Event Rename (Low)** — ✏️ button next to each event in the event bar (admin only). Updates all categories with that event name in one shot via `prompt()`.

---

## Phase 1: Event → Template → Competition (dev branch)

### Goal
Restructure from flat categories to three-layer model: Event contains Templates, Templates are reusable competition definitions (sport + type) with no event field, Competition is an Event–Template pair with its own tournament state.

### Steps

| Step | File | What |
|------|------|------|
| ✅ 1 | `js/models/template.js` | `getTemplates()`, `saveTemplates()`, `createTemplateId()` |
| ✅ 2 | `js/models/event.js` | Upgrade: `getEvents()` reads `btm_events`, `saveEvents()`, `createEvent()`, `addTemplateToEvent()`, `removeTemplateFromEvent()` |
| ✅ 3 | `js/storage/local.js` | `runMigration()` — dedup categories → templates, group by event → create events, migrate state keys. Old data preserved. |
| ✅ 4 | `js/ui/app.js` | Call `runMigration()` from `init()` after `migrateCategorySports()` |
| ✅ 5 | `js/test/edge_cases.js` | `testMigration()` — verify templates, events, state migration, dedup, idempotency |

### Notes
- Old data (`btm_categories`, `btm_state_{catId}`) is **never deleted** — preserved for rollback
- `runMigration()` is idempotent (checks `btm_migrated` flag)
- `getCategories()` still reads `btm_categories` (compatibility shim deferred to later phase)
- Rollback: remove `btm_migrated`, delete `btm_templates` and `btm_events`
- All 275 engine tests continue to pass

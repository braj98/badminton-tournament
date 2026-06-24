# AGENTS.md — badminton

Badminton Tournament Manager for local apartment tournaments. No build step, no server, no dependencies.

## Architecture

Four-layer separation:

```
js/
  engine/     — Pure business logic. No DOM, no storage. Functions take
  │             data in, return data out.
  │
  models/     — Domain types + sport configuration. Single source of truth
  │             for data structures.
  │
  storage/    — Persistence. No DOM, no business logic. localStorage +
  │             Supabase. (auth.js extracts auth concerns, events.js
  │             decouples modules)
  │
  ui/         — DOM rendering + event handling. Calls only tournamentEngine API.
```

- `engine/state.js` — `defaultState()`, `MIN_ENTRIES`, `MAX_ENTRIES`
- `engine/groups.js` — `allocateGroups()`, `determineGroupCount(playerCount, thresholds?, groupCounts?)`
- `engine/fixtures.js` — `generateFixtures()` (uses `createMatch()`)
- `engine/standings.js` — `calculateStandings()` returns `{standings, qualifiers}`
- `engine/knockout.js` — `generateKnockout()` (uses `createMatch()`), `advanceKnockout()`
- `engine/tournamentEngine.js` — **Public API. UI calls only these:** `createGroups()`, `createFixtures()`, `computeStandings()`, `createKnockoutBracket()`, `advanceWinner()`
- `models/participant.js` — `createParticipant(name, members)`, `findParticipant()`, `participantName()`
- `models/match.js` — `createMatch(p1, p2, round, group, id?)`
- `models/tournament.js` — `createTournament(sport, format)` (single source of truth for state shape), `isTeamSport(format)`
- `models/sportConfig.js` — `SPORT_CONFIG` object with badminton/tableTennis/chess, `getSportConfig(sport, format)`, `getCurrentConfig()`
- `models/event.js` — `getEvents()`, `saveEvents()`, `createEvent()`, `deleteEvent()`, `addTemplateToEvent()`, `removeTemplateFromEvent()`, `setCurrentEvent()`. Events carry `organizationId: 'default'`. Key `btm_events`.
- `models/template.js` — `getTemplates()`, `saveTemplates()`, `createTemplateId()`, `createTemplate()`, `ensureTemplate()`. Key `btm_templates`.
- `models/appState.js` — `AppState` single state container: `{user, event, eventId, sport, category, loadingCategory, view, tournament, ui: {showingResults, managePanelOpen}}`
- `storage/local.js` — `localSave()`, `localLoad()`, `localClear()`, `getCategories()` (shim: builds categories from events+templates), `saveCategories()` (reverse shim: recreates events+templates from flat category list)
- `storage/events.js` — `on()`, `off()`, `emit()` simple event bus
- `storage/supabase.js` — `initSupabase()`, `upsertState()` (3 retries), `fetchState()`, Realtime, `flushCloudSave()`, `syncMetadataToCloud()`, `fetchMetadataFromCloud()`, `subscribeToMetadataChanges()`
- `storage/auth.js` — `isAdmin()`, `login()`, `logout()`, `checkSession()`, `showLogin()`, `closeLogin()`, `showLoading()`, `hideLoading()`
- `ui/utils.js` — `escapeHtml()`, `isDoubles()`, `pName(id)` (resolves participant ID to display name)
- `ui/app.js` — `saveState()`, `renderAll()`, navigation, async `init()` (Supabase-first). Uses `AppState.*` for all state.
- `ui/categories.js` — `switchCategory()`, category bar, event bar, sport bar, manage panel, export/import, breadcrumb
- `ui/setup.js` — player input, `_setupConfig()` helper, `startTournament()`, `renderSetup()`
- `ui/groups.js` — `renderGroups()`, `movePlayerToGroup()`, rename
- `ui/fixtures.js` — `renderFixtures()`, `enterFixtureScore()`
- `ui/knockout.js` — `renderKnockout()`, `enterKnockoutScore()`, `enterFinalSet()`
- `ui/champion.js` — `renderChampion()`, `viewChampion()`, `showResults()`, photos

Script load order: Engine (5) → Models (6) → appState.js → tournamentEngine → Storage (4: local, events, supabase, auth) → UI (8) → Test (1) = 24 scripts total.

## Source of truth

`req.md` — contains all requirements including tournament categories, scoring rules, doubles format, and photo support.

Open `index.html` directly in any browser. No server, no build.

Flow: Setup → Groups → Fixtures + Standings → Knockout → Champion

## Key implementation details

- **Scoring**: group/SF = single set first to 13; Final = Best of 3 first to 11 per set (all from `sportConfig.js`)
- **Groups**: <6 → 1 group, 6-10 → 2 groups, 11-20 → 4 groups (configurable via `getSportConfig().groupThresholds`)
- **Fixtures**: interleaved across groups (A1, B1, A2, B2, ...)
- **Standings**: sorted by wins → point diff → head-to-head → points for
- **Top 2** per group qualify; bracket: QF → SF → Final (or direct Final for 1-2 groups)
- **Winners auto-advance** to next round
- **Score inputs stay editable** (no disabling) to allow corrections
- Re-entering group scores after knockout has started will reset the bracket
- **`state.phase` vs `currentView`** — `state.phase` tracks tournament progress only (setup → groups → fixtures → knockout → champion). `currentView` tracks which screen is displayed (independent of phase). Navigation functions set `currentView`, never `state.phase`. Only `goToKnockout()` and `showResults()` advance `state.phase`.
- **Viewer controls hidden, not disabled** — `applyViewerMode()` uses CSS `body.viewer-mode` class + `display: none !important`. `clearDisabled()` resets `style.display = ''`. Do NOT use `disabled` for viewer controls.
- **Viewer fixtures/knockout scores as text** — `renderFixtures()` and `renderKnockout()` check `_isAdmin` and render `<span class="score-text">` instead of `<input>` for viewers. Final sets render via `renderFinalSetText()` for viewers, `renderFinalSetInputs()` for admins.
- **Viewer setup redirect** — if a viewer's category is in `setup` phase, `renderAll()` redirects to the first non-setup category, or shows "No active tournaments yet" on the results screen.
- **Admin login** — only accessible via `?admin` URL param (reveals a link in the footer). Login overlay is hidden by default. `updateBanners()` manages admin banner visibility.
- **`viewChampion()`** always re-syncs champion/runnerUp from knockout final (no stale state).
- **Data migration** — `init()` auto-converts old localStorage state (names-as-IDs) to new format (participant IDs + participants array) on load. Idempotent.

## Categories

- Dynamic — users can add/delete categories via the **Manage** button.
- 7 factory defaults: Junior, Jr Dbls, Sr Boys, Sr Girls, Sr Dbls, TT Singles, TT Dbls
- Deleting a running tournament is blocked (phase !== 'setup')
- Adding auto-generates unique ID from label, checks for duplicates
- At least 1 category must always exist
- Categories are a **derived view** — `getCategories()` in `local.js` joins events (via `templateIds`) with templates (by matching `tmpl.id`) to produce a flat category list. `saveCategories()` is the reverse shim: it takes a flat category list and recreates the underlying events + templates.

## Persistence

- Supabase is primary source of truth; localStorage is cache.
- `btm_state_{categoryId}` — per-category tournament state (localStorage)
- `btm_categories` — custom category list (localStorage — shim, see above)
- `btm_templates` — global template list (localStorage + cloud, legacy cloud key)
- `btm_events` — global event list (localStorage + cloud, legacy cloud key)
- `btm_metadata` — atomic composite key (templates+events+categories) for cloud sync
- `upsertState()` has retry logic (3 attempts, exponential backoff 1s/2s)
- `flushCloudSave()` cancels pending debounce and writes immediately
- `init()` fetches from Supabase BEFORE first render
- All categories synced from Supabase on startup
- "Push All" removed (every `saveState()` writes to Supabase automatically)

## Safety confirmations (all require typing a word to confirm)

- **Start Tournament**: type START to begin
- **Reset Tournament**: type RESET to clear all data for a category (visible in setup screen + manage panel)
- **New Tournament** (champion screen): type RESET to wipe
- **Reduce players**: type REMOVE to confirm

## Key constants

- `MIN_ENTRIES = 2`, `MAX_ENTRIES = 20` — defaults (overridden by `sportConfig.js`)

## Photos

- Optional champion + runner-up photos
- Upload via File API → canvas resize to 300px max → JPEG 0.7 → base64 → localStorage
- Not blocking — can skip

## Bug Fixes Applied (all 9 from bugs.txt)

1. **Viewer phase change** — admin guards on all nav functions (`app.js`)
2. **Category switch loses cloud data** — async Supabase fetch in `switchCategory` (`categories.js`)
3. **Reset leaves cloud data** — Supabase delete in `resetCategory` (`categories.js`)
4. **Realtime overwrites edit** — `_lastSave` timestamp guard in subscription (`supabase.js`)
5. **Group distribution** — round-robin allocation replaces `Math.ceil` slicing (`groups.js`)
6. **XSS** — `escapeHtml()` utility applied to all user-data `innerHTML` injections (`state.js` + 5 files)
7. **Save storm** — 500ms debounce on cloud upsert (`state.js`)
8. **Final set logic** — null-set skip instead of break in `enterFinalSet` (`knockout.js`)
9. **New tournament leaves cloud data** — Supabase delete in `newTournament` (`champion.js`)

## Later review items (from bugs.txt follow-up)

- **goBackFromChampion** has no admin guard (intentional — navigation is viewer-safe)
- **switchCategory** awaits Supabase before render (no flicker)
- **Realtime** uses `_lastSave` alone (no stringify comparison)
- **Navigation vs Mutation separation** — nav functions change screen only (no save), mutation functions are admin-guarded

## Feedback Phases Applied (from feedback.txt)

**Phase A** — models/ is single source of truth for data structures:
- `createTournament()` defines full state shape (moved from `defaultState()`)
- `defaultState()` is a thin wrapper: `return createTournament('badminton', 'singles')`
- `createMatch()` accepts optional `id` param for named knockout matches
- Engine uses `createMatch()` instead of inline objects

**Phase B** — tournamentEngine.js public API:
- `tournamentEngine.js` is the only file UI calls
- Functions: `createGroups()`, `createFixtures()`, `computeStandings()`, `createKnockoutBracket()`, `advanceWinner()`
- Each wraps the corresponding engine internal function

**Phase C** — sport configuration:
- `sportConfig.js` has 3 sports: badminton, tableTennis, chess
- `getSportConfig(sport, format)` returns config object
- `getCurrentConfig()` reads from global state
- `determineGroupCount()` accepts optional thresholds/counts arrays
- All UI score input limits, player limits, and final set counts come from config

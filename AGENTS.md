# AGENTS.md — badminton

Badminton Tournament Manager for local apartment tournaments. No build step, no server, no dependencies.

## Architecture

Three-layer separation:

```
js/
  engine/     — Pure business logic. No DOM, no storage. Functions take
  │             data in, return data out.
  │
  storage/    — Persistence. No DOM, no business logic. localStorage +
  │             Supabase.
  │
  ui/         — DOM rendering + event handling. Orchestrates engine + storage.
```

- `engine/state.js` — `defaultState()`, `MIN_ENTRIES`, `MAX_ENTRIES`
- `engine/groups.js` — `allocateGroups()`, `determineGroupCount()`
- `engine/fixtures.js` — `generateFixtures()`
- `engine/standings.js` — `calculateStandings()` returns `{standings, qualifiers}`
- `engine/knockout.js` — `generateKnockout()`, `advanceKnockout()`
- `storage/local.js` — `localSave()`, `localLoad()`, `localClear()`, `getCategories()`
- `storage/supabase.js` — `initSupabase()`, auth, `upsertState()`, `fetchState()`, Realtime
- `ui/utils.js` — `escapeHtml()`, `isDoubles()`
- `ui/app.js` — globals (`state`, `currentCategory`, `currentView`), `saveState()`, `renderAll()`, navigation, `init()`
- `ui/categories.js` — `switchCategory()`, category bar, manage panel, export/import
- `ui/setup.js` — player input, `startTournament()`, `renderSetup()`
- `ui/groups.js` — `renderGroups()`, `movePlayerToGroup()`, rename
- `ui/fixtures.js` — `renderFixtures()`, `enterFixtureScore()`
- `ui/knockout.js` — `renderKnockout()`, `enterKnockoutScore()`, `enterFinalSet()`
- `ui/champion.js` — `renderChampion()`, `viewChampion()`, `showResults()`, photos

Script load order: Engine → Storage → UI (15 scripts total).

## Source of truth

`req.md` — contains all requirements including tournament categories, scoring rules, doubles format, and photo support.

Open `index.html` directly in any browser. No server, no build.

Flow: Setup → Groups → Fixtures + Standings → Knockout → Champion

## Key implementation details

- **Scoring**: group/SF = single set first to 13; Final = Best of 3 first to 11 per set
- **Groups**: <6 → 1 group, 6-10 → 2 groups, 11-20 → 4 groups, random balanced allocation
- **Fixtures**: interleaved across groups (A1, B1, A2, B2, ...)
- **Standings**: sorted by wins → point diff → head-to-head → points for
- **Top 2** per group qualify; bracket: QF → SF → Final (or direct Final for 1-2 groups)
- **Winners auto-advance** to next round
- **Score inputs stay editable** (no disabling) to allow corrections
- Re-entering group scores after knockout has started will reset the bracket
- **`state.phase` vs `currentView`** — `state.phase` tracks tournament progress only (setup → groups → fixtures → knockout → champion). `currentView` tracks which screen is displayed (independent of phase). Navigation functions set `currentView`, never `state.phase`. Only `goToKnockout()` and `showResults()` advance `state.phase`.
- **Viewer controls hidden, not disabled** — `applyViewerMode()` uses `style.display = 'none'` to hide admin-only controls completely. `clearDisabled()` resets `style.display = ''`. Do NOT use `disabled` for viewer controls.
- **Viewer fixtures/knockout scores as text** — `renderFixtures()` and `renderKnockout()` check `_isAdmin` and render `<span class="score-text">` instead of `<input>` for viewers. Final sets render via `renderFinalSetText()` for viewers, `renderFinalSetInputs()` for admins.
- **Viewer setup redirect** — if a viewer's category is in `setup` phase, `renderAll()` redirects to the first non-setup category, or shows "No active tournaments yet" on the results screen.

## Categories

- Dynamic — users can add/delete categories via the **Manage** button
- 5 factory defaults: Junior, Jr Dbls, Sr Boys, Sr Girls, Sr Dbls
- Deleting a running tournament is blocked (phase !== 'setup')
- Adding auto-generates unique ID from label, checks for duplicates
- At least 1 category must always exist

## Persistence

- All state in `localStorage`:
  - `btm_state_{categoryId}` — per-category tournament state
  - `btm_categories` — custom category list
- No server, offline-capable

## Safety confirmations (all require typing a word to confirm)

- **Start Tournament**: type START to begin
- **Reset Tournament**: type RESET to clear all data for a category (visible in setup screen + manage panel)
- **New Tournament** (champion screen): type RESET to wipe
- **Reduce players**: type REMOVE to confirm

## Key constants

- `MIN_ENTRIES = 2`, `MAX_ENTRIES = 20` — single place to change range

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

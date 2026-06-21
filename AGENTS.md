# AGENTS.md — badminton

Single-HTML-file Badminton Tournament Manager for local apartment tournaments. No build step, no server, no dependencies.

## Source of truth

`req.md` — contains all requirements including tournament categories, scoring rules, doubles format, and photo support.

## Project state

All phases complete. Currently ~1180 lines in `index.html`.

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

## Key constants

- `MIN_ENTRIES = 2`, `MAX_ENTRIES = 20` — single place to change range

## Photos

- Optional champion + runner-up photos
- Upload via File API → canvas resize to 300px max → JPEG 0.7 → base64 → localStorage
- Not blocking — can skip

# Tournament Manager

Standalone browser-based tournament manager for local apartment tournaments. No build step, no server, no dependencies — open `index.html` directly.

## Features

- **Multiple sports**: Badminton, Table Tennis, Chess (singles + doubles where applicable)
- **Dynamic categories**: Add/delete tournament categories (Junior, Sr Boys, Sr Dbls, etc.)
- **Tournament flow**: Setup → Groups → Fixtures + Standings → Knockout → Champion
- **Scoring**: Group/SF = single set first to 13; Final = Best of 3 first to 11 per set (configurable per sport)
- **Group allocation**: <6 → 1 group, 6–10 → 2 groups, 11–20 → 4 groups
- **Knockout**: QF → SF → Final (or direct Final for 1–2 groups)
- **Champion photos**: Optional upload via File API
- **Persistence**: localStorage + optional Supabase cloud sync
- **Viewer mode**: Read-only UI when not logged in

## Quick Start

Open `index.html` in any browser. That's it.

## Architecture

```
js/
  engine/       — Pure business logic. No DOM, no storage.
  models/       — Domain types + sport configuration.
  storage/      — Persistence (localStorage + Supabase).
  ui/           — DOM rendering + event handling.
```

UI code calls only the public API in `engine/tournamentEngine.js`.

## Testing

```
node js/test/runner.js
```

275 tests covering full tournament flow.

## Configuration

- **`APP_CONFIG.defaultEvent`** in `js/storage/local.js`
- **`SPORT_CONFIG`** in `js/models/sportConfig.js` — per-sport scoring rules, player limits, group thresholds

## Supabase (Optional)

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/storage/supabase.js` to enable cloud sync.

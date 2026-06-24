# Tournament Manager

Standalone browser-based tournament manager for local apartment tournaments. No build step, no server, no dependencies — open `index.html` directly.

## Features

- **Multiple sports**: Badminton, Table Tennis, Chess (singles + doubles where applicable)
- **Events + Templates**: Events hold competition templates. Same template reusable across events.
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

## Admin Guide

### Login
Add `?admin` to the URL (e.g., `index.html?admin`) — this reveals the admin login link in the footer. Sign in via Supabase Auth.

### Events
- **Create**: Click "+ New Event", enter a name
- **Rename**: Click the pencil icon next to an event name
- **Delete**: Click "Manage" → find the event → type DELETE and click Go
- Events contain templates (categories). Each template is a tournament configuration.

### Templates (Categories)
A template = a category type (e.g., "Jr Dbls", "Sr Boys"). Templates belong to events.
- **Add to event**: Click "Manage" → select an event → enter category name, sport, format → Add
- **Remove**: Click "Manage" → find the template → Remove
- Templates with running tournaments cannot be removed

### Tournament Flow
1. Pick an event → pick a sport → pick a category
2. **Setup**: Enter player names → click START (type START to confirm)
3. **Groups**: View group allocation (drag to move players between groups if needed)
4. **Fixtures**: Enter scores for group matches (single set, first to 13)
5. **Standings**: Auto-calculated — click "Go to Knockout" to proceed
6. **Knockout**: Enter scores for QF/SF (single set, first to 13) → Final (Best of 3)
7. **Champion**: View winner, optionally upload photos

### Viewer Mode
Users without admin login see a read-only UI — score inputs hidden, navigation controls hidden, no edit buttons.

## Architecture

```
js/
  engine/       — Pure business logic. No DOM, no storage.
  models/       — Domain types (event, template, tournament, participant, match) + sport config.
  storage/      — Persistence (localStorage + Supabase). Templates/events synced to cloud.
  ui/           — DOM rendering + event handling.
```

UI code calls only the public API in `engine/tournamentEngine.js`.

### Data Model

```
Events ─── templateIds ──→ Templates (competition types)
                              │
                              ├─ each has: {id, name, sport, type}
                              └─ linked to tournament state via template.id = category key
```

## Testing

```
node js/test/runner.js
```

278 tests covering full tournament flow + event/template model.

## Configuration

- **`APP_CONFIG.defaultEvent`** in `js/storage/local.js`
- **`SPORT_CONFIG`** in `js/models/sportConfig.js` — per-sport scoring rules, player limits, group thresholds

## Supabase (Optional)

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/storage/supabase.js` to enable cloud sync.

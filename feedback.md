# Tournament Manager — Current Assessment & Next Steps

## Overall Status

The project has successfully evolved from a badminton application into a reusable tournament platform.

| Area | Completion | Status |
|------|-----------|--------|
| Core Tournament Engine | 85% | ✅ Groups, Fixtures, Standings, Qualification, Knockout, Champion |
| Architecture | 80% | ✅ Models, Engine, Storage, UI separation, Sport configuration |
| | | ⏳ Event model, AppState cleanup, Removal of global variables |
| User Experience | 65% | ⏳ Biggest remaining improvement area — navigation works but feels technical |

---

## High Priority Bugs

### Bug 1: Category Tabs Not Visible

**Status: ✅ Fixed**

Root cause: `login()` in `supabase.js:48-51` fetched cloud categories (old format, no `sport`/`event` fields) and overwrote locally-migrated categories without calling `migrateCategorySports()`. `renderCategoryBar()` filtered by `c.sport === currentSport` → zero matches → empty bar.

**Fixes applied:**
- `supabase.js:50` — Added `migrateCategorySports()` after `saveCategories(cloudCats)` in `login()`
- `app.js:363-366` — Added `upsertCategories(cats)` after `migrateCategorySports()` in `init()` to sync migrated categories to cloud
- `renderAll()` already sets `catBar.style.display = ''` at line 129 on every non-home render

### Bug 2: Navigation State

**Status: ✅ Verified**

- `state.phase` tracks tournament progress (setup → groups → fixtures → knockout → champion)
- `currentView` tracks displayed screen (independent of phase)
- Navigation functions (`goToGroups`, `viewKnockout`, `goBackFromChampion`) only change `currentView`
- Only `goToKnockout()` and `showResults()` advance `state.phase` — both admin-guarded
- Score entry, group moves, and all mutations are admin-guarded with `if (!_isAdmin) return`

### Bug 3: Results / Champion Navigation

**Status: ✅ Verified**

Groups → Fixtures → Knockout → Champion can be viewed by both Admin and Viewer without modifying tournament progress:
- `goToGroups()` — sets `currentView = 'groups'`, calls `renderAll()`, safe for both
- `viewKnockout()` — sets `currentView = 'knockout'`, calls `renderAll()`, safe for both
- `viewChampion()` — sets `currentView = 'champion'`, calls `renderAll()`, safe for both
- `showResults()` — admin-guarded, advances phase if needed

---

## UX Improvement Roadmap

**Status: ⏳ Structure exists, refinement needed**

### Current UX (what we have)

```
Event Bar       → [Summer Games 2026]
Sport Bar       → [Badminton] [Table Tennis] [Chess]
Category Tabs   → [Junior] [Sr Boys] [Sr Girls] [Jr Dbls] [Sr Dbls]
Tournament      → Groups / Fixtures / Knockout / Champion (action bar + content)
```

### Recommended UX (feedback target)

```
Home            → 🏆 Tournament Manager
                    Events: Summer Games 2026, Winter Games 2026

Event Page      → Summer Games 2026
                    Sports: 🏸 Badminton, 🏓 Table Tennis, ♟ Chess

Sport Page      → Badminton
                    Categories: Junior Singles, Senior Singles, Senior Doubles

Tournament Page → Tabs: Groups | Fixtures | Knockout | Champion
```

### What's done ✅
- Home page with event sections and sport cards
- Event → Sport → Category hierarchy in navigation bars
- Tournament content renders per view

### What's pending ⏳
- Separate "Event Page" as a distinct screen (currently event is just a bar label)
- Separate "Sport Page" as a distinct screen (currently sport is just a bar label)
- More intuitive page-like transitions instead of bar-based navigation
- Breadcrumb or "You are here" indicator

---

## Data Model Improvements

**Status: ✅ Implemented**

| Level | Implementation |
|-------|---------------|
| Event | `event` field on each category. Event bar derived from `[...new Set(categories.map(c => c.event))]` |
| Sport | `sport` field on each category. Sport bar filters by sport. `sportConfig.js` has sport-specific settings |
| Category | Factory defaults + dynamic add/delete. `event` + `sport` fields |
| Tournament | Per-category state object with phase, groups, fixtures, standings, knockout, champion |

---

## Sports Roadmap

| Phase | Sport | Status |
|-------|-------|--------|
| 1 | Badminton Singles / Doubles | ✅ Complete — stable and production-ready |
| 2 | Table Tennis Singles / Tennis Singles | ⏳ Config exists in `sportConfig.js`, untested |
| 3 | Chess / Carrom | ⏳ Chess config exists (`sportConfig.js:27-40`), Carrom not configured |
| 4 | Football / Volleyball / Basketball | ⏳ Deferred — needs team model + team standings engine |
| 5 | Cricket | ⏳ Deferred — recommended as separate module |

---

## Architecture Improvements

### AppState (Remove Global Variables)

**Status: ⏳ Deferred**

Current globals:
- `state`, `currentCategory`, `currentSport`, `currentEvent`, `currentView`

Recommended:
```js
AppState = {
  user,
  currentEvent,
  currentSport,
  currentCategory,
  currentView,
  tournament
}
```

Not urgent for V1 — current globals work and are manageable at this scale. Would be needed before React migration.

### Event Model (`event.js`)

**Status: ⏳ Deferred — partially done**

Events exist as a field on categories and are rendered in the event bar + home page. A standalone `event.js` model with `{id, name, year, sports:[]}` would be needed for data retention enforcement (archive/delete old events).

### Sport Model (`sport.js`)

**Status: ⏳ Deferred — partially done**

`SPORT_CONFIG` in `sportConfig.js` centralizes per-sport settings. A standalone `sport.js` model with `{id, name, categories:[]}` is not yet needed.

---

## Features To Avoid For Now

**Status: ✅ Agreed — not adding**

- Notifications
- WhatsApp integration
- Historical analytics
- Player rankings
- Advanced statistics

Focus remains on UX and navigation stability.

---

## Recommended Next Sprint

| Priority | Item | Status |
|----------|------|--------|
| 1 | Fix navigation UX (intuitive pages vs bars) | ⏳ Structure done, refinement needed |
| 2 | Fix category visibility issue | ✅ Fixed in login() + init() |
| 3 | Event → Sport → Category hierarchy | ✅ Implemented |
| 4 | Add Table Tennis | ⏡ Not started |
| 5 | Add Chess | ⏡ Not started |

---

## Final Recommendation

> The platform is no longer a prototype. It is approaching a reusable tournament management product.
> The next major gains will come from **UX simplification**, **navigation improvements**, and **better hierarchy** — not from adding more tournament logic.

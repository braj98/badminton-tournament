# Todo List (from feedback.txt UX vision)

## Event Dashboard (screen-results)

Goal: Event-level Live / Upcoming / Champions that aggregate ALL categories in the event.

### 1. Make renderLiveView() event-level (live.js)
- [x] Iterate all categories via `localLoad(tmpl.id)` (like renderResultsArchive already does)
- [x] Collect `status === 'LIVE'` matches from each category's fixtures + knockout
- [x] Render grouped by category with sport icon + category name header
- [x] Admin score entry: enterLiveFixtureScore / enterLiveKnockoutScore need `catId` param
- [x] Viewer mode: show scores as text

### 2. Make renderUpcomingView() event-level (upcoming.js)
- [x] Same pattern: iterate all categories, collect `status === 'UPCOMING' && p1 && p2` matches
- [x] Render grouped by category with category name
- [x] ▶ Start Match button (admin only) — needs catId to find match

### 3. Tab bar: 3 tabs (remove 📖 Results)
- [x] Remove 📖 Results from index.html tab bar
- [x] Remove renderResultsArchive() from app.js
- [x] Remove from switchMatchView dispatcher
- [x] Tab bar: 🔥 Live | 📅 Upcoming | 🏆 Champions

### 4. Update showResultsPage() for event-level
- [x] No longer category-specific
- [x] Close results → goes to home/event page
- [x] Category page: no sub-tabs (Groups/Fixtures/Knockout/Champion only)

### 5. Score entry needs catId
- [x] enterLiveFixtureScore(catId, id, s1, s2) — load state from localLoad(catId)
- [x] enterLiveKnockoutScore(catId, id, s1, s2) — same
- [x] startUpcomingMatch(catId, id) — same
- [x] Update score entry onclick/onchange in rendered HTML

## Category page cleanup
- [ ] Remove category-level sub-tab complexity from knockout.js, fixtures.js
- [x] Category tabs: Groups → Fixtures → Knockout → Champion (no change needed, already this way)

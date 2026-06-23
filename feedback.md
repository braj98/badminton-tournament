# Feedback Implementation Plan

Priorities from feedback.txt, ordered:

## Priority 1: Remove Event reference from templates/categories
Event should reference templates, not the other way around.
- [x] Templates are already clean: `{id, name, sport, type}` — no `event` field
- [x] Events store `templateIds` — events reference templates
- [ ] Clean up `saveCategories()` code that assigns event to categories (still used in migration path)

## Priority 2: Introduce Competition terminology
Replace "category" with "competition" in UI labels.
- [x] Renamed "Categories" → "Competitions" in Manage panel heading
- [x] Renamed "Manage Categories" → "Manage Competitions" on Event page
- [ ] Update remaining labels (breadcrumb, help text, etc.)

## Priority 3: Event dropdown in Manage panel
Restructure Manage panel: Event selector → Competitions per event
- [x] Events section at top: list all events with rename/delete/create
- [x] Competitions section: master list of all templates with event badges
- [x] Add Competition form: label + sport + type
- [x] Edit competition: label, sport, type
- [x] Delete competition: removes from all events + clears state

## Priority 4: Competition status cards
Show cards with icon, sport, player count, status badge.
- [ ] Render each competition as a card showing: icon, label, sport, player count, status dot

## Priority 5: Add Table Tennis officially
- [ ] Verify Table Tennis works end-to-end (create event → add TT template → start tournament → scores → champion)
- [ ] Verify TT scoring rules (from sportConfig.js)

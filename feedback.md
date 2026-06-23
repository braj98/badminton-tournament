# Feedback Implementation Plan

Priorities from feedback.txt, ordered:

## Priority 1: Remove Event reference from templates/categories
Event should reference templates, not the other way around.
- [x] Templates are already clean: `{id, name, sport, type}` — no `event` field
- [x] Events store `templateIds` — events reference templates
- [x] Clean up `saveCategories()` code that assigns event to categories (still used in migration path)

## Priority 2: Introduce Competition terminology
Replace "category" with "competition" in UI labels.
- [x] Renamed "Categories" → "Competitions" in Manage panel heading
- [x] Renamed "Manage Categories" → "Manage Competitions" on Event page
- [x] Update remaining labels (breadcrumb, help text, etc.)

## Priority 3: Event dropdown in Manage panel
Restructure Manage panel: Event selector → Competitions per event
- [x] Events section at top: list all events with rename/delete/create
- [x] Competitions section: master list of all templates with event badges
- [x] Add Competition form: label + sport + type
- [x] Edit competition: label, sport, type
- [x] Delete competition: removes from all events + clears state

## Priority 4: Competition status cards
Show cards with icon, sport, player count, status badge.
- [x] Render each competition as a card showing: icon, label, sport, player count, status dot

## Priority 5: Add Table Tennis officially
- [x] Verify Table Tennis works end-to-end (create event → add TT template → start tournament → scores → champion)
- [x] Verify TT scoring rules (from sportConfig.js)

## Priority 6: eventId instead of event name
Use `AppState.eventId` instead of `AppState.event` (display name) as identifier.
- [ ] Store eventId in AppState, resolve name from event object
- [ ] Update all `c.event === ev.name` comparisons to use IDs
- [ ] Verify rename doesn't orphen anything

## Priority 7: Template ID stability
Template IDs are generated from labels on creation, but renaming doesn't change the ID.
- [ ] Review all template ID generation paths for consistency
- [ ] Ensure ID never changes after creation

## Priority 8: UI Polish
Full visual polish pass.
- [ ] Dark mode completeness — fix hardcoded colors
- [ ] Confirm dialog styling — inline REMOVE box, RESET/IMPORT modals
- [ ] Empty state consistency across all views
- [ ] Button styling consistency
- [ ] Card spacing alignment

## Priority 9: Test Review
Review engine tests for relevance, add new ones, drop redundant ones.
- [ ] Audit all 275 test cases for relevance to current model
- [ ] Check for gaps (user flow, edge cases)
- [ ] Remove redundant tests
- [ ] Add new tests for template/event model if needed

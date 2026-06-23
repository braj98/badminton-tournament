# Feedback Implementation Plan

Priorities from feedback.txt, ordered:

## Priority 1: Remove Event reference from templates/categories
Event should reference templates, not the other way around.
- [ ] Verify templates have no `event` field (they shouldn't — templates are {id, name, sport, type})
- [ ] Verify `getCategories()` derived view still works (read-only, uses event from the event object, not template)
- [ ] Clean up any `saveCategories()` code that assigns event to categories

## Priority 2: Introduce Competition terminology
Replace "category" with "competition" in UI labels.
- [ ] Rename "Categories" → "Competitions" in Manage panel heading
- [ ] Rename "Category" in Event page heading
- [ ] Update breadcrumb labels
- [ ] Update button text and help text

## Priority 3: Event dropdown in Manage panel
Restructure Manage panel: Event selector → Competitions per event
- [ ] Add event dropdown at top of Manage panel
- [ ] Show competitions (templates) filtered by selected event
- [ ] Add "Create Competition" form (label + sport + type)
- [ ] Add "Link existing template to event" option
- [ ] Add "Remove from event" button per competition

## Priority 4: Competition status cards
Show cards with icon, sport, player count, status badge.
- [ ] Render each competition as a card showing: icon, label, sport, player count, status dot
- [ ] Cards are clickable to enter the tournament (or navigate to setup)

## Priority 5: Add Table Tennis officially
- [ ] Verify Table Tennis works end-to-end (create event → add TT template → start tournament → scores → champion)
- [ ] Verify TT scoring rules (from sportConfig.js)

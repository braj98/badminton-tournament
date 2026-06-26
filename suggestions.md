# Suggestions for Badminton Tournament Manager

## Priority: High (Do Now)

### 1. ↩ Undo for Score Entry
Currently there's no undo if you accidentally enter a wrong score. Consider:
- Adding an "Undo" button that reverts the last score change
- Keeping a short history (last 3 actions) in memory for quick reversal
- Or at minimum, a "Clear Scores" button on LIVE matches

### 2. Sound Notifications
When a match completes (status → COMPLETED), play a subtle sound:
- Short chime for match completion
- Helps organizers who are looking at the bracket while doing other things
- Use Web Audio API (no external deps): `new Audio('data:audio/wav;base64,...')`

### 3. Match Elapsed Time on Live View
The Live tab shows 🔴 LIVE but doesn't show how long a match has been running. Adding:
- A small timer (e.g., "5:23") on LIVE match cards
- Helps organizers spot matches that are taking unusually long

### 4. Better Empty States
Several views show generic "No matches" text. Consider:
- Different empty states for different phases (no fixtures yet vs no live matches)
- CTA buttons on empty states guiding admins to take action
- Example: "No live matches — Start one from the Upcoming tab"

### 5. Final Set Highlight in Score Entry
When entering Final set scores, the current set is ambiguous:
- Add visual emphasis (e.g., bold label, color) for the current set being entered
- Show "Set X" labels more prominently in the final sets input row

---

## Priority: Medium (Nice to Have)

### 6. Bracket Reset Without Data Loss
Currently "Reset Tournament" wipes everything. Consider:
- A "Reset Bracket Only" option that clears knockout results but keeps group standings
- Or a "Restart From Groups" option that resets fixtures but keeps group allocation

### 7. Player Search/Filter in Setup
With 20 players max, the list is manageable. But if it grows:
- Add a search box to filter players by name
- Useful in categories with many players

### 8. Dark Mode Improvements
- The dark mode is functional but some elements could be refined:
  - Score inputs in Live tab (red borders) look good
  - Consider a subtle dark gradient for the Final cards in knockout
  - The Go Live button could have a dark mode variant

### 9. Mobile Score Entry UX ~~(DONE)~~
On small screens, score inputs are small:
- ~~Increase touch target size for score inputs on mobile~~ DONE
- Consider a +/- stepper instead of manual number entry (skipped - manual entry is flexible)
- ~~Test on actual phone-sized viewports~~ DONE

### 10. Export Results
Currently results are visible in-app only. Consider:
- A "Share" button that copies a text summary to clipboard
- Or generates a simple shareable link with tournament results

---

## Priority: Low (Later)

### 11. Drag-and-Drop Group Assignment ~~(DONE)~~
- ~~Click ↔ → select group → confirm~~ DONE (drag player chips between group cards)
- ~~Could be drag-and-drop in the Groups admin panel~~ DONE

### 12. Bulk Player Add
Adding 10+ players one-by-one is tedious:
- A "Paste List" option where you paste names separated by newlines
- Or CSV import

### 13. Seeding Support
Currently groups are allocated round-robin. With seeding:
- Top-ranked players get distributed across groups evenly
- Useful for competitive categories

### 14. Match Scheduling / Time Slots
No concept of when matches start:
- Could add a "scheduled time" to upcoming matches
- Show countdown or scheduled time in Upcoming tab

### 15. Venue/Court Management
Only one bracket shown. Could support:
- Multiple courts (Court 1, Court 2...)
- Filter live/upcoming by court
- Assign matches to specific courts

### 16. Player Statistics
No historical stats tracked:
- Win/loss record per player across tournaments
- Points scored averages
- Useful for seeded events

### 17. Accessibility (a11y)
- ARIA labels on buttons
- Keyboard navigation for score entry (Tab, Enter)
- Screen reader announcements for match status changes

### 18. Offline Mode
Currently requires Supabase for sync. Could:
- Track offline changes and sync when back online
- Show an "Offline" indicator
- Queue changes and replay on reconnect

---

## Already Handled / In Progress

- ✅ Confirm before Start Match (done)
- ✅ Revert LIVE → UPCOMING (done)
- ✅ XSS protection via escapeHtml() (done)
- ✅ Match status migration (done)
- ✅ Data rollback (localStorage old format migration done)
- ✅ Cloud sync conflict resolution (_lastSave timestamp) (done)
- ✅ Admin login via ?admin URL param (done)
- ✅ Reset confirmation typing (done)
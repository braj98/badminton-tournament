# UI Polish Plan

## Items

| # | Area | File(s) | Change | Effort |
|---|------|---------|--------|--------|
| 1 | Label bug | `index.html:222` | `#btnViewChampion` text: "📊 Results Table" → "🏆 View Champion" | 1 line |
| 2 | Page title | `index.html:6` | `<title>`: "Badminton Tournament Manager" → "Tournament Manager" | 1 line |
| 3 | CSS conflict | `css/styles.css:97-112` | `.admin-tag` and `.mode-tag` both have `margin-left: auto` — only one should push right | 2 lines |
| 4 | Mode banner style | `css/styles.css:107-112` | Add background/border to `.mode-tag`; distinguish admin (green) vs viewer (gray) via JS | `categories.js` + CSS |
| 5 | Inline styles | `index.html:31-99` | ~20 `style=""` attrs in manage panel → CSS classes (`.modal`, `.modal-actions`, `.form-row`, `.form-label`) | 15+ CSS rules |
| 6 | Loading indicator | `index.html` + CSS | Add spinner `<div id="loadingSpinner" class="hidden">` and show during login/cloud ops | JS + CSS |
| 7 | Auto-focus | `js/ui/setup.js` | After `onPlayerCountChange()`, focus `#playerInputs input:first-child` | 1 line |
| 8 | Hover shift | `css/styles.css:158` | `.btn:hover { transform: scale(1.02) }` → `translateY(-1px)` | 1 line |
| 9 | Confirm styles | `css/styles.css` | Differentiate START (blue), RESET (red), REMOVE (orange), IMPORT (purple) confirmation boxes | `start-confirm`, `reset-confirm`, `reduce-confirm`, `import-confirm` classes |

## Order (logical)
1. Fixes first (labels, title) — items 1-2
2. CSS conflicts — items 3-4  
3. Visual consistency — items 5, 8, 9
4. UX enhancements — items 6, 7

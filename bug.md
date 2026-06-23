# Bug List

## Bug 1: AppState.showingResults Duplication
**Status: Completed**

AppState.showingResults existed at top-level AND inside AppState.ui. Changed all usages to AppState.ui.showingResults:
- js/ui/app.js (lines 9, 37, 258, 420, 436)
- js/storage/supabase.js (line 133)
- js/test/edge_cases.js (lines 656, 658)

All 72 tests pass.

- Created `js/models/appConfig.js` with `APP_CONFIG.defaultEvent`
- Updated all files using `DEFAULT_EVENT` to use `APP_CONFIG.defaultEvent`
- Updated test file (`edge_cases.js`) to use `APP_CONFIG.defaultEvent`

## Bug 2: Category Bar Visibility Still Fragile
**Status: Completed**

Visibility of catBar, tournamentTabs, actionBar, and breadcrumb was scattered across multiple functions:
- renderHomePage() - inline visibility settings
- renderEventPage() - inline visibility settings
- renderSportPage() - inline visibility settings
- renderAll() - catBar visibility for tournament views
- showResultsPage() - inline visibility settings

Created `updateGlobalNavigation()` function (app.js:136-162) that centrally manages all navigation element visibility based on AppState.view and AppState.ui.showingResults:

```javascript
function updateGlobalNavigation() {
  const view = AppState.view;
  const showingResults = AppState.ui.showingResults;
  // breadcrumb: hidden on home
  // catBar: hidden on home/event/sport, visible otherwise (or when showingResults)
  // tournamentTabs: hidden on home/event/sport/results/overlay
  // actionBar: hidden on home/event/sport/results/overlay
}
```

Modified:
- renderAll() - now calls updateGlobalNavigation() for tournament views
- showResultsPage() - now calls updateGlobalNavigation() instead of inline code

Note: renderHomePage, renderEventPage, renderSportPage still have inline catBar visibility because they return early and don't call updateGlobalNavigation(). This is a follow-up cleanup item.

All 72 tests pass.

## Bug 3: Admin State Duplication (AppState.user vs AppState.isAdmin)
**Status: Completed**

Previously both `AppState.user` and `AppState.isAdmin` existed, risking them getting out of sync. `AppState.user` was never set (always null).

Changes:
1. Added `isAdmin()` function in supabase.js that checks `AppState.user && AppState.user.role === 'admin'`
2. Changed `login()` to set `AppState.user = { role: 'admin' }`
3. Changed `logout()` to set `AppState.user = null`
4. Changed `checkSession()` to set `AppState.user` based on session
5. Replaced all 56 usages of `AppState.isAdmin` with `isAdmin()` across:
   - js/ui/knockout.js (6 usages)
   - js/ui/fixtures.js (2 usages)
   - js/ui/champion.js (6 usages)
   - js/ui/app.js (11 usages)
   - js/ui/setup.js (4 usages)
   - js/ui/groups.js (5 usages)
   - js/ui/categories.js (10 usages)
   - js/models/event.js (2 usages)
6. Removed `isAdmin: false` from AppState model

All 72 tests pass.

## Bug 4: Sport Configuration Limited
**Status: Completed**

All sports (badminton, tableTennis, chess) now have `displayName`, `icon`, `supportsDoubles`, and `teamBased` properties.

## Bug 5: Supabase .single() Error on Empty Result
**Status: Completed**

Changed `.single()` to `.maybeSingle()` in:
- `fetchState()` (supabase.js:93)
- `fetchCategoriesFromCloud()` (supabase.js:117)

This prevents PGRST116 error (no rows) from breaking the flow when a category has no existing state.

## Bug 6: Start Tournament Confirmation Box Not Showing
**Status: Completed**

Root cause: `showResultsPage()` was setting `el.style.display = 'none'` inline on all `.admin-only` elements. When `showStartConfirm()` toggled the `hidden` class, the inline style overrode CSS.

Fix:
- Changed `showResultsPage()` to use `classList.add('hidden')` instead of inline style
- Added `box.style.display = ''` in `showStartConfirm()` as defensive measure
- Also fixed `showResetConfirm()` and `showReduceConfirm()` with similar fixes

## Bug 7: New Category Navigation for Non-Admin
**Status: Completed**

Fixed `switchCategory()` to properly set `AppState.sport` and `AppState.event` from the category when switching to a new category. This ensures:
- Category bar shows the new category
- Viewer redirect logic doesn't interfere
- Start Tournament works correctly

## Bug 9: upsertCategories Called for Non-Admin Users
**Status: Completed**

`upsertCategories()` was being called in `init()` without checking admin status. Fixed by adding admin check in `app.js:557`:
```js
if (_supabase && isAdmin()) {
  const cats = getCategories();
  if (cats.length) upsertCategories(cats);
}
```

All other call sites in `categories.js` and `event.js` were already properly guarded with admin checks.

## Engine: State Key Generation (`getStateKey()`)
**Status: Completed**

State keys like `btm_state_junior` were generated via string concatenation scattered across multiple files. Created centralized helper functions:

**js/storage/local.js:**
```js
function getStateKey(catId) {
  return 'btm_state_' + catId;
}

function getCategoriesKey() {
  return CATEGORIES_KEY; // 'btm_categories'
}
```

Updated all usages across 4 files:
- **local.js** - localSave, localLoad, localClear, getCategories, saveCategories
- **supabase.js** - upsertState, fetchState, upsertCategories, fetchCategoriesFromCloud, subscribeToChanges
- **champion.js** - newTournament() cloud delete
- **categories.js** - resetCategory, deleteCategory, pushAllToCloud, importData
- **event.js** - deleteEvent cloud delete

Note: Legacy migration in app.js (lines 564-565) uses hardcoded `btm_state_senior_boys` - intentionally unchanged as it's a one-time migration key.

All 72 tests pass.

## Testing: Comprehensive Edge Case Coverage
**Status: Completed**

Previously tests only covered group allocation and fixtures (72 tests). Now runner.js includes full flow testing (275 tests):

**Player counts tested:** 2, 3, 4, 5, 6, 7, 10, 11, 20

**Each test covers:**
1. **Group generation** - determineGroupCount(), allocateGroups(), sizes, uniqueness, balance
2. **Fixture generation** - generateFixtures(), unique IDs, head-to-head completeness
3. **Qualification** - calculateStandings(), rank ordering, qualifier selection
4. **Knockout** - generateKnockout(), bracket with QF/SF/Final rounds
5. **Champion** - advanceKnockout(), winner determination, runner-up

**Results:** 275 tests passing

## UX: Persistent Navigation Header
**Status: Completed**

Previously the breadcrumb was hidden on the home page, making navigation less clear. Now the breadcrumb is **always visible**, showing:
- Home page: "Home" (with bc-current styling)
- Event page: "Home › Event"
- Sport page: "Home › Event › Sport"
- Tournament pages: "Home › Event › Sport › Category"

Changes:
- `renderBreadcrumb()` (app.js:113-134) - Removed early return/hide on home, now shows "Home" with bc-current
- `updateGlobalNavigation()` (app.js:146-148) - Always removes hidden class from breadcrumb
- Updated test in edge_cases.js to expect breadcrumb visible on home

All 72 tests pass.
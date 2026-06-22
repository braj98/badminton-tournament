// ===================== STATE =====================
const MIN_ENTRIES = 2;
const MAX_ENTRIES = 20;

let currentCategory = null;
let state = null;
let _editMode = false;
let _isAdmin = false;

function storageKey() {
  return 'btm_state_' + currentCategory;
}

function isDoubles() {
  const cat = getCategories().find(c => c.id === currentCategory);
  return cat && cat.type === 'doubles';
}

function defaultState() {
  return {
    phase: 'setup',
    players: [],
    groups: {},
    fixtures: [],
    standings: {},
    qualifiers: [],
    knockout: [],
    champion: null,
    runnerUp: null,
    championPhoto: null,
    runnerUpPhoto: null,
    teamMembers: [],
    completedAt: null
  };
}

// ===================== PERSISTENCE =====================
function saveState() {
  if (!currentCategory) return;
  try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch(e) {}
  if (_isAdmin && state.phase !== 'setup') upsertState(currentCategory, state);
}

function loadState(catId) {
  try {
    const raw = localStorage.getItem('btm_state_' + catId);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function clearSavedState() {
  if (!currentCategory) return;
  try { localStorage.removeItem(storageKey()); } catch(e) {}
}

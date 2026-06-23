const CATEGORIES_KEY = 'btm_categories';

function getStateKey(catId) {
  return 'btm_state_' + catId;
}

function getCategoriesKey() {
  return CATEGORIES_KEY;
}

function localSave(catId, data) {
  try { localStorage.setItem(getStateKey(catId), JSON.stringify(data)); } catch(e) {}
}

function localLoad(catId) {
  try {
    const raw = localStorage.getItem(getStateKey(catId));
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function localClear(catId) {
  try { localStorage.removeItem(getStateKey(catId)); } catch(e) {}
}

function getCategories() {
  try {
    const raw = localStorage.getItem(getCategoriesKey());
    if (raw) { const c = JSON.parse(raw); if (c.length) return c; }
  } catch(e) {}
  saveCategories(FACTORY_CATEGORIES);
  return [...FACTORY_CATEGORIES];
}

function saveCategories(cats) {
  try { localStorage.setItem(getCategoriesKey(), JSON.stringify(cats)); } catch(e) {}
}

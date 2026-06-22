function localSave(catId, data) {
  try { localStorage.setItem('btm_state_' + catId, JSON.stringify(data)); } catch(e) {}
}

function localLoad(catId) {
  try {
    const raw = localStorage.getItem('btm_state_' + catId);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function localClear(catId) {
  try { localStorage.removeItem('btm_state_' + catId); } catch(e) {}
}

function getCategories() {
  try {
    const raw = localStorage.getItem('btm_categories');
    if (raw) { const c = JSON.parse(raw); if (c.length) return c; }
  } catch(e) {}
  saveCategories(FACTORY_CATEGORIES);
  return [...FACTORY_CATEGORIES];
}

function saveCategories(cats) {
  try { localStorage.setItem('btm_categories', JSON.stringify(cats)); } catch(e) {}
}

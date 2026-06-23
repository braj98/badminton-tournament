function getStateKey(catId) {
  return 'btm_state_' + catId;
}

function getCategoriesKey() {
  return 'btm_categories';
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
  const templates = getTemplates();
  const events = getEvents();
  if (templates.length || events.length) {
    const result = [];
    for (const ev of events) {
      for (const tmplId of ev.templateIds) {
        const tmpl = templates.find(t => t.id === tmplId);
        if (tmpl) {
          result.push({ id: tmpl.id, label: tmpl.name, type: tmpl.type, sport: tmpl.sport, event: ev.name });
        }
      }
    }
    return result;
  }
  saveCategories(FACTORY_CATEGORIES);
  return [...FACTORY_CATEGORIES];
}

function saveCategories(cats) {
  const seen = {};
  const templates = [];
  for (const cat of cats) {
    const key = cat.label.toLowerCase() + '|' + cat.sport + '|' + cat.type;
    if (!seen[key]) {
      const tmpl = { id: cat.id, name: cat.label, sport: cat.sport, type: cat.type };
      seen[key] = tmpl;
      templates.push(tmpl);
    }
  }
  saveTemplates(templates);
  const eventMap = {};
  for (const cat of cats) {
    const evName = cat.event || APP_CONFIG.defaultEvent;
    const evId = evName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!eventMap[evName]) {
      eventMap[evName] = { id: evId, name: evName, templateIds: [], createdAt: Date.now() };
    }
    const key = cat.label.toLowerCase() + '|' + cat.sport + '|' + cat.type;
    const tmpl = seen[key];
    if (tmpl && !eventMap[evName].templateIds.includes(tmpl.id)) {
      eventMap[evName].templateIds.push(tmpl.id);
    }
  }
  saveEvents(Object.values(eventMap));
}

function runMigration() {
  if (localStorage.getItem('btm_migrated')) return;
  try {
    const raw = localStorage.getItem('btm_categories');
    if (!raw) { localStorage.setItem('btm_migrated', Date.now().toString()); return; }
    const cats = JSON.parse(raw);
    if (!cats || !cats.length) { localStorage.setItem('btm_migrated', Date.now().toString()); return; }
    saveCategories(cats);
    for (const cat of cats) {
      const oldKey = 'btm_state_' + cat.id;
      const state = localStorage.getItem(oldKey);
      if (!state) continue;
      const evId = (cat.event || APP_CONFIG.defaultEvent).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const tmpl = getTemplates().find(t => t.name === cat.label && t.sport === cat.sport && t.type === cat.type);
      if (tmpl) localStorage.setItem('btm_state_' + evId + '_' + tmpl.id, state);
    }
    localStorage.setItem('btm_migrated', Date.now().toString());
  } catch(e) {
    localStorage.setItem('btm_migrated', Date.now().toString());
  }
}

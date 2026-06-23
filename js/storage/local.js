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
  if (localStorage.getItem('btm_migrated')) {
    const templates = getTemplates();
    const events = getEvents();
    if (templates.length && events.length) {
      const result = [];
      for (const ev of events) {
        for (const tmplId of ev.templateIds) {
          const tmpl = templates.find(t => t.id === tmplId);
          if (tmpl) {
            result.push({ id: tmpl.id, label: tmpl.name, type: tmpl.type, sport: tmpl.sport, event: ev.name });
          }
        }
      }
      if (result.length > 0) return result;
    }
  }
  try {
    const raw = localStorage.getItem(getCategoriesKey());
    if (raw) { const c = JSON.parse(raw); if (c.length) return c; }
  } catch(e) {}
  saveCategories(FACTORY_CATEGORIES);
  return [...FACTORY_CATEGORIES];
}

function saveCategories(cats) {
  try { localStorage.setItem(getCategoriesKey(), JSON.stringify(cats)); } catch(e) {}
  if (!localStorage.getItem('btm_migrated')) return;
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
  const cats = (function() {
    try {
      const raw = localStorage.getItem(getCategoriesKey());
      if (raw) { const c = JSON.parse(raw); if (c.length) return c; }
    } catch(e) {}
    return null;
  })();
  if (!cats || cats.length === 0) {
    localStorage.setItem('btm_migrated', Date.now().toString());
    return;
  }
  const seen = {};
  const templates = [];
  const catToTemplate = {};
  for (const cat of cats) {
    const key = cat.label.toLowerCase() + '|' + cat.sport + '|' + cat.type;
    if (seen[key]) {
      catToTemplate[cat.id] = seen[key].id;
    } else {
      const tmpl = { id: cat.id, name: cat.label, sport: cat.sport, type: cat.type };
      seen[key] = tmpl;
      templates.push(tmpl);
      catToTemplate[cat.id] = tmpl.id;
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
    const tmplId = catToTemplate[cat.id];
    if (!eventMap[evName].templateIds.includes(tmplId)) {
      eventMap[evName].templateIds.push(tmplId);
    }
  }
  saveEvents(Object.values(eventMap));

  for (const cat of cats) {
    const oldKey = 'btm_state_' + cat.id;
    const raw = localStorage.getItem(oldKey);
    if (!raw) continue;
    const evId = (cat.event || APP_CONFIG.defaultEvent).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const tmplId = catToTemplate[cat.id];
    localStorage.setItem('btm_state_' + evId + '_' + tmplId, raw);
  }

  localStorage.setItem('btm_migrated', Date.now().toString());
}

function getStateKey(catId) {
  if (catId === '') return 'btm_state_';
  if (localStorage.getItem('btm_state_key_migrated')) {
    try {
      const cats = getCategories();
      const cat = cats.find(c => c.id === catId);
      if (cat && cat.eventId) {
        return 'btm_state_' + cat.eventId + '_' + catId;
      }
      if (AppState && AppState.eventId) {
        return 'btm_state_' + AppState.eventId + '_' + catId;
      }
    } catch(e) {}
  }
  return 'btm_state_' + catId;
}

function runStateKeyMigration() {
  if (localStorage.getItem('btm_state_key_migrated')) return;
  const cats = getCategories();
  for (const cat of cats) {
    if (!cat.eventId) continue;
    const oldKey = 'btm_state_' + cat.id;
    const newKey = 'btm_state_' + cat.eventId + '_' + cat.id;
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
    }
  }
  localStorage.setItem('btm_state_key_migrated', Date.now().toString());
}

function getCategoriesKey() {
  return 'btm_categories';
}

function localSave(catId, data) {
  try { localStorage.setItem(getStateKey(catId), JSON.stringify(data)); } catch(e) { console.error('localSave failed:', e); }
}

function localLoad(catId) {
  try {
    const raw = localStorage.getItem(getStateKey(catId));
    if (raw) return JSON.parse(raw);
  } catch(e) { console.error('localLoad failed:', e); }
  return null;
}

function localClear(catId) {
  try { localStorage.removeItem(getStateKey(catId)); } catch(e) { console.error('localClear failed:', e); }
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
          result.push({ id: tmpl.id, label: tmpl.name, type: tmpl.type, sport: tmpl.sport, event: ev.name, eventId: ev.id });
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
      eventMap[evName] = { id: evId, name: evName, templateIds: [], createdAt: Date.now(), organizationId: 'default' };
    }
    const key = cat.label.toLowerCase() + '|' + cat.sport + '|' + cat.type;
    const tmpl = seen[key];
    if (tmpl && !eventMap[evName].templateIds.includes(tmpl.id)) {
      eventMap[evName].templateIds.push(tmpl.id);
    }
  }
  saveEvents(Object.values(eventMap));
}

function getReportKey(eventId) {
  return 'btm_report_' + eventId;
}

function saveReport(eventId, report) {
  try { localStorage.setItem(getReportKey(eventId), JSON.stringify(report)); } catch(e) { console.error('saveReport failed:', e); }
  if (typeof upsertReport === 'function') upsertReport(eventId, report);
}

function loadReport(eventId) {
  try {
    var raw = localStorage.getItem(getReportKey(eventId));
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

async function loadCloudReport(eventId) {
  if (typeof fetchReport !== 'function') return loadReport(eventId);
  var local = loadReport(eventId);
  var cloud = await fetchReport(eventId);
  if (cloud && (!local || cloud.publishedAt >= local.publishedAt)) {
    saveReport(eventId, cloud);
    return cloud;
  }
  return local;
}

function deleteReport(eventId) {
  try { localStorage.removeItem(getReportKey(eventId)); } catch(e) {}
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

const EVENTS_KEY = 'btm_events';

function getEvents() {
  const migrated = localStorage.getItem('btm_migrated');
  if (migrated) {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      if (raw) { const e = JSON.parse(raw); if (e.length) return e; }
    } catch(e) {}
    return [];
  }
  return [...new Set(getCategories().map(c => c.event || APP_CONFIG.defaultEvent))];
}

function saveEvents(events) {
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch(e) {}
}

function createEvent(name) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return { id, name, templateIds: [], createdAt: Date.now() };
}

function addTemplateToEvent(eventId, templateId) {
  const events = getEvents();
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  if (!ev.templateIds.includes(templateId)) {
    ev.templateIds.push(templateId);
    saveEvents(events);
  }
}

function removeTemplateFromEvent(eventId, templateId) {
  const events = getEvents();
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  ev.templateIds = ev.templateIds.filter(id => id !== templateId);
  saveEvents(events);
}

function deleteEvent(eventName) {
  if (!isAdmin()) return;
  const cats = getCategories();
  const eventCats = cats.filter(c => (c.event || APP_CONFIG.defaultEvent) === eventName);
  for (const c of eventCats) {
    const saved = localLoad(c.id);
    if (saved && saved.phase !== 'setup') return false;
  }
  const remaining = cats.filter(c => (c.event || APP_CONFIG.defaultEvent) !== eventName);
  if (remaining.length === 0) return false;
  for (const c of eventCats) { localClear(c.id); }
  saveCategories(remaining);
  if (_supabase) {
    for (const c of eventCats) {
      _supabase.from('state').delete().eq('key', getStateKey(c.id)).then().catch(() => {});
    }
    upsertCategories(remaining);
  }
  if (AppState.event === eventName) {
    if (remaining.length > 0) {
      AppState.event = remaining[0].event || APP_CONFIG.defaultEvent;
      AppState.sport = remaining[0].sport;
    }
    AppState.category = null;
      AppState.tournament = defaultState();
      navigateTo('setup');
  }
  return true;
}

function renameEvent(oldName, newName) {
  if (!isAdmin()) return;
  const cats = getCategories();
  let changed = false;
  for (const c of cats) {
    if ((c.event || APP_CONFIG.defaultEvent) === oldName) { c.event = newName; changed = true; }
  }
  if (changed) {
    saveCategories(cats);
    if (_supabase) upsertCategories(cats);
    if (AppState.event === oldName) AppState.event = newName;
  }
}

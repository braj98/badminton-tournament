const EVENTS_KEY = 'btm_events';

function getEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) { const e = JSON.parse(raw); if (e.length) return e; }
  } catch(e) {}
  return [];
}

function saveEvents(events) {
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch(e) {}
}

function createEvent(name) {
  const events = getEvents();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (events.find(e => e.id === id)) return null;
  const ev = { id, name, templateIds: [], createdAt: Date.now() };
  events.push(ev);
  saveEvents(events);
  return ev;
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
  const events = getEvents();
  if (events.length <= 1) return false;
  const ev = events.find(e => e.name === eventName);
  if (!ev) return false;
  for (const tmplId of ev.templateIds) {
    const saved = localLoad(tmplId);
    if (saved && saved.phase !== 'setup') return false;
  }
  const remaining = events.filter(e => e.id !== ev.id);
  saveEvents(remaining);
  for (const tmplId of ev.templateIds) { localClear(tmplId); }
  if (_supabase) {
    for (const tmplId of ev.templateIds) {
      _supabase.from('state').delete().eq('key', getStateKey(tmplId)).then().catch(() => {});
    }
  }
  if (AppState.event === eventName) {
    if (remaining.length > 0) {
      AppState.event = remaining[0].name;
      AppState.sport = 'badminton';
    }
    AppState.category = null;
    AppState.tournament = defaultState();
    navigateTo('setup');
  }
  return true;
}

function renameEvent(oldName, newName) {
  if (!isAdmin()) return;
  const events = getEvents();
  let changed = false;
  for (const ev of events) {
    if (ev.name === oldName) { ev.name = newName; changed = true; break; }
  }
  if (changed) {
    saveEvents(events);
    if (AppState.event === oldName) AppState.event = newName;
  }
}

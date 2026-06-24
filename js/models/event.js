const EVENTS_KEY = 'btm_events';

function setCurrentEvent(eventName) {
  const ev = getEvents().find(function(e) { return e.name === eventName; });
  if (ev) setCurrentEventById(ev.id);
  else { AppState.event = eventName; AppState.eventId = null; }
}

function setCurrentEventById(eventId) {
  const ev = getEvents().find(function(e) { return e.id === eventId; });
  AppState.eventId = eventId;
  AppState.event = ev ? ev.name : null;
}

function getCurrentEventName() {
  if (AppState.eventId) {
    const ev = getEvents().find(e => e.id === AppState.eventId);
    if (ev) return ev.name;
  }
  return AppState.event;
}

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
  const ev = { id, name, templateIds: [], createdAt: Date.now(), organizationId: 'default' };
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

async function deleteEvent(eventId) {
  if (!isAdmin()) return;
  const events = getEvents();
  if (events.length <= 1) return false;
  const ev = events.find(e => e.id === eventId);
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
    await syncMetadataToCloud();
  }
  if (AppState.eventId === eventId) {
    if (remaining.length > 0) {
      setCurrentEvent(remaining[0].name);
      AppState.sport = 'badminton';
    }
    AppState.category = null;
    AppState.tournament = defaultState();
    navigateTo('setup');
  }
  return true;
}

function renameEventImpl(oldName, newName) {
  if (!isAdmin()) return 'not_admin';
  if (!newName || !newName.trim()) return 'empty';
  newName = newName.trim();
  if (newName === oldName) return null;
  const events = getEvents();
  if (events.find(e => e.name.toLowerCase() === newName.toLowerCase() && e.name !== oldName)) return 'duplicate';
  let found = false;
  let renamedId = null;
  for (const ev of events) {
    if (ev.name === oldName) { ev.name = newName; found = true; renamedId = ev.id; break; }
  }
  if (!found) return 'not_found';
  saveEvents(events);
  if (_supabase) syncMetadataToCloud();
  if (renamedId && AppState.eventId === renamedId) setCurrentEvent(newName);
  return null;
}

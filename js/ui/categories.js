// ===================== CATEGORY DEFINITIONS =====================
const DEFAULT_EVENT_ID = APP_CONFIG.defaultEvent.toLowerCase().replace(/[^a-z0-9]+/g, '_');
let _manageEventId = null;

const FACTORY_CATEGORIES = [
  { id: 'junior', label: 'Junior', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'junior_doubles', label: 'Jr Dbls', type: 'doubles', sport: 'badminton', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'senior_boys', label: 'Sr Boys', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'senior_girls', label: 'Sr Girls', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'senior_doubles', label: 'Sr Dbls', type: 'doubles', sport: 'badminton', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'tt_singles', label: 'TT Singles', type: 'singles', sport: 'tableTennis', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
  { id: 'tt_doubles', label: 'TT Dbls', type: 'doubles', sport: 'tableTennis', event: APP_CONFIG.defaultEvent, eventId: DEFAULT_EVENT_ID },
];

function migrateCategorySports() {
  const cats = getCategories();
  let changed = false;
  for (const c of cats) {
    if (!c.sport) { c.sport = 'badminton'; changed = true; }
    if (!c.event) { c.event = APP_CONFIG.defaultEvent; changed = true; }
  }
  if (changed) saveCategories(cats);
}

// ===================== AUTH UI =====================
function updateBanners() {
  const ab = document.getElementById('adminBanner');
  if (ab) {
    if (isAdmin()) ab.classList.remove('hidden');
    else ab.classList.add('hidden');
  }
  const mb = document.getElementById('modeBanner');
  if (mb) {
    if (isAdmin()) {
      mb.textContent = '🔧 Admin Mode';
      mb.classList.add('mode-admin');
      mb.classList.remove('mode-viewer');
    } else {
      mb.textContent = '👁 Viewer Mode';
      mb.classList.add('mode-viewer');
      mb.classList.remove('mode-admin');
    }
  }
}

// ===================== SPORT BAR =====================
function renderSportBar() {
  const bar = document.getElementById('sportBar');
  if (!bar) return;
  if (AppState.view === 'home' || AppState.view === 'results' || AppState.ui.showingResults) {
    bar.innerHTML = '';
    return;
  }
  const labels = { badminton: 'Badminton', tableTennis: 'Table Tennis', chess: 'Chess' };
  const ev = getEvents().find(e => e.id === AppState.eventId);
  const templates = getTemplates();
  const sportSet = new Set();
  if (ev) {
    for (const tmplId of ev.templateIds) {
      const t = templates.find(tm => tm.id === tmplId);
      if (t) sportSet.add(t.sport);
    }
  }
  bar.innerHTML = '';
  for (const s of ['badminton', 'tableTennis', 'chess']) {
    if (!sportSet.has(s)) continue;
    const btn = document.createElement('button');
    btn.className = 'sport-btn' + (s === AppState.sport ? ' active' : '');
    btn.textContent = labels[s] || s;
    btn.onclick = function() { switchSport(s); };
    bar.appendChild(btn);
  }
}

function switchSport(sport) {
  if (sport === AppState.sport) return;
  goToSportPage(getCurrentEventName(), sport);
}

// ===================== EVENT BAR =====================
function renderEventBar() {
  const bar = document.getElementById('eventBar');
  if (!bar) return;
  const events = getEvents();
  bar.innerHTML = '';
  for (const ev of events) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:2px;';
    const btn = document.createElement('button');
    btn.className = 'event-btn' + (ev.id === AppState.eventId ? ' active' : '');
    btn.textContent = ev.name;
    btn.onclick = function() { switchEvent(ev.name); };
    wrap.appendChild(btn);
    if (isAdmin()) {
      const rmBtn = document.createElement('button');
      rmBtn.textContent = '✏️';
      rmBtn.title = 'Rename "' + ev.name + '"';
      rmBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:.7rem;padding:2px;line-height:1;opacity:0.5;';
      rmBtn.onmouseover = function() { this.style.opacity = '1'; };
      rmBtn.onmouseout = function() { this.style.opacity = '0.5'; };
      rmBtn.onclick = function(e) { e.stopPropagation(); renameEvent(ev.name); };
      wrap.appendChild(rmBtn);
    }
    bar.appendChild(wrap);
  }
}

function renameEvent(oldName) {
  if (!isAdmin()) return;
  const newName = prompt('Rename "' + oldName + '" to:', oldName);
  if (!newName || newName.trim() === oldName) return;
  const result = renameEventImpl(oldName, newName.trim());
  if (result === 'duplicate') { alert('An event with this name already exists.'); return; }
  if (result === 'not_found') { alert('Event not found.'); return; }
  if (result === 'not_admin') return;
  renderEventBar();
  var panel = document.getElementById('managePanel');
  if (panel && !panel.classList.contains('hidden')) {
    renderManagePanel();
  }
  if (AppState.category) {
    const s = localLoad(AppState.category);
    if (s) {
      AppState.tournament = s;
      AppState.view = s.phase;
    }
  }
  renderAll();
}

function switchEvent(evName) {
  const ev = getEvents().find(function(e) { return e.name === evName; });
  if (!ev || ev.id === AppState.eventId) return;
  goToEventPage(evName);
}

// ===================== TEMPLATE MANAGEMENT =====================
function addTemplateToCurrentEvent() {
  if (!isAdmin()) return;
  const label = document.getElementById('newTemplateLabel').value.trim();
  if (!label) { document.getElementById('eventTemplateError').textContent = 'Label is required.'; return; }
  const sport = document.getElementById('newTemplateSport').value;
  const type = document.getElementById('newTemplateType').value;
  const events = getEvents();
  const ev = events.find(function(e) { return e.id === AppState.eventId; });
  if (!ev) return;
    const templates = getTemplates();
  const key = label.toLowerCase() + '|' + sport + '|' + type;
  const existing = templates.find(function(t) { return (t.name.toLowerCase() + '|' + t.sport + '|' + t.type) === key; });
  let tmpl;
  if (existing) {
    tmpl = existing;
  } else {
    tmpl = { id: createTemplateId(label), name: label, sport: sport, type: type };
    templates.push(tmpl);
    saveTemplates(templates);
  }
  if (ev.templateIds.indexOf(tmpl.id) === -1) {
    ev.templateIds.push(tmpl.id);
    saveEvents(events);
  }
  if (_supabase) syncMetadataToCloud();
  document.getElementById('newTemplateLabel').value = '';
  document.getElementById('eventTemplateError').textContent = '';
  renderEventPage();
}

function toggleConfirmRemoveFromEvent(templateId) {
  const div = document.getElementById('confirmRemoveFromEvent_' + templateId);
  div.classList.toggle('hidden');
  const input = document.getElementById('confirmRemoveFromEventInput_' + templateId);
  if (input) input.value = '';
}

function executeRemoveFromEvent(templateId) {
  const input = document.getElementById('confirmRemoveFromEventInput_' + templateId);
  if (!input || input.value !== 'REMOVE') return;
  removeTemplateFromCurrentEvent(templateId);
}

function removeTemplateFromCurrentEvent(templateId) {
  if (!isAdmin()) return;
  const events = getEvents();
  const ev = events.find(function(e) { return e.id === AppState.eventId; });
  if (!ev) return;
  ev.templateIds = ev.templateIds.filter(function(id) { return id !== templateId; });
  saveEvents(events);
  if (_supabase) syncMetadataToCloud();
  renderEventPage();
}

function createEventFromHome() {
  if (!isAdmin()) return;
  const name = prompt('Event name:');
  if (!name || !name.trim()) return;
  const ev = createEvent(name.trim());
  if (!ev) { alert('Event already exists.'); return; }
  if (_supabase) syncMetadataToCloud();
  setCurrentEvent(ev.name);
  renderHomePage();
  goToEventPage(getCurrentEventName());
}

// ===================== CATEGORY SWITCHING =====================
async function switchCategory(catId) {
  if (catId === AppState.category) return;
  AppState.loadingCategory = catId;
  if (AppState.category && AppState.tournament && AppState.tournament.phase !== 'setup') { saveState(); await flushCloudSave(); }
  if (AppState.loadingCategory !== catId) return;
  AppState.category = catId;
  const tmpl = getTemplates().find(t => t.id === catId);
  if (tmpl) { AppState.sport = tmpl.sport; }
  const cat = getCategories().find(c => c.id === catId);
  if (cat) { setCurrentEvent(cat.event || APP_CONFIG.defaultEvent); }
  let serverState = null;
  if (_supabase) {
    serverState = await fetchState(catId).catch(() => null);
  }
  if (AppState.loadingCategory !== catId) return;
  if (serverState) {
    AppState.tournament = serverState;
    migrateMatchStatus();
    localSave(catId, AppState.tournament);
  } else {
    const saved = localLoad(catId);
    if (saved && saved.phase && saved.phase !== 'setup') {
      AppState.tournament = saved;
      migrateMatchStatus();
    } else {
      AppState.tournament = defaultState();
      if (tmpl) AppState.tournament.sport = tmpl.sport;
      if (tmpl) AppState.tournament.format = tmpl.type;
    }
  }
  AppState.view = AppState.tournament.phase;
  navigateTo(AppState.tournament.phase);
}

// ===================== CATEGORY BAR =====================
function renderCategoryBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = '';
  const ev = getEvents().find(e => e.id === AppState.eventId);
  if (!ev) return;
  const templates = getTemplates();
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl || tmpl.sport !== AppState.sport) continue;
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (tmpl.id === AppState.category ? ' active' : '');
    const s = localLoad(tmpl.id);
    let dotClass = 'setup';
    if (s) {
      if (s.phase === 'champion') dotClass = 'done';
      else if (s.phase !== 'setup') dotClass = 'playing';
    }
    btn.innerHTML = '<span class="dot ' + dotClass + '"></span>' + escapeHtml(tmpl.name);
    btn.onclick = function() { switchCategory(tmpl.id); };
    bar.appendChild(btn);
  }
}

// ===================== RESET =====================
function showResetConfirm() {
  if (!isAdmin()) return;
  const box = document.getElementById('resetConfirmBox');
  if (!box) return;
  box.style.display = '';
  box.classList.toggle('hidden');
  document.getElementById('resetConfirmInput').value = '';
  document.getElementById('resetError').textContent = '';
}

function executeReset() {
  if (!isAdmin()) return;
  const input = document.getElementById('resetConfirmInput');
  if (input.value !== 'RESET') {
    document.getElementById('resetError').textContent = 'Please type RESET to confirm.';
    return;
  }
  resetCategory(AppState.category);
  document.getElementById('resetConfirmBox').classList.add('hidden');
}

function resetCategory(catId) {
  if (!isAdmin()) return;
  localClear(catId);
  if (_supabase) {
    _supabase.from('state').delete().eq('key', getStateKey(catId)).then().catch((e) => { console.error('resetCategory delete failed:', e); });
  }
  if (AppState.category === catId) {
    AppState.tournament = defaultState();
    navigateTo(AppState.tournament.phase);
  } else {
    renderCategoryBar();
  }
  const panel = document.getElementById('managePanel');
  if (!panel.classList.contains('hidden')) renderManagePanel();
}

// ===================== MANAGE PANEL =====================
function toggleManagePanel() {
  if (!isAdmin()) return;
  const panel = document.getElementById('managePanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    renderManagePanel();
  }
}

// ===================== SETTINGS =====================
function loadSettings() {
  try {
    const raw = localStorage.getItem('btm_settings');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { darkMode: false };
}

function saveSettings(settings) {
  try { localStorage.setItem('btm_settings', JSON.stringify(settings)); } catch(e) {}
}

function toggleDarkMode() {
  const settings = loadSettings();
  settings.darkMode = !settings.darkMode;
  saveSettings(settings);
  document.body.classList.toggle('dark-mode', settings.darkMode);
  renderSettings();
}

function renderSettings() {
  const section = document.getElementById('settingsSection');
  if (!section) return;
  section.classList.remove('hidden');
  const settings = loadSettings();
  const container = document.getElementById('settingsContent');
  container.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">'
    + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">'
    + '<input type="checkbox" onchange="toggleDarkMode()"' + (settings.darkMode ? ' checked' : '') + '>'
    + ' <span>Dark Mode</span>'
    + '</label>'
    + '</div>';
}

function renderManagePanel() {
  renderSettings();

  // --- Events Section ---
  const evContainer = document.getElementById('manageEventsList');
  if (evContainer) {
    const events = getEvents();
    let evHtml = '';
    for (const ev of events) {
      const hasRunning = ev.templateIds.some(function(id) {
        const s = localLoad(id);
        return s && s.phase !== 'setup';
      });
      evHtml += '<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">'
        + '<div><strong style="font-size:.85rem;">' + escapeHtml(ev.name) + '</strong>'
        + '<span style="font-size:.7rem;color:var(--text-muted);margin-left:8px;">' + ev.templateIds.length + ' competitions</span></div>'
        + '<div style="display:flex;gap:6px;">'
        + '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.7rem;" onclick="renameEventFromManage(\'' + escapeHtml(ev.name) + '\')">✏️</button>'
        + '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.7rem;" ' + (hasRunning ? 'disabled title="Has running tournaments"' : '') + ' onclick="toggleEventDeleteConfirm(\'' + ev.id + '\')">✕</button>'
        + '</div></div>'
        + '<div id="manageDeleteEventConfirm_' + ev.id + '" class="hidden" style="margin-top:6px;background:var(--danger-light);border:1px solid var(--danger);border-radius:6px;padding:6px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-size:.7rem;color:var(--danger);font-weight:500;">Type DELETE:</span>'
        + '<input type="text" id="manageDeleteEventInput_' + ev.id + '" style="flex:1;min-width:60px;padding:3px 6px;border:2px solid var(--danger);border-radius:6px;font-size:.75rem;" placeholder="DELETE">'
        + '<button class="btn" style="padding:3px 8px;font-size:.7rem;background:var(--danger);" onclick="executeEventDelete(\'' + ev.id + '\')">Go</button>'
        + '<button class="btn btn-secondary" style="padding:3px 8px;font-size:.7rem;" onclick="toggleEventDeleteConfirm(\'' + ev.id + '\')">Cancel</button>'
        + '</div>';
    }
    evHtml += '<div style="margin-top:8px;"><button class="btn btn-sm btn-secondary" onclick="createEventFromHome()" style="font-size:.75rem;">➕ New Event</button></div>';
    evContainer.innerHTML = evHtml;
  }

  // --- Competitions Section ---
  const tmplContainer = document.getElementById('manageTemplateList');
  if (!tmplContainer) return;
  const allEvents = getEvents();
  const templates = getTemplates();

  // Init manage event selection
  if (!_manageEventId || !allEvents.find(function(e) { return e.id === _manageEventId; })) {
    _manageEventId = AppState.eventId && allEvents.find(function(e) { return e.id === AppState.eventId; }) ? AppState.eventId : allEvents.length > 0 ? allEvents[0].id : null;
  }
  const manageEv = allEvents.find(function(e) { return e.id === _manageEventId; });
  const evTemplates = manageEv ? templates.filter(function(t) { return manageEv.templateIds.indexOf(t.id) !== -1; }) : [];

  // Event dropdown + add form inline
  let html = '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap;">'
    + '<label style="font-size:.8rem;font-weight:600;white-space:nowrap;">Event:</label>'
    + '<select id="manageEventSelect" onchange="changeManageEvent(this.value)" style="flex:1;min-width:120px;padding:6px 8px;border:2px solid var(--border);border-radius:6px;font-size:.8rem;">';
  for (const ev of allEvents) {
    html += '<option value="' + ev.id + '"' + (ev.id === _manageEventId ? ' selected' : '') + '>' + escapeHtml(ev.name) + '</option>';
  }
  html += '</select>'
    + '<div style="display:flex;gap:4px;flex-shrink:0;"><input type="text" id="manageNewTemplateLabel" placeholder="New competition name" style="padding:6px 8px;border:2px solid var(--border);border-radius:6px;font-size:.8rem;width:140px;">'
    + '<select id="manageNewTemplateSport" class="form-input" style="font-size:.8rem;width:auto;"><option value="badminton">🏸</option><option value="tableTennis">🏓</option><option value="chess">♟</option></select>'
    + '<select id="manageNewTemplateType" class="form-input" style="font-size:.8rem;width:auto;"><option value="singles">S</option><option value="doubles">D</option></select>'
    + '<button class="btn btn-sm" onclick="addTemplateFromManage()" style="font-size:.75rem;">➕ Add</button></div>'
    + '</div>'
    + '<span id="manageTemplateError" style="font-size:.7rem;color:var(--danger);display:block;margin-bottom:8px;"></span>';

  if (!manageEv) {
    html += '<p class="text-muted" style="padding:16px 0;text-align:center;">No event selected.</p>';
    tmplContainer.innerHTML = html;
    return;
  }

  for (const tmpl of evTemplates) {
    const saved = localLoad(tmpl.id);
    const running = saved && saved.phase !== 'setup';
    const statusIcon = !saved ? '⚪' : saved.phase === 'champion' ? '🏆' : saved.phase === 'setup' ? '⚪' : '🟢';
    const statusLabel = !saved ? 'Not Started' : saved.phase === 'champion' ? 'Complete' : saved.phase === 'setup' ? 'Not Started' : 'In Progress';
    const participantCount = (saved && saved.participants) ? saved.participants.length : 0;
    const countLabel = (tmpl.type || 'singles') === 'doubles' ? 'teams' : 'players';

    html += '<div id="manageTmplRow_' + tmpl.id + '" style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      + '  <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">'
      + '    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
      + '      <span style="font-size:1rem;">' + getSportIcon(tmpl.sport) + '</span>'
      + '      <span style="font-weight:600;font-size:.85rem;">' + escapeHtml(tmpl.name) + '</span>'
      + '      <span style="font-size:.6rem;text-transform:uppercase;background:var(--primary-light);color:var(--text-muted);padding:1px 5px;border-radius:4px;font-weight:600;">' + tmpl.type + '</span>'
      + '    </div>'
      + '    <div style="font-size:.7rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;">'
      +       '<span>' + statusIcon + ' ' + statusLabel + '</span>'
      +       (participantCount > 0 ? '<span>·</span><span>' + participantCount + ' ' + countLabel + '</span>' : '')
      + '    </div>'
      + '  </div>'
      + '  <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">'
      + '<button class="btn btn-secondary" style="padding:3px 6px;font-size:.7rem;" onclick="toggleEditTemplate(\'' + tmpl.id + '\')">✏️</button>'
      + (running ? '<button class="btn btn-outline" style="padding:3px 6px;font-size:.7rem;border-color:var(--danger);color:var(--danger);" onclick="toggleManageReset(\'' + tmpl.id + '\')">Reset</button>' : '')
      + '<button class="btn btn-secondary" style="padding:3px 8px;font-size:.7rem;" ' + (running ? 'disabled title="Has running tournament"' : '') + ' onclick="toggleDeleteTemplateConfirm(\'' + tmpl.id + '\')">✕</button>'
      + '  </div>'
      + '</div>'
      + '<div id="manageEditTmpl_' + tmpl.id + '" class="hidden" style="margin-top:6px;background:var(--primary-light);border:1px solid var(--border);border-radius:6px;padding:8px;">'
      + '  <div class="form-row" style="gap:6px;">'
      + '    <div class="form-field"><input type="text" id="editTmplLabel_' + tmpl.id + '" class="form-input" value="' + escapeHtml(tmpl.name) + '" style="font-size:.8rem;"></div>'
      + '    <div class="form-field"><select id="editTmplType_' + tmpl.id + '" class="form-input" style="font-size:.8rem;"><option value="singles"' + (tmpl.type === 'singles' ? ' selected' : '') + '>Singles</option><option value="doubles"' + (tmpl.type === 'doubles' ? ' selected' : '') + '>Doubles</option></select></div>'
      + '    <div class="form-field"><select id="editTmplSport_' + tmpl.id + '" class="form-input" style="font-size:.8rem;"><option value="badminton"' + (tmpl.sport === 'badminton' ? ' selected' : '') + '>🏸 Badminton</option><option value="tableTennis"' + (tmpl.sport === 'tableTennis' ? ' selected' : '') + '>🏓 TT</option><option value="chess"' + (tmpl.sport === 'chess' ? ' selected' : '') + '>♟ Chess</option></select></div>'
      + '    <div style="display:flex;gap:4px;align-items:flex-end;">'
      + '      <button class="btn" style="padding:4px 10px;font-size:.75rem;" onclick="saveTemplateEdit(\'' + tmpl.id + '\')">Save</button>'
      + '      <button class="btn btn-secondary" style="padding:4px 10px;font-size:.75rem;" onclick="toggleEditTemplate(\'' + tmpl.id + '\')">Cancel</button>'
      + '    </div>'
      + '  </div>'
      + '</div>'
      + (running ? '<div id="manageReset_' + tmpl.id + '" class="hidden" style="margin-top:6px;background:var(--danger-light);border:1px solid var(--danger);border-radius:6px;padding:6px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-size:.7rem;color:var(--danger);font-weight:500;">Type RESET:</span>'
        + '<input type="text" id="manageResetInput_' + tmpl.id + '" style="flex:1;min-width:60px;padding:3px 6px;border:2px solid var(--danger);border-radius:6px;font-size:.75rem;" placeholder="RESET">'
        + '<button class="btn" style="padding:3px 8px;font-size:.7rem;background:var(--danger);" onclick="executeManageReset(\'' + tmpl.id + '\')">Go</button></div>' : '')
      + (!running ? '<div id="manageDeleteTmplConfirm_' + tmpl.id + '" class="hidden" style="margin-top:6px;background:var(--danger-light);border:1px solid var(--danger);border-radius:6px;padding:6px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-size:.7rem;color:var(--danger);font-weight:500;">Type DELETE:</span>'
        + '<input type="text" id="manageDeleteTmplInput_' + tmpl.id + '" style="flex:1;min-width:60px;padding:3px 6px;border:2px solid var(--danger);border-radius:6px;font-size:.75rem;" placeholder="DELETE">'
        + '<button class="btn" style="padding:3px 8px;font-size:.7rem;background:var(--danger);" onclick="executeDeleteTemplate(\'' + tmpl.id + '\')">Go</button></div>' : '')
      + '</div>';
  }
  tmplContainer.innerHTML = html;
}


function toggleManageReset(catId) {
  const div = document.getElementById('manageReset_' + catId);
  div.classList.toggle('hidden');
  const input = document.getElementById('manageResetInput_' + catId);
  if (input) input.value = '';
}

function executeManageReset(catId) {
  if (!isAdmin()) return;
  const input = document.getElementById('manageResetInput_' + catId);
  if (!input || input.value !== 'RESET') return;
  resetCategory(catId);
}

// --- Template management from Manage panel ---

function changeManageEvent(eventId) {
  _manageEventId = eventId;
  renderManagePanel();
}

function addTemplateFromManage() {
  if (!isAdmin()) return;
  const label = document.getElementById('manageNewTemplateLabel').value.trim();
  if (!label) { document.getElementById('manageTemplateError').textContent = 'Name is required.'; return; }
  const sport = document.getElementById('manageNewTemplateSport').value;
  const type = document.getElementById('manageNewTemplateType').value;
  const templates = getTemplates();
  const key = label.toLowerCase() + '|' + sport + '|' + type;
  if (templates.find(function(t) { return (t.name.toLowerCase() + '|' + t.sport + '|' + t.type) === key; })) {
    document.getElementById('manageTemplateError').textContent = 'Already exists.';
    return;
  }
  const id = createTemplateId(label);
  templates.push({ id: id, name: label, sport: sport, type: type });
  saveTemplates(templates);
  // Link to selected manage event
  const events = getEvents();
  const ev = events.find(function(e) { return e.id === _manageEventId; });
  if (ev && ev.templateIds.indexOf(id) === -1) {
    ev.templateIds.push(id);
    saveEvents(events);
  }
  if (_supabase) syncMetadataToCloud();
  document.getElementById('manageNewTemplateLabel').value = '';
  document.getElementById('manageTemplateError').textContent = '';
  renderManagePanel();
}

function toggleEditTemplate(tmplId) {
  const div = document.getElementById('manageEditTmpl_' + tmplId);
  if (div) div.classList.toggle('hidden');
}

function saveTemplateEdit(tmplId) {
  if (!isAdmin()) return;
  const templates = getTemplates();
  const tmpl = templates.find(function(t) { return t.id === tmplId; });
  if (!tmpl) return;
  tmpl.name = document.getElementById('editTmplLabel_' + tmplId).value.trim() || tmpl.name;
  tmpl.type = document.getElementById('editTmplType_' + tmplId).value;
  tmpl.sport = document.getElementById('editTmplSport_' + tmplId).value;
  saveTemplates(templates);
  if (_supabase) syncMetadataToCloud();
  renderManagePanel();
}

function linkTemplateToEvent(tmplId) {
  if (!isAdmin()) return;
  const events = getEvents();
  const ev = events.find(function(e) { return e.id === AppState.eventId; });
  if (!ev) return;
  if (ev.templateIds.indexOf(tmplId) >= 0) return;
  ev.templateIds.push(tmplId);
  saveEvents(events);
  if (_supabase) syncMetadataToCloud();
  renderManagePanel();
}

function toggleDeleteTemplateConfirm(tmplId) {
  const div = document.getElementById('manageDeleteTmplConfirm_' + tmplId);
  if (!div) return;
  div.classList.toggle('hidden');
  const input = document.getElementById('manageDeleteTmplInput_' + tmplId);
  if (input) input.value = '';
}

function executeDeleteTemplate(tmplId) {
  if (!isAdmin()) return;
  const input = document.getElementById('manageDeleteTmplInput_' + tmplId);
  if (!input || input.value !== 'DELETE') return;
  // Remove from all events
  const events = getEvents();
  for (const ev of events) {
    ev.templateIds = ev.templateIds.filter(function(id) { return id !== tmplId; });
  }
  saveEvents(events);
  // Clear state
  localClear(tmplId);
  if (_supabase) {
    _supabase.from('state').delete().eq('key', getStateKey(tmplId)).then().catch(function(e) { console.error('executeDeleteTemplate delete failed:', e); });
  }
  // Remove from templates list
  const templates = getTemplates();
  const remaining = templates.filter(function(t) { return t.id !== tmplId; });
  saveTemplates(remaining);
  if (_supabase) syncMetadataToCloud();
  if (AppState.category === tmplId) {
    AppState.category = null;
    AppState.tournament = defaultState();
  }
  renderManagePanel();
}

function renameEventFromManage(oldName) {
  if (!isAdmin()) return;
  const newName = prompt('Rename event "' + oldName + '" to:', oldName);
  if (!newName || newName.trim() === '' || newName === oldName) return;
  renameEvent(oldName, newName.trim());
  renderManagePanel();
  renderAll();
}

function toggleEventDeleteConfirm(eventId) {
  const div = document.getElementById('manageDeleteEventConfirm_' + eventId);
  if (!div) return;
  div.classList.toggle('hidden');
  const input = document.getElementById('manageDeleteEventInput_' + eventId);
  if (input) input.value = '';
}

async function executeEventDelete(eventId) {
  if (!isAdmin()) return;
  const input = document.getElementById('manageDeleteEventInput_' + eventId);
  if (!input || input.value !== 'DELETE') return;
  const result = await deleteEvent(eventId);
  if (result === false) { alert('Cannot delete: has running tournaments or only event.'); }
  renderManagePanel();
  renderAll();
}

function deleteEventFromManage(eventId) {
  if (!isAdmin()) return;
  const ev = getEvents().find(e => e.id === eventId);
  if (!ev) return;
  toggleEventDeleteConfirm(eventId);
}

function populateEventDropdown(selectId, selectedEvent) {
  var el = document.getElementById(selectId);
  if (!el) return;
  var events = getEvents().map(function(e) { return e.name; });
  events.sort();
  el.innerHTML = '';
  for (var i = 0; i < events.length; i++) {
    var opt = document.createElement('option');
    opt.value = events[i];
    opt.textContent = events[i];
    if (events[i] === selectedEvent) opt.selected = true;
    el.appendChild(opt);
  }
  var newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = 'New Event…';
  el.appendChild(newOpt);
  el.onchange = function() {
    var custom = document.getElementById(selectId + 'Custom');
    if (custom) custom.classList.toggle('hidden', el.value !== '__new__');
  };
}

// ===================== RESUME =====================
function resumeTournament() {
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
    migrateMatchStatus();
    navigateTo(AppState.tournament.phase);
  }
}

// ===================== EXPORT / IMPORT =====================
function exportAll() {
  const cats = getCategories();
  const states = {};
  for (const c of cats) {
    const s = localLoad(c.id);
    if (s) states[c.id] = s;
  }
  const data = { exportedAt: new Date().toISOString(), categories: cats, states: states };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'badminton-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function pushAllToCloud() {
  if (!isAdmin()) return;
  if (!_supabase) { alert('Supabase not connected.'); return; }
  await syncMetadataToCloud();
  const cats = getCategories();
  let pushed = 0, failed = 0;
  for (const c of cats) {
    const s = localLoad(c.id);
    if (!s) continue;
    const { error } = await _supabase.from('state').upsert({ key: getStateKey(c.id), data: s }, { onConflict: 'key' });
    if (error) { failed++; console.warn('Failed to push ' + c.label + ':', error.message); }
    else pushed++;
  }
  alert('Synced metadata + ' + pushed + ' tournament states to cloud.' + (failed ? ' ' + failed + ' failed.' : ''));
}

let _pendingImportData = null;

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  _pendingImportData = null;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.categories || !data.states) {
        alert('Invalid export file: missing categories or states.');
        return;
      }
      _pendingImportData = data;
      const cats = data.categories;
      const active = Object.keys(data.states).filter(id => {
        const s = data.states[id];
        return s && s.phase !== 'setup';
      });
      const warnEl = document.getElementById('importWarningCount');
      if (active.length > 0) {
        warnEl.innerHTML = active.length + ' (includes ' + active.length + ' in-progress)';
      } else {
        warnEl.textContent = cats.length;
      }
      document.getElementById('importConfirmBox').classList.remove('hidden');
      document.getElementById('importConfirmInput').value = '';
    } catch(err) {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function cancelImport() {
  document.getElementById('importConfirmBox').classList.add('hidden');
  document.getElementById('importConfirmError').textContent = '';
  _pendingImportData = null;
}

function confirmImport() {
  if (!isAdmin()) return;
  const input = document.getElementById('importConfirmInput');
  const errEl = document.getElementById('importConfirmError');
  if (input.value !== 'IMPORT') { errEl.textContent = 'Please type IMPORT to confirm.'; return; }
  errEl.textContent = '';
  document.getElementById('importConfirmBox').classList.add('hidden');
  if (!_pendingImportData) return;
  const data = _pendingImportData;
  _pendingImportData = null;
  saveCategories(data.categories);
  if (_supabase) syncMetadataToCloud();
  for (const id of Object.keys(data.states)) {
    try { localStorage.setItem(getStateKey(id), JSON.stringify(data.states[id])); } catch(e) {}
    if (_supabase) upsertState(id, data.states[id]);
  }
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
  } else {
    AppState.tournament = defaultState();
  }
  AppState.view = AppState.tournament.phase;
  navigateTo(AppState.tournament.phase);
  if (!document.getElementById('managePanel').classList.contains('hidden')) renderManagePanel();
}

// Init settings
const _settings = loadSettings();
if (_settings.darkMode) document.body.classList.add('dark-mode');

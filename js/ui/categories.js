// ===================== CATEGORY DEFINITIONS =====================
const FACTORY_CATEGORIES = [
  { id: 'junior', label: 'Junior', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent },
  { id: 'junior_doubles', label: 'Jr Dbls', type: 'doubles', sport: 'badminton', event: APP_CONFIG.defaultEvent },
  { id: 'senior_boys', label: 'Sr Boys', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent },
  { id: 'senior_girls', label: 'Sr Girls', type: 'singles', sport: 'badminton', event: APP_CONFIG.defaultEvent },
  { id: 'senior_doubles', label: 'Sr Dbls', type: 'doubles', sport: 'badminton', event: APP_CONFIG.defaultEvent },
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
  const ev = getEvents().find(e => e.name === AppState.event);
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
  goToSportPage(AppState.event, sport);
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
    btn.className = 'event-btn' + (ev.name === AppState.event ? ' active' : '');
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
  if (!newName || newName === oldName) return;
  const events = getEvents();
  let changed = false;
  for (const ev of events) {
    if (ev.name === oldName) { ev.name = newName; changed = true; break; }
  }
  if (!changed) return;
  saveEvents(events);
  if (_supabase) syncMetadataToCloud();
  if (AppState.event === oldName) AppState.event = newName;
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

function switchEvent(ev) {
  if (ev === AppState.event) return;
  goToEventPage(ev);
}

// ===================== TEMPLATE MANAGEMENT =====================
function addTemplateToCurrentEvent() {
  if (!isAdmin()) return;
  const label = document.getElementById('newTemplateLabel').value.trim();
  if (!label) { document.getElementById('eventTemplateError').textContent = 'Label is required.'; return; }
  const sport = document.getElementById('newTemplateSport').value;
  const type = document.getElementById('newTemplateType').value;
  const ev = getEvents().find(function(e) { return e.name === AppState.event; });
  if (!ev) return;
  const templates = getTemplates();
  const key = label.toLowerCase() + '|' + sport + '|' + type;
  const existing = templates.find(function(t) { return (t.name.toLowerCase() + '|' + t.sport + '|' + t.type) === key; });
  let tmpl;
  if (existing) {
    tmpl = existing;
  } else {
    const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 't';
    let id = baseId;
    let counter = 1;
    while (templates.find(function(t) { return t.id === id; })) { id = baseId + '_' + counter++; }
    tmpl = { id: id, name: label, sport: sport, type: type };
    templates.push(tmpl);
    saveTemplates(templates);
  }
  if (ev.templateIds.indexOf(tmpl.id) === -1) {
    ev.templateIds.push(tmpl.id);
    saveEvents(getEvents());
  }
  if (_supabase) syncMetadataToCloud();
  document.getElementById('newTemplateLabel').value = '';
  document.getElementById('eventTemplateError').textContent = '';
  renderEventPage();
}

function removeTemplateFromCurrentEvent(templateId) {
  if (!isAdmin()) return;
  const events = getEvents();
  const ev = events.find(function(e) { return e.name === AppState.event; });
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
  AppState.event = ev.name;
  renderHomePage();
  goToEventPage(AppState.event);
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
  if (cat) { AppState.event = cat.event || APP_CONFIG.defaultEvent; }
  let serverState = null;
  if (_supabase) {
    serverState = await fetchState(catId).catch(() => null);
  }
  if (AppState.loadingCategory !== catId) return;
  if (serverState) {
    AppState.tournament = serverState;
    localSave(catId, AppState.tournament);
  } else {
    const saved = localLoad(catId);
    if (saved && saved.phase && saved.phase !== 'setup') {
      AppState.tournament = saved;
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
  const ev = getEvents().find(e => e.name === AppState.event);
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
    _supabase.from('state').delete().eq('key', getStateKey(catId)).then().catch(() => {});
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
  const container = document.getElementById('manageCategoryList');
  if (!container) return;
  const cats = getCategories();
  let html = '';
  for (const c of cats) {
    const saved = localLoad(c.id);
    const running = saved && saved.phase !== 'setup';
    const sportName = getSportLabel(c.sport);
    const sportIcon = getSportIcon(c.sport);
    const eventName = c.event || APP_CONFIG.defaultEvent;
    
    html += '<div id="manageRow_' + c.id + '" style="padding:10px 0;border-bottom:1px solid var(--border);">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">'
      + '  <div style="display:flex;flex-direction:column;gap:2px;">'
      + '    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
      + '      <span style="font-size:1.1rem;">' + sportIcon + '</span>'
      + '      <span style="font-weight:600;font-size:0.9rem;color:var(--text-main);">' + escapeHtml(c.label) + '</span>'
      + '      <span style="font-size:0.65rem;text-transform:uppercase;background:#f1f5f9;color:var(--text-muted);padding:1px 6px;border-radius:4px;font-weight:600;">' + c.type + '</span>'
      + '    </div>'
      + '    <span style="font-size:0.75rem;color:var(--text-muted);">' + escapeHtml(eventName) + ' • ' + sportName + '</span>'
      + '  </div>'
      + '  <div style="display:flex;gap:6px;align-items:center;">'
      + '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.75rem;" onclick="toggleEditCategory(\'' + c.id + '\')">✏️</button>'
      + (running ? '<button class="btn btn-outline" style="padding:4px 8px;font-size:.75rem;border-color:#dc2626;color:#dc2626;" onclick="toggleManageReset(\'' + c.id + '\')">Reset</button>' : '')
      + '<button class="btn btn-secondary" style="padding:4px 10px;font-size:.8rem;" ' + (running ? 'disabled title="Has running tournament"' : '') + ' onclick="toggleDeleteConfirm(\'' + c.id + '\')">✕</button>'
      + '  </div>'
      + '</div>'
      + '<div id="manageEdit_' + c.id + '" class="hidden" style="margin-top:8px;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:10px;">'
      + '  <div style="display:flex;flex-direction:column;gap:8px;">'
      + '    <div class="form-row">'
      + '      <div class="form-field"><label class="form-label">Label</label><input type="text" id="editLabel_' + c.id + '" class="form-input" value="' + escapeHtml(c.label) + '"></div>'
      + '      <div class="form-field"><label class="form-label">Format</label><select id="editType_' + c.id + '" class="form-input"><option value="singles"' + (c.type === 'singles' ? ' selected' : '') + '>Singles</option><option value="doubles"' + (c.type === 'doubles' ? ' selected' : '') + '>Doubles</option></select></div>'
      + '    </div>'
      + '    <div class="form-row">'
      + '      <div class="form-field"><label class="form-label">Sport</label><select id="editSport_' + c.id + '" class="form-input"><option value="badminton"' + (c.sport === 'badminton' ? ' selected' : '') + '>Badminton</option><option value="tableTennis"' + (c.sport === 'tableTennis' ? ' selected' : '') + '>Table Tennis</option><option value="chess"' + (c.sport === 'chess' ? ' selected' : '') + '>Chess</option></select></div>'
      + '      <div class="form-field"><label class="form-label">Event</label><select id="editEvent_' + c.id + '" class="form-input edit-event-select"></select><input type="text" id="editEvent_' + c.id + 'Custom" class="form-input hidden" style="margin-top:4px;" placeholder="New event name"></div>'
      + '    </div>'
      + '  </div>'
      + '  <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px;">'
      + '    <button class="btn" style="padding:4px 12px;font-size:.8rem;" onclick="saveCategoryEdit(\'' + c.id + '\')">Save</button>'
      + '    <button class="btn btn-secondary" style="padding:4px 12px;font-size:.8rem;" onclick="toggleEditCategory(\'' + c.id + '\')">Cancel</button>'
      + '  </div>'
      + '</div>'
      + (running ? '<div id="manageReset_' + c.id + '" class="hidden" style="margin-top:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-size:.75rem;color:#dc2626;font-weight:500;">Type RESET:</span>'
        + '<input type="text" id="manageResetInput_' + c.id + '" style="flex:1;min-width:60px;padding:4px 8px;border:2px solid #fecaca;border-radius:6px;font-size:.8rem;" placeholder="RESET">'
        + '<button class="btn" style="padding:4px 10px;font-size:.75rem;background:#dc2626;" onclick="executeManageReset(\'' + c.id + '\')">Go</button></div>' : '')
      + (!running ? '<div id="manageDeleteConfirm_' + c.id + '" class="hidden" style="margin-top:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-size:.75rem;color:#dc2626;font-weight:500;">Type DELETE:</span>'
        + '<input type="text" id="manageDeleteInput_' + c.id + '" style="flex:1;min-width:60px;padding:4px 8px;border:2px solid #fecaca;border-radius:6px;font-size:.8rem;" placeholder="DELETE">'
        + '<button class="btn" style="padding:4px 10px;font-size:.75rem;background:#dc2626;" onclick="executeDeleteConfirm(\'' + c.id + '\')">Go</button></div>' : '')
      + '</div>';
  }
  container.innerHTML = html;
  // Populate event dropdowns for edit forms
  for (const c of cats) {
    var sel = document.getElementById('editEvent_' + c.id);
    if (sel) populateEventDropdown('editEvent_' + c.id, c.event || APP_CONFIG.defaultEvent);
  }
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

function toggleDeleteConfirm(catId) {
  const div = document.getElementById('manageDeleteConfirm_' + catId);
  if (!div) return;
  div.classList.toggle('hidden');
  const input = document.getElementById('manageDeleteInput_' + catId);
  if (input) input.value = '';
}

function executeDeleteConfirm(catId) {
  if (!isAdmin()) return;
  const input = document.getElementById('manageDeleteInput_' + catId);
  if (!input || input.value !== 'DELETE') return;
  deleteCategory(catId);
}

function toggleEditCategory(catId) {
  var div = document.getElementById('manageEdit_' + catId);
  if (!div) return;
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    populateEventDropdown('editEvent_' + catId, getCategories().find(function(c) { return c.id === catId; }).event || APP_CONFIG.defaultEvent);
  }
}

function saveCategoryEdit(catId) {
  if (!isAdmin()) return;
  var cats = getCategories();
  var idx = cats.findIndex(function(c) { return c.id === catId; });
  if (idx === -1) return;
  var cat = cats[idx];
  var newLabel = document.getElementById('editLabel_' + catId).value.trim();
  if (!newLabel) return;
  var ev = document.getElementById('editEvent_' + catId).value;
  if (ev === '__new__') {
    ev = document.getElementById('editEvent_' + catId + 'Custom').value.trim();
    if (!ev) return;
  }
  var oldEvent = cat.event || APP_CONFIG.defaultEvent;
  var oldSport = cat.sport;
  cat.label = newLabel;
  cat.type = document.getElementById('editType_' + catId).value;
  cat.sport = document.getElementById('editSport_' + catId).value;
  cat.event = ev;
  saveCategories(cats);
  if (_supabase) syncMetadataToCloud();
  var panel = document.getElementById('managePanel');
  if (!panel.classList.contains('hidden')) renderManagePanel();
  if (catId === AppState.category) {
    if (ev !== oldEvent || cat.sport !== oldSport) {
      AppState.event = ev;
      AppState.sport = cat.sport;
      var eventCats = getCategories().filter(function(c) { return (c.event || APP_CONFIG.defaultEvent) === ev && c.sport === cat.sport; });
      if (eventCats.length > 0) {
        switchCategory(eventCats[0].id);
      } else {
        AppState.category = null;
        AppState.tournament = defaultState();
        renderEventBar();
        renderSportBar();
        navigateTo('setup');
      }
    } else {
      renderCategoryBar();
    }
  }
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

function addCategory(label, type, sport, eventName) {
  if (!isAdmin()) return;
  const cats = getCategories();
  const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cat';
  let id = baseId;
  let counter = 1;
  while (cats.find(c => c.id === id)) {
    id = baseId + '_' + counter++;
  }
  const ev = eventName || APP_CONFIG.defaultEvent;
  cats.push({ id, label, type, sport: sport || 'badminton', event: ev });
  saveCategories(cats);
  if (_supabase) syncMetadataToCloud();
  const panel = document.getElementById('managePanel');
  if (!panel.classList.contains('hidden')) renderManagePanel();
  if (ev !== AppState.event) {
    AppState.event = ev;
    renderEventBar();
  }
  switchCategory(id);
}

function deleteCategory(id) {
  if (!isAdmin()) return;
  const cats = getCategories();
  if (cats.length <= 1) return;
  const saved = localLoad(id);
  if (saved && saved.phase !== 'setup') return;
  const filtered = cats.filter(c => c.id !== id);
  saveCategories(filtered);
  localClear(id);
  if (_supabase) {
    _supabase.from('state').delete().eq('key', getStateKey(id)).then().catch(() => {});
    syncMetadataToCloud();
  }
  if (AppState.category === id) {
    const remaining = getCategories().filter(c => c.sport === AppState.sport && (c.event || APP_CONFIG.defaultEvent) === AppState.event);
    if (remaining.length > 0) { switchCategory(remaining[0].id); return; }
    const eventCats = getCategories().filter(c => (c.event || APP_CONFIG.defaultEvent) === AppState.event);
    if (eventCats.length > 0) { AppState.sport = eventCats[0].sport; renderSportBar(); switchCategory(eventCats[0].id); return; }
    const all = getCategories();
    if (all.length > 0) { AppState.event = all[0].event || APP_CONFIG.defaultEvent; AppState.sport = all[0].sport; renderEventBar(); renderSportBar(); switchCategory(all[0].id); return; }
  } else {
    renderCategoryBar();
  }
  const panel = document.getElementById('managePanel');
  if (!panel.classList.contains('hidden')) renderManagePanel();
}

// ===================== RESUME =====================
function resumeTournament() {
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
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

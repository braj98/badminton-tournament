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
  const labels = { badminton: 'Badminton', tableTennis: 'Table Tennis', chess: 'Chess' };
  const cats = getCategories().filter(c => (c.event || APP_CONFIG.defaultEvent) === AppState.event);
  const sportSet = new Set(cats.map(c => c.sport));
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
  AppState.sport = sport;
  renderSportBar();
  const cats = getCategories().filter(c => c.sport === AppState.sport && (c.event || APP_CONFIG.defaultEvent) === AppState.event);
  if (cats.length > 0) {
    switchCategory(cats[0].id);
    return;
  } else {
    AppState.category = null;
    AppState.tournament = defaultState();
    AppState.view = 'setup';
    renderAll();
  }
}

// ===================== EVENT BAR =====================
function renderEventBar() {
  const bar = document.getElementById('eventBar');
  if (!bar) return;
  const events = [...new Set(getCategories().map(c => c.event || APP_CONFIG.defaultEvent))];
  bar.innerHTML = '';
  for (const ev of events) {
    const btn = document.createElement('button');
    btn.className = 'event-btn' + (ev === AppState.event ? ' active' : '');
    btn.textContent = ev;
    btn.onclick = function() { switchEvent(ev); };
    bar.appendChild(btn);
  }
}

function switchEvent(ev) {
  if (ev === AppState.event) return;
  AppState.event = ev;
  renderEventBar();
  const cats = getCategories().filter(c => (c.event || APP_CONFIG.defaultEvent) === AppState.event);
  if (cats.length > 0) {
    const sportCats = cats.filter(c => c.sport === AppState.sport);
    if (sportCats.length > 0) {
      switchCategory(sportCats[0].id);
    } else {
      AppState.sport = cats[0].sport;
      renderSportBar();
      switchCategory(cats[0].id);
    }
    return;
  }
  AppState.category = null;
  AppState.tournament = defaultState();
  AppState.view = 'setup';
  renderAll();
}

// ===================== CATEGORY SWITCHING =====================
async function switchCategory(catId) {
  if (catId === AppState.category) return;
  if (AppState.category && AppState.tournament && AppState.tournament.phase !== 'setup') { saveState(); await flushCloudSave(); }
  AppState.category = catId;
  const cat = getCategories().find(c => c.id === catId);
  if (cat) { AppState.sport = cat.sport; AppState.event = cat.event || APP_CONFIG.defaultEvent; }
  let serverState = null;
  if (_supabase) {
    serverState = await fetchState(catId).catch(() => null);
  }
  if (AppState.category !== catId) return;
  if (serverState) {
    AppState.tournament = serverState;
    localSave(catId, AppState.tournament);
  } else {
    const saved = localLoad(catId);
    if (saved && saved.phase && saved.phase !== 'setup') {
      AppState.tournament = saved;
    } else {
      AppState.tournament = defaultState();
      const cat = getCategories().find(c => c.id === catId);
      if (cat && cat.sport) AppState.tournament.sport = cat.sport;
      if (cat && cat.type) AppState.tournament.format = cat.type;
    }
  }
  AppState.view = AppState.tournament.phase;
  renderAll();
}

// ===================== CATEGORY BAR =====================
function renderCategoryBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = '';
  for (const cat of getCategories().filter(c => c.sport === AppState.sport && (c.event || APP_CONFIG.defaultEvent) === AppState.event)) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat.id === AppState.category ? ' active' : '');
    const s = localLoad(cat.id);
    let dotClass = 'setup';
    if (s) {
      if (s.phase === 'champion') dotClass = 'done';
      else if (s.phase !== 'setup') dotClass = 'playing';
    }
    btn.innerHTML = '<span class="dot ' + dotClass + '"></span>' + escapeHtml(cat.label);
    btn.onclick = function() { switchCategory(cat.id); };
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
    AppState.view = AppState.tournament.phase;
    renderAll();
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
  if (!panel.classList.contains('hidden')) renderManagePanel();
}

function renderManagePanel() {
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
    
    html += '<div style="padding:10px 0;border-bottom:1px solid var(--border);">'
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
      + (running ? '<button class="btn btn-outline" style="padding:4px 8px;font-size:.75rem;border-color:#dc2626;color:#dc2626;" onclick="toggleManageReset(\'' + c.id + '\')">Reset</button>' : '')
      + '<button class="btn btn-secondary" style="padding:4px 10px;font-size:.8rem;" ' + (running ? 'disabled title="Has running tournament"' : '') + ' onclick="toggleDeleteConfirm(\'' + c.id + '\')">✕</button>'
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

function addCategoryFromUI() {
  if (!isAdmin()) return;
  const nameInput = document.getElementById('newCatName');
  const typeSelect = document.getElementById('newCatType');
  const sportSelect = document.getElementById('newCatSport');
  const eventInput = document.getElementById('newCatEvent');
  const errSpan = document.getElementById('manageError');
  const label = nameInput.value.trim();
  if (!label) { errSpan.textContent = 'Name is required.'; return; }
  const cats = getCategories();
  if (cats.find(c => c.label.toLowerCase() === label.toLowerCase())) {
    errSpan.textContent = 'A category with this name already exists.';
    return;
  }
  errSpan.textContent = '';
  const ev = (eventInput ? eventInput.value.trim() : '') || AppState.event;
  addCategory(label, typeSelect.value, sportSelect ? sportSelect.value : 'badminton', ev);
  nameInput.value = '';
  if (eventInput) eventInput.value = '';
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
  if (_supabase) upsertCategories(cats);
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
    upsertCategories(filtered);
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
    AppState.view = AppState.tournament.phase;
    renderAll();
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
  const cats = getCategories();
  let pushed = 0, failed = 0;
  for (const c of cats) {
    const s = localLoad(c.id);
    if (!s) continue;
    const { error } = await _supabase.from('state').upsert({ key: getStateKey(c.id), data: s }, { onConflict: 'key' });
    if (error) { failed++; console.warn('Failed to push ' + c.label + ':', error.message); }
    else pushed++;
  }
  alert('Pushed ' + pushed + ' categories to cloud.' + (failed ? ' ' + failed + ' failed.' : ''));
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
  if (_supabase) upsertCategories(data.categories);
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
  renderAll();
  if (!document.getElementById('managePanel').classList.contains('hidden')) renderManagePanel();
}

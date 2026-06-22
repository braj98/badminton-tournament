let _supabase = null;
let _realtimeChannel = null;
AppState.isAdmin = false;
let _saveDebounceTimer = null;

const _SUPABASE_URL = 'https://cnotgqvcippfzhsqnnzb.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_pDEbo-ttaBTBTTH8dcJbHA_RC-Q0KAy';

function initSupabase() {
  if (typeof supabase === 'undefined') { AppState.isAdmin = false; return; }
  try {
    _supabase = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
    checkSession();
  } catch(e) { AppState.isAdmin = false; }
}

async function checkSession() {
  if (!_supabase) { AppState.isAdmin = false; return; }
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    AppState.isAdmin = !!session;
  } catch(e) { AppState.isAdmin = false; }
}

function showLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
  setTimeout(() => document.getElementById('loginEmail').focus(), 100);
}

function closeLogin() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

async function login() {
  if (!_supabase) return;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { document.getElementById('loginError').textContent = 'Enter email and password.'; return; }
  const { error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) { document.getElementById('loginError').textContent = error.message; return; }
  closeLogin();
  AppState.isAdmin = true;
  const serverState = await fetchState(AppState.category);
  if (serverState) { AppState.tournament = serverState; localSave(AppState.category, AppState.tournament); }
  const cloudCats = await fetchCategoriesFromCloud();
  if (cloudCats && cloudCats.length) {
    saveCategories(cloudCats);
    migrateCategorySports();
  }
  updateBanners();
  renderAll();
}

async function logout() {
  if (!_supabase) return;
  await _supabase.auth.signOut();
  AppState.isAdmin = false;
  updateBanners();
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
  } else {
    AppState.tournament = defaultState();
  }
  AppState.view = AppState.tournament.phase;
  renderAll();
}

async function upsertState(catId, data) {
  if (!_supabase) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await _supabase.from('state').upsert({ key: 'btm_state_' + catId, data: data }, { onConflict: 'key' });
    if (!error) return;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    else console.warn('Supabase upsert failed after 3 attempts:', error.message);
  }
}

function flushCloudSave() {
  if (_saveDebounceTimer) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = null;
    return upsertState(AppState.category, AppState.tournament);
  }
  return Promise.resolve();
}

async function fetchState(catId) {
  if (!_supabase) return null;
  const { data, error } = await _supabase.from('state').select('data').eq('key', 'btm_state_' + catId).single();
  if (error && error.code !== 'PGRST116') { console.warn('Supabase fetch failed:', error.message); return null; }
  return data ? data.data : null;
}

function scheduleCloudSave(catId, data) {
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(function() {
    upsertState(catId, data);
  }, 500);
}

async function upsertCategories(data) {
  if (!_supabase) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await _supabase.from('state').upsert({ key: 'btm_categories', data: data }, { onConflict: 'key' });
    if (!error) return;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    else console.warn('Supabase categories upsert failed after 3 attempts:', error.message);
  }
}

async function fetchCategoriesFromCloud() {
  if (!_supabase) return null;
  const { data, error } = await _supabase.from('state').select('data').eq('key', 'btm_categories').single();
  if (error && error.code !== 'PGRST116') { console.warn('Supabase categories fetch failed:', error.message); return null; }
  return data ? data.data : null;
}

function subscribeToChanges() {
  if (!_supabase || _realtimeChannel) return;
  _realtimeChannel = _supabase.channel('btm-state-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, payload => {
      const key = payload.new ? payload.new.key : null;
      if (!key || !key.startsWith('btm_state_')) return;
      const catId = key.replace('btm_state_', '');
      const newData = payload.new ? payload.new.data : null;
      if (newData && catId === AppState.category && newData._lastSave > AppState.tournament._lastSave) {
        AppState.tournament = newData;
        localSave(catId, AppState.tournament);
        if (AppState.showingResults) {
          renderResults();
        } else {
          renderAll();
        }
      }
    })
    .subscribe();
}



let _supabase = null;
let _realtimeChannel = null;
let _isAdmin = false;
let _saveDebounceTimer = null;

const _SUPABASE_URL = 'https://cnotgqvcippfzhsqnnzb.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_pDEbo-ttaBTBTTH8dcJbHA_RC-Q0KAy';

function initSupabase() {
  if (typeof supabase === 'undefined') { _isAdmin = false; return; }
  try {
    _supabase = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
    checkSession();
  } catch(e) { _isAdmin = false; }
}

async function checkSession() {
  if (!_supabase) { _isAdmin = false; return; }
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    _isAdmin = !!session;
  } catch(e) { _isAdmin = false; }
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
  _isAdmin = true;
  const serverState = await fetchState(currentCategory);
  if (serverState) { state = serverState; localSave(currentCategory, state); }
  updateBanners();
  renderAll();
}

async function logout() {
  if (!_supabase) return;
  await _supabase.auth.signOut();
  _isAdmin = false;
  updateBanners();
  renderAll();
}

async function upsertState(catId, data) {
  if (!_supabase) return;
  const { error } = await _supabase.from('state').upsert({ key: 'btm_state_' + catId, data: data }, { onConflict: 'key' });
  if (error) console.warn('Supabase upsert failed:', error.message);
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

function subscribeToChanges() {
  if (!_supabase || _realtimeChannel) return;
  _realtimeChannel = _supabase.channel('btm-state-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, payload => {
      const key = payload.new ? payload.new.key : null;
      if (!key || !key.startsWith('btm_state_')) return;
      const catId = key.replace('btm_state_', '');
      const newData = payload.new ? payload.new.data : null;
      if (newData && catId === currentCategory && newData._lastSave > state._lastSave) {
        state = newData;
        localSave(catId, state);
        if (_showingResults) {
          renderResults();
        } else {
          renderAll();
        }
      }
    })
    .subscribe();
}

async function checkAndUpdateFromServer() {
  if (!_supabase) return;
  await checkSession();
  updateBanners();
  for (const cat of getCategories()) {
    const serverState = await fetchState(cat.id).catch(() => null);
    if (!serverState) continue;
    const localState = localLoad(cat.id);
    const localStr = localState ? JSON.stringify(localState) : null;
    const serverStr = JSON.stringify(serverState);
    if (serverStr !== localStr) {
      localSave(cat.id, serverState);
      if (cat.id === currentCategory) {
        state = serverState;
        if (_showingResults) {
          renderResults();
        } else {
          renderAll();
        }
      }
    }
  }
  subscribeToChanges();
}

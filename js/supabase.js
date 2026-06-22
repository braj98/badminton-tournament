let _supabase = null;
let _realtimeChannel = null;

const _SUPABASE_URL = 'https://cnotgqvcippfzhsqnnzb.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_pDEbo-ttaBTBTTH8dcJbHA_RC-Q0KAy';

function initSupabase() {
  if (typeof supabase === 'undefined') { _isAdmin = false; updateBanners(); return; }
  try {
    _supabase = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
    checkSession();
  } catch(e) { _isAdmin = false; updateBanners(); }
}

async function checkSession() {
  if (!_supabase) { _isAdmin = false; updateBanners(); return; }
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    _isAdmin = !!session;
  } catch(e) { _isAdmin = false; }
  updateBanners();
  if (!_isAdmin && state && state.phase !== 'setup') applyViewerMode();
}

function updateBanners() {
  const vb = document.getElementById('viewerBanner');
  const ab = document.getElementById('adminBanner');
  if (!vb || !ab) return;
  if (_isAdmin) { vb.classList.add('hidden'); ab.classList.remove('hidden'); }
  else { vb.classList.remove('hidden'); ab.classList.add('hidden'); }
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
  if (serverState) { state = serverState; try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch(e) {} }
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

function subscribeToChanges() {
  if (!_supabase || _realtimeChannel) return;
  _realtimeChannel = _supabase.channel('btm-state-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, payload => {
      const key = payload.new ? payload.new.key : null;
      if (!key || !key.startsWith('btm_state_')) return;
      const catId = key.replace('btm_state_', '');
      const newData = payload.new ? payload.new.data : null;
      if (newData && catId === currentCategory && JSON.stringify(newData) !== JSON.stringify(state)) { state = newData; renderAll(); }
    })
    .subscribe();
}

async function checkAndUpdateFromServer() {
  if (!_supabase) return;
  await checkSession();
  for (const cat of getCategories()) {
    const serverState = await fetchState(cat.id).catch(() => null);
    if (!serverState) continue;
    const localState = loadState(cat.id);
    const localStr = localState ? JSON.stringify(localState) : null;
    const serverStr = JSON.stringify(serverState);
    if (serverStr !== localStr) {
      try { localStorage.setItem('btm_state_' + cat.id, serverStr); } catch(e) {}
      if (cat.id === currentCategory) {
        state = serverState;
        renderAll();
      }
    }
  }
  subscribeToChanges();
}

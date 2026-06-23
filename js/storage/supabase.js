let _supabase = null;
let _realtimeChannel = null;
let _saveDebounceTimer = null;
let _pendingSave = null;

const _SUPABASE_URL = 'https://cnotgqvcippfzhsqnnzb.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_pDEbo-ttaBTBTTH8dcJbHA_RC-Q0KAy';

function initSupabase() {
  if (typeof supabase === 'undefined') { return; }
  try {
    _supabase = supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
    _supabase.auth.onAuthStateChange(function(event, session) {
      AppState.user = session ? { role: 'admin', email: session.user.email, loggedInAt: Date.now() } : { role: 'viewer' };
      updateBanners();
    });
  } catch(e) { }
}

async function upsertState(catId, data) {
  if (!_supabase) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await _supabase.from('state').upsert({ key: getStateKey(catId), data: data }, { onConflict: 'key' });
    if (!error) return;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    else console.warn('Supabase upsert failed after 3 attempts:', error.message);
  }
}

function flushCloudSave() {
  if (_pendingSave) {
    if (_saveDebounceTimer) {
      clearTimeout(_saveDebounceTimer);
      _saveDebounceTimer = null;
    }
    const pending = _pendingSave;
    _pendingSave = null;
    return upsertState(pending.catId, pending.data);
  }
  return Promise.resolve();
}

async function fetchState(catId) {
  if (!_supabase) return null;
  const { data, error } = await _supabase.from('state').select('data').eq('key', getStateKey(catId)).maybeSingle();
  if (error && error.code !== 'PGRST116') { console.warn('Supabase fetch failed:', error.message); return null; }
  return data ? data.data : null;
}

function scheduleCloudSave(catId, data) {
  clearTimeout(_saveDebounceTimer);
  _pendingSave = { catId: catId, data: data };
  _saveDebounceTimer = setTimeout(function() {
    const pending = _pendingSave;
    _pendingSave = null;
    if (pending) upsertState(pending.catId, pending.data);
  }, 500);
}

async function upsertCategories(data) {
  if (!_supabase) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await _supabase.from('state').upsert({ key: getCategoriesKey(), data: data }, { onConflict: 'key' });
    if (!error) return;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    else console.warn('Supabase categories upsert failed after 3 attempts:', error.message);
  }
}

async function fetchCategoriesFromCloud() {
  if (!_supabase) return null;
  const { data, error } = await _supabase.from('state').select('data').eq('key', getCategoriesKey()).maybeSingle();
  if (error && error.code !== 'PGRST116') { console.warn('Supabase categories fetch failed:', error.message); return null; }
  return data ? data.data : null;
}

function subscribeToChanges() {
  if (!_supabase || _realtimeChannel) return;
  _realtimeChannel = _supabase.channel('btm-state-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, payload => {
      const key = payload.new ? payload.new.key : null;
      const stateKeyPrefix = getStateKey('');
      if (!key || !key.startsWith(stateKeyPrefix)) return;
      const catId = key.replace(stateKeyPrefix, '');
      const newData = payload.new ? payload.new.data : null;
      if (newData && catId === AppState.category && newData._lastSave > AppState.tournament._lastSave) {
        AppState.tournament = newData;
        localSave(catId, AppState.tournament);
        if (AppState.ui.showingResults) {
          renderResults();
        } else {
          renderAll();
        }
      }
    })
    .subscribe();
}



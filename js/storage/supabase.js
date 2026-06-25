let _supabase = null;
let _realtimeChannel = null;
let _metadataChannel = null;
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
  } catch(e) { console.error('Supabase init failed:', e); }
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

// --- Metadata (templates + events) cloud sync ---

async function syncMetadataToCloud() {
  if (!_supabase) return;
  const metadata = { templates: getTemplates(), events: getEvents(), categories: getCategories(), updatedAt: Date.now() };
  await _upsertByKey('btm_metadata', metadata);
}

async function _upsertByKey(key, data) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await _supabase.from('state').upsert({ key: key, data: data }, { onConflict: 'key' });
    if (!error) return;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    else console.warn('Supabase upsert failed for key ' + key + ' after 3 attempts:', error.message);
  }
}

async function _fetchByKey(key) {
  if (!_supabase) return null;
  const { data, error } = await _supabase.from('state').select('data').eq('key', key).maybeSingle();
  if (error && error.code !== 'PGRST116') { console.warn('Supabase fetch failed for key ' + key + ':', error.message); return null; }
  return data ? data.data : null;
}

async function fetchMetadataFromCloud() {
  if (!_supabase) return null;
  // Atomic composite key (prevents partial-sync race)
  const meta = await _fetchByKey('btm_metadata');
  if (meta && meta.templates && meta.events) return { templates: meta.templates, events: meta.events };
  // Fallback: legacy individual keys
  const templates = await _fetchByKey('btm_templates');
  const events = await _fetchByKey('btm_events');
  if (templates && events) return { templates, events };
  const cats = await _fetchByKey('btm_categories');
  if (cats) return { categories: cats };
  return null;
}

// --- Realtime subscriptions ---

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
        if (typeof syncTournamentState === 'function') syncTournamentState(AppState.tournament);
        localSave(catId, AppState.tournament);
        if (AppState.ui.showingResults) {
          showResultsPage();
        } else {
          renderAll();
        }
      }
    })
    .subscribe();
}

function subscribeToMetadataChanges() {
  if (!_supabase || _metadataChannel) return;
  _metadataChannel = _supabase.channel('btm-metadata-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, payload => {
      const key = payload.new ? payload.new.key : null;
      if (key === 'btm_metadata' || key === 'btm_templates' || key === 'btm_events') {
        fetchMetadataFromCloud().then(function(meta) {
          if (!meta) return;
          if (meta.templates && meta.events) {
            saveTemplates(meta.templates);
            saveEvents(meta.events);
          } else if (meta.categories) {
            saveCategories(meta.categories);
          }
          const currentCat = AppState.category;
          if (!getCategories().find(c => c.id === currentCat)) {
            navigateTo('home');
          } else {
            renderAll();
          }
        });
      }
    })
    .subscribe();
}

function unsubscribeMetadata() {
  if (_metadataChannel) {
    _supabase.removeChannel(_metadataChannel);
    _metadataChannel = null;
  }
}

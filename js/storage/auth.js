function isAdmin() {
  return !!(AppState.user && AppState.user.role === 'admin');
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

function showLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('hidden');
}

function hideLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('hidden');
}

async function checkSession() {
  if (!_supabase) return;
  try {
    await _supabase.auth.getSession();
  } catch(e) { console.error('checkSession failed:', e); }
}

async function login() {
  if (!_supabase) return;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { document.getElementById('loginError').textContent = 'Enter email and password.'; return; }
  showLoading();
  const { error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) { hideLoading(); document.getElementById('loginError').textContent = error.message; return; }
  closeLogin();
  const serverState = await fetchState(AppState.category);
  if (serverState) { AppState.tournament = serverState; localSave(AppState.category, AppState.tournament); }
  const meta = await fetchMetadataFromCloud();
  if (meta) {
    if (meta.templates && meta.events) {
      saveTemplates(meta.templates);
      saveEvents(meta.events);
    } else if (meta.categories) {
      saveCategories(meta.categories);
      migrateCategorySports();
    }
  }
  hideLoading();
  emit('userLoggedIn');
}

async function logout() {
  if (!_supabase) return;
  await _supabase.auth.signOut();
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
  } else {
    AppState.tournament = defaultState();
  }
  AppState.view = AppState.tournament.phase;
  emit('userLoggedOut');
}

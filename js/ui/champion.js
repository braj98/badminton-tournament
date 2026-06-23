// ===================== CHAMPION =====================
let photoTarget = null;

function viewChampion() {
  const final = AppState.tournament.knockout.find(m => m.id === 'final');
  if (final && final.done && final.winner) {
    AppState.tournament.champion = final.winner;
    AppState.tournament.runnerUp = final.winner === final.p1 ? final.p2 : final.p1;
  }
  navigateTo('champion');
}

function showResults() {
  if (!isAdmin()) return;
  const final = AppState.tournament.knockout.find(m => m.id === 'final');
  if (!final || !final.done) return;
  AppState.tournament.champion = final.winner;
  AppState.tournament.runnerUp = final.winner === final.p1 ? final.p2 : final.p1;
  AppState.tournament.phase = 'champion';
  AppState.tournament.completedAt = Date.now();
  saveState();
  renderAll();
}

function showNewTournamentConfirm() {
  if (!isAdmin()) return;
  const box = document.getElementById('newTournamentConfirmBox');
  box.classList.toggle('hidden');
  document.getElementById('newTournamentConfirmInput').value = '';
  document.getElementById('newTournamentConfirmError').textContent = '';
}

function confirmNewTournament() {
  if (!isAdmin()) return;
  const input = document.getElementById('newTournamentConfirmInput');
  if (input.value !== 'RESET') {
    document.getElementById('newTournamentConfirmError').textContent = 'Please type RESET to confirm.';
    return;
  }
  document.getElementById('newTournamentConfirmBox').classList.add('hidden');
  newTournament();
}

function newTournament() {
  if (!isAdmin()) return;
  localClear(AppState.category);
  if (_supabase) {
    _supabase.from('state').delete().eq('key', getStateKey(AppState.category)).then().catch(() => {});
  }
  AppState.tournament = defaultState();
  navigateTo(AppState.tournament.phase);
}

function renderChampion() {
  clearDisabled();
  const cat = getCategories().find(c => c.id === AppState.category);
  document.getElementById('championCatLabel').textContent = cat ? cat.label : '';
  document.getElementById('championName').textContent = pName(AppState.tournament.champion) || '—';
  document.getElementById('runnerUpName').textContent = pName(AppState.tournament.runnerUp) || '—';
  showPhoto('champion', AppState.tournament.championPhoto);
  showPhoto('runnerup', AppState.tournament.runnerUpPhoto);
}

function showPhoto(which, dataUrl) {
  const zone = document.getElementById(which + 'PhotoZone');
  const img = document.getElementById(which + 'PhotoImg');
  const placeholder = zone.querySelector('.photo-placeholder');
  if (dataUrl) {
    img.src = dataUrl;
    img.classList.remove('hidden');
    placeholder.style.display = 'none';
    zone.classList.add('has-photo');
  } else {
    img.classList.add('hidden');
    placeholder.style.display = '';
    zone.classList.remove('has-photo');
  }
}

function pickPhoto(which) {
  if (!isAdmin()) return;
  photoTarget = which;
  document.getElementById('photoInput').click();
}

function onPhotoPicked(event) {
  if (!isAdmin()) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      if (photoTarget === 'champion') AppState.tournament.championPhoto = dataUrl;
      else AppState.tournament.runnerUpPhoto = dataUrl;
      saveState();
      renderChampion();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

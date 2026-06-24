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
  const container = document.getElementById('championContainer');
  const cat = getCategories().find(c => c.id === AppState.category);
  const chName = pName(AppState.tournament.champion) || '—';
  const ruName = pName(AppState.tournament.runnerUp) || '—';
  const catLabel = cat ? cat.label : '';

  container.innerHTML = ''
    + '<div class="podium-split-grid">'
    // Champion card
    + '<div class="podium-tier-card tier-champion">'
    + '<span class="tier-label-badge">' + escapeHtml(catLabel) + '</span>'
    + '<div class="emblem-trophy-badge">🏆</div>'
    + '<h2 class="player-name-headline" id="championName">' + escapeHtml(chName) + '</h2>'
    + '<div class="image-uploader-dropzone" id="championPhotoZone" onclick="pickPhoto(\'champion\')">'
    + '<span class="dropzone-camera-icon">📷</span>'
    + '<span class="dropzone-string-text photo-placeholder">+ Add Champion Photo</span>'
    + '<img id="championPhotoImg" class="photo-preview hidden">'
    + '</div>'
    + '</div>'
    // Runner-up card
    + '<div class="podium-tier-card tier-runnerup">'
    + '<span class="tier-label-badge">Runner-Up Position</span>'
    + '<div class="emblem-trophy-badge">🥈</div>'
    + '<h3 class="player-name-headline" id="runnerUpName">' + escapeHtml(ruName) + '</h3>'
    + '<div class="image-uploader-dropzone" id="runnerupPhotoZone" onclick="pickPhoto(\'runnerup\')">'
    + '<span class="dropzone-camera-icon">📷</span>'
    + '<span class="dropzone-string-text photo-placeholder">+ Add Runner-up Photo</span>'
    + '<img id="runnerupPhotoImg" class="photo-preview hidden">'
    + '</div>'
    + '</div>'
    + '</div>'
    // Actions
    + '<div class="champion-actions">'
    + '<button class="btn btn-block admin-only" onclick="showNewTournamentConfirm()">New Tournament</button>'
    + '<div id="newTournamentConfirmBox" class="hidden confirm-box confirm-reset admin-only">'
    + '<p class="confirm-text">Type <strong>RESET</strong> to permanently delete all data for this competition:</p>'
    + '<div class="confirm-actions">'
    + '<input type="text" id="newTournamentConfirmInput" class="confirm-input" placeholder="Type RESET">'
    + '<button class="btn confirm-btn" style="white-space:nowrap;" onclick="confirmNewTournament()">Confirm</button>'
    + '</div>'
    + '<span id="newTournamentConfirmError" class="text-muted" style="font-size:.8rem;color:#dc2626;display:block;margin-top:4px;"></span>'
    + '</div>'
    + '</div>';

  showPhoto('champion', AppState.tournament.championPhoto);
  showPhoto('runnerup', AppState.tournament.runnerUpPhoto);
}

function showPhoto(which, dataUrl) {
  const zone = document.getElementById(which + 'PhotoZone');
  if (!zone) return;
  const img = document.getElementById(which + 'PhotoImg');
  const placeholder = zone.querySelector('.photo-placeholder');
  if (dataUrl) {
    img.src = dataUrl;
    img.classList.remove('hidden');
    if (placeholder) placeholder.style.display = 'none';
    zone.classList.add('has-photo');
  } else {
    if (img) img.classList.add('hidden');
    if (placeholder) placeholder.style.display = '';
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

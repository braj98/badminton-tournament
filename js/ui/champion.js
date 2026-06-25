// ===================== CHAMPION =====================
let photoTarget = null;

function viewChampion() {
  syncTournamentState(AppState.tournament);
  navigateTo('champion');
}

function showResults() {
  if (!isAdmin()) return;
  viewChampion();
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

function showCompleteConfirm(match, onConfirm) {
  function _(s) { return escapeHtml(pName(s)); }
  var p1Name = _(match.p1);
  var p2Name = _(match.p2);
  var isFinal = match.round === 'Final';
  var scoresHtml = '';

  if (isFinal && match.sets) {
    var parts = [];
    for (var i = 0; i < match.sets.length; i++) {
      var s = match.sets[i];
      if (s && s.s1 !== null && s.s2 !== null) {
        parts.push('S' + (i+1) + ': ' + escapeHtml(s.s1) + '-' + escapeHtml(s.s2));
      } else {
        parts.push('S' + (i+1) + ': —');
      }
    }
    scoresHtml = parts.join(' | ');
  } else if (match.s1 !== null && match.s2 !== null) {
    scoresHtml = escapeHtml(match.s1) + ' - ' + escapeHtml(match.s2);
  } else {
    scoresHtml = '<span style="color:var(--text-muted)">No scores yet</span>';
  }

  var predicted = null;
  if (isFinal && match.sets) {
    var w1 = 0, w2 = 0;
    for (var i = 0; i < match.sets.length; i++) {
      var s = match.sets[i];
      if (s && s.s1 !== null && s.s2 !== null) {
        if (s.s1 > s.s2) w1++; else if (s.s2 > s.s1) w2++;
      }
    }
    if (w1 !== w2) predicted = w1 > w2 ? p1Name : p2Name;
  } else if (match.s1 !== null && match.s2 !== null && match.s1 !== match.s2) {
    predicted = match.s1 > match.s2 ? p1Name : p2Name;
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="card modal-card" style="max-width:420px;">'
    + '<button class="modal-close" id="_confirmClose">✕</button>'
    + '<h3 style="margin:0 0 16px 0;font-size:1.1rem;">Complete Match</h3>'
    + '<div style="margin-bottom:16px;">'
    + '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600;font-size:.95rem;">'
    + '<span>' + p1Name + '</span><span style="color:var(--text-muted);">vs</span><span>' + p2Name + '</span>'
    + '</div>'
    + '<div style="text-align:center;padding:10px 0;font-size:1.1rem;font-weight:700;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">'
    + scoresHtml
    + '</div>'
    + (predicted ? '<div style="text-align:center;padding:8px 0;color:var(--success);font-weight:600;font-size:.85rem;">➜ ' + predicted + ' wins</div>' : '<div style="text-align:center;padding:8px 0;color:var(--text-muted);font-size:.8rem;">No winner — tied or incomplete</div>')
    + '</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button class="btn btn-secondary" id="_confirmCancel" style="flex:1;">Cancel</button>'
    + '<button class="btn" id="_confirmComplete" style="flex:1;">Complete</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  document.getElementById('_confirmClose').onclick = function() { overlay.remove(); };
  document.getElementById('_confirmCancel').onclick = function() { overlay.remove(); };
  document.getElementById('_confirmComplete').onclick = function() { overlay.remove(); onConfirm(); };
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

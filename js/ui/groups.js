// ===================== GROUPS =====================
let _editMode = false;

function renderGroups() {
  clearDisabled();
  const container = document.getElementById('groupDisplay');
  container.innerHTML = '';
  const tm = AppState.tournament.teamMembers || [];
  const groupKeys = Object.keys(AppState.tournament.groups);
  if (!isAdmin()) _editMode = false;
  for (const key of groupKeys) {
    const card = document.createElement('div');
    card.className = 'group-card';
    let items = '';
    const otherGroups = groupKeys.filter(g => g !== key);
    for (const p of AppState.tournament.groups[key]) {
      const idx = AppState.tournament.participants ? AppState.tournament.participants.findIndex(pt => pt.id === p) : AppState.tournament.players.indexOf(p);
      const m = tm[idx];
      const pid = 'gm_' + String(p).replace(/[^a-zA-Z0-9]/g, '_');
      let moveBtns = '';
      for (const g of otherGroups) {
        moveBtns += '<button class="btn admin-only btn-secondary" style="padding:2px 10px;font-size:.75rem;" onclick="movePlayerToGroup(' + idx + ',\'' + g + '\')">' + g + '</button>';
      }
      items += '<li>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<div>' + escapeHtml(pName(p)) + (_editMode ? '<button class="btn admin-only btn-secondary" style="padding:1px 5px;font-size:.65rem;margin-left:4px;" onclick="promptRename(' + idx + ')">✏️</button>' : '')
        + (m ? '<br><span class="text-muted" style="font-size:.75rem;">' + escapeHtml(m.a) + ' & ' + escapeHtml(m.b) + '</span>' : '') + '</div>'
        + '<span style="position:relative;">'
        + '<button class="btn admin-only btn-secondary" style="padding:2px 6px;font-size:.7rem;" onclick="event.stopPropagation();document.getElementById(\'' + pid + '\').classList.toggle(\'hidden\')">↔</button>'
        + '<div id="' + pid + '" class="hidden" style="position:absolute;right:0;top:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10;padding:4px;display:flex;flex-direction:column;gap:2px;">'
        + moveBtns
        + '</div></span></div></li>';
    }
    card.innerHTML = '<h3>Group ' + key + '</h3><ul>' + items + '</ul>';
    container.appendChild(card);
  }
}

function movePlayerToGroup(playerIdx, targetGroup) {
  if (!isAdmin()) return;
  const playerId = AppState.tournament.participants ? AppState.tournament.participants[playerIdx].id : AppState.tournament.players[playerIdx];
  if (!playerId) return;
  let currentGroup = null;
  for (const key of Object.keys(AppState.tournament.groups)) {
    if (AppState.tournament.groups[key].includes(playerId)) {
      currentGroup = key;
      break;
    }
  }
  if (!currentGroup || currentGroup === targetGroup) return;
  const hasScores = AppState.tournament.fixtures.some(f => f.done);
  if (hasScores) {
    if (!confirm('Scores have been entered. Moving this player will reset all group stage scores. Continue?')) return;
    for (const f of AppState.tournament.fixtures) {
      f.s1 = null; f.s2 = null; f.done = false;
    }
  }
  AppState.tournament.groups[currentGroup] = AppState.tournament.groups[currentGroup].filter(p => p !== playerId);
  AppState.tournament.groups[targetGroup].push(playerId);
  AppState.tournament.fixtures = createFixtures(AppState.tournament.groups);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  if (AppState.tournament.knockout.length > 0) {
    AppState.tournament.knockout = [];
    AppState.tournament.qualifiers = [];
  }
  saveState();
  renderGroups();
  document.getElementById('btnProceedKnockout').classList.add('hidden');
}

function toggleEditMode() {
  if (!isAdmin()) return;
  _editMode = !_editMode;
  const btn = document.getElementById('editToggleBtn');
  if (_editMode) {
    btn.textContent = '✏️ Editing';
    btn.style.background = '#2563eb';
    btn.style.color = '#fff';
  } else {
    btn.textContent = '✏️ Edit';
    btn.style.background = '';
    btn.style.color = '';
  }
  renderGroups();
}

function promptRename(playerIdx) {
  if (!isAdmin()) return;
  const oldName = AppState.tournament.participants ? AppState.tournament.participants[playerIdx].name : AppState.tournament.players[playerIdx];
  const newName = prompt('Rename "' + oldName + '":', oldName);
  if (newName && newName.trim() && newName.trim() !== oldName) {
    const trimmed = newName.trim();
    const allNames = AppState.tournament.participants ? AppState.tournament.participants.map(p => p.name) : AppState.tournament.players;
    if (allNames.some((n, i) => i !== playerIdx && n === trimmed)) {
      alert('Another player already has this name.');
      return;
    }
    renamePlayer(playerIdx, trimmed);
  }
}

function renamePlayer(playerIdx, newName) {
  if (!isAdmin()) return;
  if (AppState.tournament.participants) {
    AppState.tournament.participants[playerIdx].name = newName;
    AppState.tournament.players[playerIdx] = newName;
    const pid = AppState.tournament.participants[playerIdx].id;
    for (const key of Object.keys(AppState.tournament.standings)) {
      for (const r of AppState.tournament.standings[key]) {
        if (r.id === pid) r.name = newName;
      }
    }
    for (const q of AppState.tournament.qualifiers) {
      if (q.id === pid) q.name = newName;
    }
  } else {
    const oldName = AppState.tournament.players[playerIdx];
    if (!oldName) return;
    AppState.tournament.players[playerIdx] = newName;
    for (const key of Object.keys(AppState.tournament.groups)) {
      AppState.tournament.groups[key] = AppState.tournament.groups[key].map(p => p === oldName ? newName : p);
    }
    for (const f of AppState.tournament.fixtures) {
      if (f.p1 === oldName) f.p1 = newName;
      if (f.p2 === oldName) f.p2 = newName;
    }
    for (const key of Object.keys(AppState.tournament.standings)) {
      for (const r of AppState.tournament.standings[key]) {
        if (r.name === oldName) r.name = newName;
      }
    }
    for (const q of AppState.tournament.qualifiers) {
      if (q.name === oldName) q.name = newName;
    }
    for (const m of AppState.tournament.knockout) {
      if (m.p1 === oldName) m.p1 = newName;
      if (m.p2 === oldName) m.p2 = newName;
      if (m.winner === oldName) m.winner = newName;
    }
    if (AppState.tournament.champion === oldName) AppState.tournament.champion = newName;
    if (AppState.tournament.runnerUp === oldName) AppState.tournament.runnerUp = newName;
  }
  saveState();
  renderGroups();
}

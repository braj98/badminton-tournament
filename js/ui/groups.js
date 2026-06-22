// ===================== GROUPS =====================
let _editMode = false;

function renderGroups() {
  clearDisabled();
  const container = document.getElementById('groupDisplay');
  container.innerHTML = '';
  const tm = state.teamMembers || [];
  const groupKeys = Object.keys(state.groups);
  if (!_isAdmin) _editMode = false;
  for (const key of groupKeys) {
    const card = document.createElement('div');
    card.className = 'group-card';
    let items = '';
    const otherGroups = groupKeys.filter(g => g !== key);
    for (const p of state.groups[key]) {
      const idx = state.participants ? state.participants.findIndex(pt => pt.id === p) : state.players.indexOf(p);
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
        + '<div id="' + pid + '" class="hidden" style="position:absolute;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10;padding:4px;display:flex;flex-direction:column;gap:2px;">'
        + moveBtns
        + '</div></span></div></li>';
    }
    card.innerHTML = '<h3>Group ' + key + '</h3><ul>' + items + '</ul>';
    container.appendChild(card);
  }
}

function movePlayerToGroup(playerIdx, targetGroup) {
  if (!_isAdmin) return;
  const playerId = state.participants ? state.participants[playerIdx].id : state.players[playerIdx];
  if (!playerId) return;
  let currentGroup = null;
  for (const key of Object.keys(state.groups)) {
    if (state.groups[key].includes(playerId)) {
      currentGroup = key;
      break;
    }
  }
  if (!currentGroup || currentGroup === targetGroup) return;
  const hasScores = state.fixtures.some(f => f.done);
  if (hasScores) {
    if (!confirm('Scores have been entered. Moving this player will reset all group stage scores. Continue?')) return;
    for (const f of state.fixtures) {
      f.s1 = null; f.s2 = null; f.done = false;
    }
  }
  state.groups[currentGroup] = state.groups[currentGroup].filter(p => p !== playerId);
  state.groups[targetGroup].push(playerId);
  state.fixtures = generateFixtures(state.groups);
  const result = calculateStandings(state.groups, state.fixtures, state.participants);
  state.standings = result.standings;
  state.qualifiers = result.qualifiers;
  if (state.knockout.length > 0) {
    state.knockout = [];
    state.qualifiers = [];
  }
  saveState();
  renderGroups();
  document.getElementById('btnProceedKnockout').classList.add('hidden');
}

function toggleEditMode() {
  if (!_isAdmin) return;
  _editMode = !_editMode;
  const btn = document.getElementById('editToggleBtn');
  if (_editMode) {
    btn.textContent = '✏️ Editing';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
  } else {
    btn.textContent = '✏️ Edit';
    btn.style.background = '';
    btn.style.color = '';
  }
  renderGroups();
}

function promptRename(playerIdx) {
  if (!_isAdmin) return;
  const oldName = state.participants ? state.participants[playerIdx].name : state.players[playerIdx];
  const newName = prompt('Rename "' + oldName + '":', oldName);
  if (newName && newName.trim() && newName.trim() !== oldName) {
    const trimmed = newName.trim();
    const allNames = state.participants ? state.participants.map(p => p.name) : state.players;
    if (allNames.some((n, i) => i !== playerIdx && n === trimmed)) {
      alert('Another player already has this name.');
      return;
    }
    renamePlayer(playerIdx, trimmed);
  }
}

function renamePlayer(playerIdx, newName) {
  if (!_isAdmin) return;
  if (state.participants) {
    state.participants[playerIdx].name = newName;
    state.players[playerIdx] = newName;
    const pid = state.participants[playerIdx].id;
    for (const key of Object.keys(state.standings)) {
      for (const r of state.standings[key]) {
        if (r.id === pid) r.name = newName;
      }
    }
    for (const q of state.qualifiers) {
      if (q.id === pid) q.name = newName;
    }
  } else {
    const oldName = state.players[playerIdx];
    if (!oldName) return;
    state.players[playerIdx] = newName;
    for (const key of Object.keys(state.groups)) {
      state.groups[key] = state.groups[key].map(p => p === oldName ? newName : p);
    }
    for (const f of state.fixtures) {
      if (f.p1 === oldName) f.p1 = newName;
      if (f.p2 === oldName) f.p2 = newName;
    }
    for (const key of Object.keys(state.standings)) {
      for (const r of state.standings[key]) {
        if (r.name === oldName) r.name = newName;
      }
    }
    for (const q of state.qualifiers) {
      if (q.name === oldName) q.name = newName;
    }
    for (const m of state.knockout) {
      if (m.p1 === oldName) m.p1 = newName;
      if (m.p2 === oldName) m.p2 = newName;
      if (m.winner === oldName) m.winner = newName;
    }
    if (state.champion === oldName) state.champion = newName;
    if (state.runnerUp === oldName) state.runnerUp = newName;
  }
  saveState();
  renderGroups();
}

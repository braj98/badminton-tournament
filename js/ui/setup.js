// ===================== SETUP =====================
let _lastGoodCount = 4;
let _pendingReduceCount = 0;

function _setupConfig() {
  const cat = getCategories().find(c => c.id === currentCategory);
  return getSportConfig('badminton', cat && cat.type === 'doubles' ? 'doubles' : 'singles');
}

function rebuildPlayerInputs(count) {
  const container = document.getElementById('playerInputs');
  const existingValues = [];
  if (isDoubles(currentCategory)) {
    const rows = container.querySelectorAll('div');
    for (const row of rows) {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 2) existingValues.push([inputs[0].value, inputs[1].value]);
    }
  } else {
    const inputs = container.querySelectorAll('input');
    for (const inp of inputs) existingValues.push(inp.value);
  }
  container.innerHTML = '';
  if (isDoubles(currentCategory)) {
    for (let i = 1; i <= count; i++) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const inp1 = document.createElement('input');
      inp1.type = 'text';
      inp1.placeholder = 'Team ' + i + ' Player A';
      inp1.dataset.team = i - 1;
      inp1.dataset.slot = 'a';
      inp1.value = existingValues[i - 1] ? existingValues[i - 1][0] : 'A' + i;
      const sep = document.createElement('span');
      sep.textContent = '&';
      sep.style.cssText = 'color:var(--muted);font-weight:600;';
      const inp2 = document.createElement('input');
      inp2.type = 'text';
      inp2.placeholder = 'Team ' + i + ' Player B';
      inp2.dataset.team = i - 1;
      inp2.dataset.slot = 'b';
      inp2.value = existingValues[i - 1] ? existingValues[i - 1][1] : 'B' + i;
      row.appendChild(inp1);
      row.appendChild(sep);
      row.appendChild(inp2);
      container.appendChild(row);
    }
  } else {
    for (let i = 1; i <= count; i++) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = 'Player ' + i;
      inp.dataset.idx = i - 1;
      inp.value = existingValues[i - 1] || 'Player ' + i;
      container.appendChild(inp);
    }
  }
}

function onPlayerCountChange() {
  if (!_isAdmin) return;
  const cfg = _setupConfig();
  const newCount = parseInt(document.getElementById('playerCount').value) || cfg.minPlayers;
  const clamped = Math.max(cfg.minPlayers, Math.min(cfg.maxPlayers, newCount));
  document.getElementById('playerCount').value = clamped;
  if (clamped === _lastGoodCount) return;
  if (clamped > _lastGoodCount) {
    _lastGoodCount = clamped;
    rebuildPlayerInputs(clamped);
  } else {
    showReduceConfirm(clamped, _lastGoodCount);
  }
}

function showReduceConfirm(newCount, oldCount) {
  const box = document.getElementById('reduceConfirmBox');
  const list = document.getElementById('reduceConfirmList');
  const container = document.getElementById('playerInputs');
  let names = '';
  if (isDoubles(currentCategory)) {
    const rows = container.querySelectorAll('div');
    for (let i = newCount; i < rows.length; i++) {
      const inputs = rows[i].querySelectorAll('input');
      names += '<div style="padding:2px 0;">• ' + escapeHtml(inputs[0].value) + ' & ' + escapeHtml(inputs[1].value) + '</div>';
    }
  } else {
    const inputs = container.querySelectorAll('input');
    for (let i = newCount; i < inputs.length; i++) {
      names += '<div style="padding:2px 0;">• ' + escapeHtml(inputs[i].value) + '</div>';
    }
  }
  list.innerHTML = '<div style="margin-bottom:6px;font-weight:600;">The following will be removed:</div>' + names;
  box.classList.remove('hidden');
  document.getElementById('reduceConfirmInput').value = '';
  document.getElementById('reduceConfirmError').textContent = '';
  _pendingReduceCount = newCount;
}

function confirmReduce() {
  if (!_isAdmin) return;
  const input = document.getElementById('reduceConfirmInput');
  if (input.value !== 'REMOVE') {
    document.getElementById('reduceConfirmError').textContent = 'Please type REMOVE to confirm.';
    return;
  }
  document.getElementById('reduceConfirmBox').classList.add('hidden');
  _lastGoodCount = _pendingReduceCount;
  rebuildPlayerInputs(_lastGoodCount);
}

function cancelReduce() {
  document.getElementById('reduceConfirmBox').classList.add('hidden');
  document.getElementById('playerCount').value = _lastGoodCount;
}

function showStartConfirm() {
  const box = document.getElementById('startConfirmBox');
  box.classList.toggle('hidden');
  document.getElementById('startConfirmInput').value = '';
  document.getElementById('startConfirmError').textContent = '';
}

function confirmStart() {
  if (!_isAdmin) return;
  const input = document.getElementById('startConfirmInput');
  if (input.value !== 'START') {
    document.getElementById('startConfirmError').textContent = 'Please type START to confirm.';
    return;
  }
  document.getElementById('startConfirmBox').classList.add('hidden');
  startTournament();
}

function startTournament() {
  if (!_isAdmin) return;
  const count = parseInt(document.getElementById('playerCount').value);
  if (isDoubles(currentCategory)) {
    const rows = document.querySelectorAll('#playerInputs > div');
    const names = [];
    const members = [];
    const seen = new Set();
    for (const row of rows) {
      const inputs = row.querySelectorAll('input');
      const a = inputs[0].value.trim();
      const b = inputs[1].value.trim();
      if (!a || !b) { alert('Please fill in all player names for each team.'); return; }
      const teamName = a + ' & ' + b;
      if (seen.has(teamName)) { alert('Duplicate team: "' + teamName + '". Team names must be unique.'); return; }
      seen.add(teamName);
      names.push(teamName);
      members.push({ a: a, b: b });
    }
    if (names.length < _setupConfig().minPlayers || names.length > _setupConfig().maxPlayers) return;
    state = defaultState();
    state.sport = 'badminton';
    state.format = 'doubles';
    const pDbl = names.map((n, i) => createParticipant(n, members[i]));
    state.participants = pDbl;
    state.players = names;
    state.teamMembers = members;
    const cfg = _setupConfig();
    state.groups = createGroups(pDbl, determineGroupCount(pDbl.length, cfg.groupThresholds, cfg.groupCounts));
    state.fixtures = createFixtures(state.groups);
    state.phase = 'groups';
    currentView = state.phase;
    saveState();
    renderAll();
  } else {
    const inputs = document.querySelectorAll('#playerInputs input');
    const names = [];
    const seen = new Set();
    for (const inp of inputs) {
      const n = inp.value.trim();
      if (!n) { alert('Please fill in all player names.'); return; }
      if (seen.has(n)) { alert('Duplicate name: "' + n + '". Each name must be unique.'); return; }
      seen.add(n);
      names.push(n);
    }
    if (names.length < _setupConfig().minPlayers || names.length > _setupConfig().maxPlayers) return;
    state = defaultState();
    state.sport = 'badminton';
    state.format = 'singles';
    const pSingles = names.map(n => createParticipant(n));
    state.participants = pSingles;
    state.players = names;
    const cfg = _setupConfig();
    state.groups = createGroups(pSingles, determineGroupCount(pSingles.length, cfg.groupThresholds, cfg.groupCounts));
    state.fixtures = createFixtures(state.groups);
    state.phase = 'groups';
    currentView = state.phase;
    saveState();
    renderAll();
  }
}

function renderSetup() {
  clearDisabled();
  const saved = localLoad(currentCategory);
  const cat = getCategories().find(c => c.id === currentCategory);
  document.getElementById('setupTitle').textContent = 'New ' + (cat ? escapeHtml(cat.label) + ' — ' : '') + 'Tournament';
  const pc = document.getElementById('playerCount');
  const cfg = _setupConfig();
  pc.min = cfg.minPlayers;
  pc.max = cfg.maxPlayers;
  document.getElementById('setupLabel').textContent = isDoubles(currentCategory)
    ? 'Number of teams (' + cfg.minPlayers + '-' + cfg.maxPlayers + ')'
    : 'Number of players (' + cfg.minPlayers + '-' + cfg.maxPlayers + ')';
  const bar = document.getElementById('resumeBar');
  bar.classList.toggle('hidden', !saved || saved.phase === 'setup');
  const resetSection = document.getElementById('resetSection');
  resetSection.classList.toggle('hidden', !saved);
  document.getElementById('resetConfirmBox').classList.add('hidden');
  document.getElementById('startConfirmBox').classList.add('hidden');
  document.getElementById('reduceConfirmBox').classList.add('hidden');
  const cfg2 = _setupConfig();
  _lastGoodCount = parseInt(pc.value) || cfg2.minPlayers;
  rebuildPlayerInputs(_lastGoodCount);
}

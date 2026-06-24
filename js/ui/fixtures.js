function renderFixtures() {
  clearDisabled();
  const container = document.getElementById('fixtureList');
  const groups = Object.keys(AppState.tournament.groups);
  const fixtures = AppState.tournament.fixtures;
  let html = '';
  for (const key of groups) {
    const gf = fixtures.filter(f => f.group === key);
    if (gf.length === 0) continue;
    const playerCount = (AppState.tournament.groups[key] || []).length;
    const doneCount = gf.filter(f => f.done).length;
    html += '<div class="fixture-group-card">'
      + '<div class="fixture-group-header">'
      + '<span class="fixture-group-label">Group ' + key + '</span>'
      + '<span class="fixture-group-count">' + doneCount + '/' + gf.length + ' done · ' + playerCount + ' players</span>'
      + '</div><div class="fixture-group-matches">';
    for (const f of gf) {
      const done = f.done;
      const n1 = pName(f.p1), n2 = pName(f.p2);
      const i1 = getInitials(n1), i2 = getInitials(n2);
      const winner = done ? (f.s1 > f.s2 ? f.p1 : f.p2) : null;
      const statusIcon = f.status === 'COMPLETED' ? '✓' : f.status === 'LIVE' ? '🔴' : '⏳';
      html += '<div class="match-row' + (done ? ' match-done' : '') + '" id="fixtureRow_' + f.id + '">'
        + '<span class="p-avatar">' + escapeHtml(i1) + '</span>'
        + '<span class="pname' + (done && winner === f.p1 ? ' winner' : '') + '">' + escapeHtml(n1) + '</span>';
      if (isAdmin()) {
        var _max = getCurrentConfig().maxScoreInput;
        html += '<input class="score-input" type="number" min="0" max="' + _max + '" value="' + (f.s1 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.value,this.parentElement.querySelector(\'.s2\').value)" '
          + 'onfocus="this.select()">'
          + '<span class="vs">vs</span>'
          + '<input class="score-input s2" type="number" min="0" max="' + _max + '" value="' + (f.s2 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" '
          + 'onfocus="this.select()">';
      } else {
        html += '<span class="score-text">' + (f.s1 ?? '-') + '</span>'
          + '<span class="vs">vs</span>'
          + '<span class="score-text">' + (f.s2 ?? '-') + '</span>';
      }
      html += '<span class="pname' + (done && winner === f.p2 ? ' winner' : '') + '">' + escapeHtml(n2) + '</span>'
        + '<span class="p-avatar">' + escapeHtml(i2) + '</span>'
        + '<span class="match-badge ' + (done ? 'done' : (f.status === 'LIVE' ? 'live' : 'pending')) + '">' + statusIcon + ' ' + f.status + '</span>'
        + '</div>';
      if (isAdmin() && f.p1 && f.p2 && f.status !== 'COMPLETED') {
        html += '<div class="match-controls" style="display:flex;gap:6px;justify-content:center;padding:4px 0 8px 0;">';
        if (f.status === 'UPCOMING') {
          html += '<button class="btn btn-sm btn-outline" onclick="startFixtureMatch(' + f.id + ')" style="font-size:.7rem;padding:2px 10px;">▶ Start Match</button>';
        }
        if (f.status === 'LIVE') {
          html += '<button class="btn btn-sm btn-outline" onclick="completeFixtureMatch(' + f.id + ')" style="font-size:.7rem;padding:2px 10px;border-color:var(--success);color:var(--success);">☑ Complete Match</button>';
        }
        html += '</div>';
      }
    }
    html += '</div>';
    const rows = AppState.tournament.standings[key];
    if (rows) {
      html += '<table class="standings-table"><thead><tr>'
        + '<th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>PD</th>'
        + '</tr></thead><tbody>';
      for (const r of rows) {
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '';
        html += '<tr' + (r.rank <= 2 ? ' class="qualified"' : '') + '>'
          + '<td class="rank-cell">' + (medal || r.rank) + '</td>'
          + '<td>' + escapeHtml(r.name) + '</td>'
          + '<td>' + r.played + '</td>'
          + '<td>' + r.won + '</td>'
          + '<td>' + r.lost + '</td>'
          + '<td>' + r.pf + '</td>'
          + '<td>' + r.pa + '</td>'
          + '<td>' + (r.pd > 0 ? '+' : '') + r.pd + '</td>'
          + '</tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
  document.getElementById('groupStandings').innerHTML = '';
  const allDone = fixtures.filter(f => f.done).length === fixtures.length;
  document.getElementById('btnProceedKnockout').classList.toggle('hidden', !allDone);
}

function enterFixtureScore(id, s1, s2) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  f.s1 = parseInt(s1) || 0;
  f.s2 = parseInt(s2) || 0;
  f.updatedAt = Date.now();
  if (f.status === 'UPCOMING') f.status = 'LIVE';
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  saveState();
  renderFixtures();
}

function startFixtureMatch(id) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  startMatch(f);
  saveState();
  renderFixtures();
}

function completeFixtureMatch(id) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  completeMatch(f);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  saveState();
  renderFixtures();
}

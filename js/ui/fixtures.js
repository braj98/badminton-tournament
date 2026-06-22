function renderFixtures() {
  clearDisabled();
  const container = document.getElementById('fixtureList');
  const groups = Object.keys(state.groups);
  const fixtures = state.fixtures;
  let html = '';
  for (const key of groups) {
    const gf = fixtures.filter(f => f.group === key);
    if (gf.length === 0) continue;
    html += '<div class="match-group-label">Group ' + key + '</div>';
    for (const f of gf) {
      const done = f.done;
      html += '<div class="match-row' + (done ? ' match-done' : '') + '">'
        + '<span class="pname">' + escapeHtml(pName(f.p1)) + '</span>';
      if (_isAdmin) {
        html += '<input class="score-input" type="number" min="0" max="30" value="' + (f.s1 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.value,this.parentElement.querySelector(\'.s2\').value)" '
          + 'onfocus="this.select()">'
          + '<span class="vs">vs</span>'
          + '<input class="score-input s2" type="number" min="0" max="30" value="' + (f.s2 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" '
          + 'onfocus="this.select()">';
      } else {
        html += '<span class="score-text">' + (f.s1 ?? '') + '</span>'
          + '<span class="vs">vs</span>'
          + '<span class="score-text">' + (f.s2 ?? '') + '</span>';
      }
      html += '<span class="pname">' + escapeHtml(pName(f.p2)) + '</span>'
        + (done ? '<span class="done-label">✓</span>' : '')
        + '</div>';
    }
  }
  container.innerHTML = html;
  const stContainer = document.getElementById('groupStandings');
  let stHtml = '<h2 class="mt-20">Standings</h2>';
  for (const key of groups) {
    const rows = state.standings[key];
    if (!rows) continue;
    stHtml += '<div class="match-group-label">Group ' + key + '</div>'
      + '<table class="standings-table"><thead><tr>'
      + '<th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>PD</th><th>Rk</th>'
      + '</tr></thead><tbody>';
    for (const r of rows) {
      stHtml += '<tr' + (r.rank <= 2 ? ' class="qualified"' : '') + '>'
        + '<td>' + escapeHtml(r.name) + '</td>'
        + '<td>' + r.played + '</td>'
        + '<td>' + r.won + '</td>'
        + '<td>' + r.lost + '</td>'
        + '<td>' + r.pf + '</td>'
        + '<td>' + r.pa + '</td>'
        + '<td>' + (r.pd > 0 ? '+' : '') + r.pd + '</td>'
        + '<td class="' + (r.rank === 1 ? 'rank-1' : '') + '">' + r.rank + '</td>'
        + '</tr>';
    }
    stHtml += '</tbody></table>';
  }
  stContainer.innerHTML = stHtml;
  const allDone = fixtures.every(f => f.done);
  document.getElementById('btnProceedKnockout').classList.toggle('hidden', !allDone);
}

function enterFixtureScore(id, s1, s2) {
  if (!_isAdmin) return;
  const f = state.fixtures.find(m => m.id === id);
  if (!f) return;
  f.s1 = parseInt(s1) || 0;
  f.s2 = parseInt(s2) || 0;
  f.done = f.s1 !== f.s2;
  f.updatedAt = Date.now();
  const result = computeStandings(state.groups, state.fixtures, state.participants);
  state.standings = result.standings;
  state.qualifiers = result.qualifiers;
  state.knockout = createKnockoutBracket(state.qualifiers);
  saveState();
  renderFixtures();
}

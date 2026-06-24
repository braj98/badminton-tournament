function renderUpcomingView() {
  clearDisabled();
  const container = document.getElementById('resultsList');
  if (!AppState.tournament) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No tournament data.</p>';
    return;
  }
  const fixtures = AppState.tournament.fixtures || [];
  const knockout = AppState.tournament.knockout || [];
  console.log('DEBUG upcoming: fixtures=' + fixtures.length + ' knockout=' + (knockout ? knockout.length : 0));
  if (knockout) { knockout.forEach(function(mm,i){ console.log('  KO['+i+'] id='+mm.id+' status='+mm.status+' p1='+mm.p1+' p2='+mm.p2+' done='+mm.done); }); }
  const upcomingMatches = fixtures.filter(function(f) { return f.status === 'UPCOMING' && f.p1 && f.p2; }).concat(
    knockout.filter(function(m) { return m.status === 'UPCOMING' && m.p1 && m.p2; })
  );
  console.log('DEBUG upcomingMatches count=' + upcomingMatches.length);
  if (upcomingMatches.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No upcoming matches.</p>';
    return;
  }
  const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final', 'group': 'Group Stage' };
  let html = '<div class="results-cards">';
  for (const m of upcomingMatches) {
    var n1 = pName(m.p1), n2 = pName(m.p2);
    html += '<div class="result-card">'
      + '<div class="result-card-header">'
      + '<span class="result-cat">' + escapeHtml(roundLabel[m.round] || m.round) + '</span>'
      + '<span class="result-round" style="color:var(--text-muted);">⏳ Upcoming</span>'
      + '</div>'
      + '<div class="result-match">' + escapeHtml(n1) + ' <span class="vs">vs</span> ' + escapeHtml(n2) + '</div>';
    if (isAdmin()) {
      html += '<div style="margin-top:6px;"><button class="btn btn-sm btn-outline" onclick="startUpcomingMatch(\'' + m.id + '\')" style="font-size:.75rem;padding:2px 12px;">▶ Start Match</button></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.add('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function startUpcomingMatch(id) {
  if (!isAdmin()) return;
  var m = AppState.tournament.fixtures.find(function(f) { return f.id === id; })
    || AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  startMatch(m);
  saveState();
  renderUpcomingView();
}
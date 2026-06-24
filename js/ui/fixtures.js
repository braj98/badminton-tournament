function completeFixtureMatch(id) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  completeMatch(f);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  var champ = syncChampion(AppState.tournament.participants, AppState.tournament.knockout);
  AppState.tournament.champion = champ.champion;
  AppState.tournament.runnerUp = champ.runnerUp;
  saveState();
  renderFixtures();
}

function revertFixtureMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Revert this match to Upcoming? Scores will be cleared.')) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  revertMatch(f);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  var champ = syncChampion(AppState.tournament.participants, AppState.tournament.knockout);
  AppState.tournament.champion = champ.champion;
  AppState.tournament.runnerUp = champ.runnerUp;
  saveState();
  renderFixtures();
}

function reopenFixtureMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Reopen this match? It will go back to live and scores will be cleared.')) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  reopenMatch(f);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  var champ = syncChampion(AppState.tournament.participants, AppState.tournament.knockout);
  AppState.tournament.champion = champ.champion;
  AppState.tournament.runnerUp = champ.runnerUp;
  saveState();
  renderFixtures();
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
  if (!confirm('Start this fixture match? It will be marked as live.')) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  startMatch(f);
  saveState();
  renderFixtures();
}

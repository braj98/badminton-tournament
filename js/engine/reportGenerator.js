function generateEventReport(event, categories, tournamentStateMap) {
  if (!event || !categories || !tournamentStateMap) {
    return createEmptyReport(event ? event.id : null, event ? event.name : null);
  }

  var report = createEmptyReport(event.id, event.name);
  var sportMap = {};

  for (var i = 0; i < event.templateIds.length; i++) {
    var tmplId = event.templateIds[i];
    var cat = categories.find(function(c) { return c.id === tmplId; });
    if (!cat) continue;

    var state = tournamentStateMap[tmplId];
    if (!state) continue;

    var sportName = cat.sport || 'unknown';
    if (!sportMap[sportName]) {
      sportMap[sportName] = createSportSummary(sportName);
    }

    var comp = createCompetitionSummary(tmplId, cat.label);

    var champion = null;
    var runnerUp = null;
    var participants = state.participants || [];

    if (state.knockout && state.knockout.length > 0) {
      var finalMatch = state.knockout.find(function(m) { return m.id === 'final'; });
      if (finalMatch && finalMatch.done && finalMatch.winner) {
        champion = resolveName(finalMatch.winner, participants);
        runnerUp = resolveName(
          finalMatch.winner === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1,
          participants
        );
      }
    }

    if (!champion && state.champion) {
      champion = state.champion;
      runnerUp = state.runnerUp || null;
    }

    comp.champion = champion;
    comp.runnerUp = runnerUp;

    var allMatches = (state.fixtures || []).concat(state.knockout || []);
    comp.matches = allMatches.length;
    comp.completed = allMatches.filter(function(m) { return m.done || m.status === 'COMPLETED'; }).length;

    sportMap[sportName].competitions.push(comp);
    sportMap[sportName].participants += participants.length;
    sportMap[sportName].totalMatches += comp.matches;
  }

  report.sports = Object.keys(sportMap).map(function(key) { return sportMap[key]; });

  var totalParts = 0;
  var totalComps = 0;
  var totalMatches = 0;
  for (var s = 0; s < report.sports.length; s++) {
    totalParts += report.sports[s].participants;
    totalComps += report.sports[s].competitions.length;
    totalMatches += report.sports[s].totalMatches;
  }
  report.totals = {
    participants: totalParts,
    competitions: totalComps,
    sports: report.sports.length,
    matches: totalMatches
  };

  return report;
}

function resolveName(id, participants) {
  if (!participants || !participants.length) return id;
  var p = participants.find(function(pp) { return pp.id === id; });
  return p ? p.name : id;
}

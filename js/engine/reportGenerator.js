function generateEventReport(event, categories, tournamentStateMap) {
  if (!event || !categories || !tournamentStateMap) {
    return createEventReport(event ? event.id : null, event ? event.name : null);
  }

  var report = createEventReport(event.id, event.name);
  var sportMap = {};
  var allChampions = [];

  var earliestStart = Infinity;
  var latestComplete = 0;

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

    var participants = state.participants || [];
    var fixtureMatches = state.fixtures || [];
    var knockoutMatches = state.knockout || [];
    var allMatches = fixtureMatches.concat(knockoutMatches);

    var champion = null;
    var runnerUp = null;

    if (knockoutMatches.length > 0) {
      var finalMatch = knockoutMatches.find(function(m) { return m.id === 'final'; });
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

    allChampions.push(createChampionEntry(sportName, cat.label, champion, runnerUp));

    for (var mi = 0; mi < allMatches.length; mi++) {
      var m = allMatches[mi];
      if (m.round === 'group') {
        report.matchStats.group++;
      } else if (m.round === 'QF') {
        report.matchStats.quarterFinal++;
      } else if (m.round === 'SF') {
        report.matchStats.semiFinal++;
      } else if (m.round === 'Final') {
        report.matchStats.final++;
      }
      if (m.done || m.status === 'COMPLETED') {
        report.matchStats.completed++;
      }
      if ((!m.p1 || !m.p2) && !(m.done || m.status === 'COMPLETED')) {
        report.matchStats.bye++;
      }
    }

    sportMap[sportName].competitions.push(cat.label);
    sportMap[sportName].participants += participants.length;
    sportMap[sportName].matches += allMatches.length;
    sportMap[sportName].champions.push({ competition: cat.label, champion: champion, runnerUp: runnerUp });

    // Timeline: track earliest non-setup save and latest champion save
    if (state.phase && state.phase !== 'setup' && state._lastSave && state._lastSave < earliestStart) {
      earliestStart = state._lastSave;
    }
    if (state.phase === 'champion' && state._lastSave && state._lastSave > latestComplete) {
      latestComplete = state._lastSave;
    }
  }

  report.sports = Object.keys(sportMap).map(function(key) { return sportMap[key]; });
  report.champions = allChampions;

  var totalParts = 0;
  var totalComps = 0;
  var totalMatches = 0;
  var totalCompleted = 0;
  for (var s = 0; s < report.sports.length; s++) {
    totalParts += report.sports[s].participants;
    totalComps += report.sports[s].competitions.length;
    totalMatches += report.sports[s].matches;
    // Count completed for each sport
    var sc = 0;
    for (var sci = 0; sci < report.sports[s].champions.length; sci++) {
      if (report.sports[s].champions[sci].champion) sc++;
    }
    report.sports[s].completed = sc;
  }

  // Count completed competitions from the flat list
  for (var ci = 0; ci < report.champions.length; ci++) {
    if (report.champions[ci].champion) totalCompleted++;
  }

  report.highlights = {
    participants: totalParts,
    sports: report.sports.length,
    competitions: totalComps,
    matches: totalMatches,
    completed: totalCompleted
  };

  // Auto-generate narrative
  report.narrative = totalParts + ' enthusiastic participants competed across ' + totalMatches + ' exciting matches, making ' + event.name + ' a memorable success.';

  // Timeline from tournament states
  if (earliestStart !== Infinity) report.timeline.started = earliestStart;
  if (latestComplete > 0) report.timeline.completed = latestComplete;

  return report;
}

function resolveName(id, participants) {
  if (!participants || !participants.length) return id;
  var p = participants.find(function(pp) { return pp.id === id; });
  return p ? p.name : id;
}

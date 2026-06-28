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
    var champ = generateChampionSummary(state, participants);
    allChampions.push(createChampionEntry(sportName, cat.label, champ.champion, champ.runnerUp));

    var ms = generateMatchStatistics(state.fixtures, state.knockout);
    report.matchStats.group += ms.group;
    report.matchStats.quarterFinal += ms.quarterFinal;
    report.matchStats.semiFinal += ms.semiFinal;
    report.matchStats.final += ms.final;
    report.matchStats.completed += ms.completed;
    report.matchStats.bye += ms.bye;

    var fixtureMatches = state.fixtures || [];
    var knockoutMatches = state.knockout || [];
    generateSportSummary(sportMap, sportName, cat, participants.length, fixtureMatches.length + knockoutMatches.length, champ.champion, champ.runnerUp);
    generateTimeline(state, earliestStart, latestComplete);
  }

  report.sports = Object.keys(sportMap).map(function(key) { return sportMap[key]; });
  report.champions = allChampions;

  generateHighlights(report, event.name);
  finalizeTimeline(report, earliestStart, latestComplete);

  return report;
}

function generateChampionSummary(state, participants) {
  var champion = null;
  var runnerUp = null;
  var knockoutMatches = state.knockout || [];
  if (knockoutMatches.length > 0) {
    var finalMatch = knockoutMatches.find(function(m) { return m.id === 'final'; });
    if (finalMatch && finalMatch.done && finalMatch.winner) {
      champion = resolveName(finalMatch.winner, participants);
      runnerUp = resolveName(finalMatch.winner === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1, participants);
    }
  }
  if (!champion && state.champion) {
    champion = state.champion;
    runnerUp = state.runnerUp || null;
  }
  return { champion: champion, runnerUp: runnerUp };
}

function generateMatchStatistics(fixtures, knockout) {
  var allMatches = (fixtures || []).concat(knockout || []);
  var s = { group: 0, quarterFinal: 0, semiFinal: 0, final: 0, completed: 0, bye: 0 };
  for (var mi = 0; mi < allMatches.length; mi++) {
    var m = allMatches[mi];
    if (m.round === 'group') s.group++;
    else if (m.round === 'QF') s.quarterFinal++;
    else if (m.round === 'SF') s.semiFinal++;
    else if (m.round === 'Final') s.final++;
    if (m.done || m.status === 'COMPLETED') s.completed++;
    if ((!m.p1 || !m.p2) && !(m.done || m.status === 'COMPLETED')) s.bye++;
  }
  return s;
}

function generateSportSummary(sportMap, sportName, cat, numParticipants, numMatches, champion, runnerUp) {
  var sn = sportMap[sportName];
  sn.competitions.push(cat.label);
  sn.participants += numParticipants;
  sn.matches += numMatches;
  sn.champions.push({ competition: cat.label, champion: champion, runnerUp: runnerUp });
}

function generateHighlights(report, eventName) {
  var sports = report.sports;
  var champions = report.champions;
  var totalParts = 0, totalComps = 0, totalMatches = 0, totalCompleted = 0;
  for (var s = 0; s < sports.length; s++) {
    totalParts += sports[s].participants;
    totalComps += sports[s].competitions.length;
    totalMatches += sports[s].matches;
    var sc = 0;
    for (var sci = 0; sci < sports[s].champions.length; sci++) {
      if (sports[s].champions[sci].champion) sc++;
    }
    sports[s].completed = sc;
  }
  for (var ci = 0; ci < champions.length; ci++) {
    if (champions[ci].champion) totalCompleted++;
  }
  report.highlights = {
    participants: totalParts,
    sports: sports.length,
    competitions: totalComps,
    matches: totalMatches,
    completed: totalCompleted
  };
  report.narrative = totalParts + ' enthusiastic participants competed across ' + totalMatches + ' exciting matches, making ' + eventName + ' a memorable success.';
}

function generateTimeline(state, earliestStart, latestComplete) {
  if (state.phase && state.phase !== 'setup' && state._lastSave && state._lastSave < earliestStart) {
    earliestStart = state._lastSave;
  }
  if (state.phase === 'champion' && state._lastSave && state._lastSave > latestComplete) {
    latestComplete = state._lastSave;
  }
}

function finalizeTimeline(report, earliestStart, latestComplete) {
  if (earliestStart !== Infinity) report.timeline.started = earliestStart;
  if (latestComplete > 0) report.timeline.completed = latestComplete;
}

function resolveName(id, participants) {
  if (!participants || !participants.length) return id;
  var p = participants.find(function(pp) { return pp.id === id; });
  return p ? p.name : id;
}

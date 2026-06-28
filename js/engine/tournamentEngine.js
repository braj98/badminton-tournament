// tournamentEngine.js — Public API for tournament operations
// UI code calls only these functions, never engine internals directly

function createGroups(entries, groupCount) {
  return allocateGroups(entries, groupCount);
}

function createFixtures(groups) {
  return generateFixtures(groups);
}

function computeStandings(groups, fixtures, participants) {
  return calculateStandings(groups, fixtures, participants);
}

function createKnockoutBracket(qualifiers) {
  return generateKnockout(qualifiers);
}

function advanceWinner(knockout) {
  return advanceKnockout(knockout);
}

function startMatch(match) {
  if (match.status === 'COMPLETED' || match.done) { alert('Cannot start a completed match.'); return false; }
  if (match.status === 'LIVE') { alert('Match is already live.'); return false; }
  match.status = 'LIVE';
  match.updatedAt = Date.now();
  return true;
}

function completeMatch(match, participants, finalSets) {
  if (match.status === 'COMPLETED') { alert('Match is already completed.'); return false; }
  var w1 = 0, w2 = 0, winner = null;
  if (match.round === 'Final' && match.sets && finalSets > 0) {
    var needed = Math.ceil(finalSets / 2);
    for (var i = 0; i < match.sets.length; i++) {
      var set = match.sets[i];
      if (!set || set.s1 === null || set.s2 === null) continue;
      if (set.s1 < 0 || set.s2 < 0) {
        alert('Scores cannot be negative.');
        return false;
      }
      if (set.s1 === set.s2) {
        alert('Sets cannot be tied. Each set must have a winner.');
        return false;
      }
      if (set.s1 > set.s2) w1++;
      else w2++;
    }
    if (w1 < needed && w2 < needed) {
      alert('A player must win at least ' + needed + ' sets to complete the match.');
      return false;
    }
    winner = w1 >= w2 ? match.p1 : match.p2;
  } else if (match.s1 !== null && match.s2 !== null && match.s1 !== match.s2 && match.p1 && match.p2) {
    winner = match.s1 > match.s2 ? match.p1 : match.p2;
  }
  match.done = true;
  match.status = 'COMPLETED';
  match.updatedAt = Date.now();
  if (match.round === 'Final' && match.sets) {
    match.winner = winner;
    match.s1 = w1;
    match.s2 = w2;
  } else {
    match.winner = winner || null;
  }
  return true;
}

function reopenMatch(match) {
  match.status = 'LIVE';
  match.done = false;
  match.winner = null;
  match.updatedAt = Date.now();
}

function syncChampion(participants, knockout) {
  const finalMatch = knockout ? knockout.find(m => m.id === 'final') : null;
  if (finalMatch && finalMatch.done && finalMatch.winner) {
    participants = participants || [];
    const winnerName = participants.length > 0
      ? (participants.find(p => p.id === finalMatch.winner) || {}).name || finalMatch.winner
      : finalMatch.winner;
    const loserId = finalMatch.winner === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1;
    const loserName = participants.length > 0
      ? (participants.find(p => p.id === loserId) || {}).name || loserId
      : loserId;
    return { champion: winnerName, runnerUp: loserName };
  }
  return { champion: null, runnerUp: null };
}

function syncTournamentState(state) {
  if (!state) return;
  // 1. Migrate match status (folds old migrateMatchStatus logic)
  ['fixtures', 'knockout'].forEach(function(key) {
    var arr = state[key];
    if (!arr || !arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i].status) {
        arr[i].status = arr[i].done ? 'COMPLETED' : 'UPCOMING';
      }
    }
  });
  // 2. Sync champion/runnerUp/phase/completedAt
  var champ = syncChampion(state.participants, state.knockout);
  state.champion = champ.champion;
  state.runnerUp = champ.runnerUp;
  if (champ.champion) {
    state.phase = 'champion';
    state.completedAt = state.completedAt || Date.now();
  } else if (state.phase === 'champion') {
    state.phase = 'knockout';
    state.completedAt = null;
  } else if (state.phase === 'setup' || !state.phase || state.phase === 'groups' || state.phase === 'fixtures') {
    // Phase is correctly reflecting current tournament stage — no change needed
  } else if ((!state.knockout || state.knockout.length === 0) && state.fixtures && state.fixtures.length > 0) {
    // Round-robin only (no knockout): check if all fixtures done
    var allDone = state.fixtures.every(function(f) { return f.done || !f.p1; });
    if (allDone && state.fixtures.length > 0) {
      state.phase = 'champion';
      state.completedAt = state.completedAt || Date.now();
    }
  }
}

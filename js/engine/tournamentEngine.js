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
  match.status = 'LIVE';
  match.updatedAt = Date.now();
}

function completeMatch(match, participants) {
  match.done = true;
  match.status = 'COMPLETED';
  match.updatedAt = Date.now();
  if (match.round === 'Final' && match.sets) {
    let w1 = 0, w2 = 0;
    for (const s of match.sets) {
      if (s.s1 !== null && s.s2 !== null) {
        if (s.s1 > s.s2) w1++;
        else if (s.s2 > s.s1) w2++;
      }
    }
    match.winner = w1 >= w2 ? match.p1 : match.p2;
    match.s1 = w1;
    match.s2 = w2;
  } else if (match.s1 !== null && match.s2 !== null && match.s1 !== match.s2 && match.p1 && match.p2) {
    match.winner = match.s1 > match.s2 ? match.p1 : match.p2;
  }
}

function reopenMatch(match) {
  match.status = 'LIVE';
  match.done = false;
  match.winner = null;
  match.updatedAt = Date.now();
}

function syncChampion(participants, knockout) {
  const finalMatch = knockout.find(m => m.id === 'final');
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

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

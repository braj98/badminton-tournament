function createTournament(sport, format) {
  var now = Date.now();
  return {
    phase: 'setup',
    sport: sport || 'badminton',
    format: format || 'singles',
    createdAt: now,
    updatedAt: now,
    participants: [],
    players: [],
    groups: {},
    fixtures: [],
    standings: {},
    qualifiers: [],
    knockout: [],
    champion: null,
    runnerUp: null,
    championPhoto: null,
    runnerUpPhoto: null,
    teamMembers: [],
    completedAt: null,
    _lastSave: null
  };
}

function isTeamSport(format) {
  return format === 'doubles';
}

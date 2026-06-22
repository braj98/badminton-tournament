function createTournament(sport, format) {
  return {
    phase: 'setup',
    sport: sport || 'badminton',
    format: format || 'singles',
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

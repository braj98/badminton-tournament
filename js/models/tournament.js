function createTournament(sport, format) {
  const base = defaultState();
  return {
    ...base,
    sport: sport || 'badminton',
    format: format || 'singles',
    participants: []
  };
}

function isTeamSport(format) {
  return format === 'doubles';
}

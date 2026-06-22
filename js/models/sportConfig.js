// sportConfig.js — Centralized sport configuration
// All sport-specific values defined here, never hardcoded in engine or UI

const SPORT_CONFIG = {
  badminton: {
    displayName: "Badminton",
    icon: "🏸",
    supportsDoubles: true,
    teamBased: false,
    minPlayers: 2,
    maxPlayers: 20,
    groupPointsToWin: 13,
    knockoutPointsToWin: 11,
    finalSets: 3,
    finalPointsToWin: 11,
    maxScoreInput: 30,
    maxFinalSetInput: 15,
    groupThresholds: [5, 10, 20],
    groupCounts: [1, 2, 4]
  },
  tableTennis: {
    displayName: "Table Tennis",
    icon: "🏓",
    supportsDoubles: true,
    teamBased: false,
    minPlayers: 2,
    maxPlayers: 32,
    groupPointsToWin: 11,
    knockoutPointsToWin: 11,
    finalSets: 5,
    finalPointsToWin: 11,
    maxScoreInput: 20,
    maxFinalSetInput: 15,
    groupThresholds: [5, 10, 32],
    groupCounts: [1, 2, 4]
  },
  chess: {
    displayName: "Chess",
    icon: "♟",
    supportsDoubles: false,
    teamBased: false,
    minPlayers: 2,
    maxPlayers: 50,
    groupPointsToWin: 1,
    knockoutPointsToWin: 1,
    finalSets: 1,
    finalPointsToWin: 1,
    maxScoreInput: 1,
    maxFinalSetInput: 1,
    groupThresholds: [5, 10, 50],
    groupCounts: [1, 2, 4]
  }
};

function getSportConfig(sport, format) {
  const base = SPORT_CONFIG[sport] || SPORT_CONFIG.badminton;
  return format === 'doubles' ? { ...base, isTeamSport: true } : { ...base, isTeamSport: false };
}



function getCurrentConfig() {
  return getSportConfig(
    (AppState.tournament && AppState.tournament.sport) || 'badminton',
    (AppState.tournament && AppState.tournament.format) || 'singles'
  );
}

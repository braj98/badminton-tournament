const MIN_ENTRIES = 2;
const MAX_ENTRIES = 20;

function defaultState() {
  return {
    phase: 'setup',
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

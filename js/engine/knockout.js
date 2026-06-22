function generateKnockout(qualifiers) {
  if (qualifiers.length === 2) {
    return [
      { id: 'final', round: 'Final', p1: qualifiers[0].id, p2: qualifiers[1].id,
        s1: null, s2: null, sets: null, done: false, winner: null }
    ];
  }
  if (qualifiers.length === 4) {
    return [
      { id: 'sf1', round: 'SF', p1: qualifiers[0].id, p2: qualifiers[3].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'sf2', round: 'SF', p1: qualifiers[1].id, p2: qualifiers[2].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'final', round: 'Final', p1: null, p2: null,
        s1: null, s2: null, sets: null, done: false, winner: null }
    ];
  }
  if (qualifiers.length === 8) {
    return [
      { id: 'qf1', round: 'QF', p1: qualifiers[0].id, p2: qualifiers[3].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'qf2', round: 'QF', p1: qualifiers[1].id, p2: qualifiers[2].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'qf3', round: 'QF', p1: qualifiers[4].id, p2: qualifiers[7].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'qf4', round: 'QF', p1: qualifiers[5].id, p2: qualifiers[6].id,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'sf1', round: 'SF', p1: null, p2: null,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'sf2', round: 'SF', p1: null, p2: null,
        s1: null, s2: null, sets: null, done: false, winner: null },
      { id: 'final', round: 'Final', p1: null, p2: null,
        s1: null, s2: null, sets: null, done: false, winner: null }
    ];
  }
  return [];
}

function advanceKnockout(knockout) {
  if (knockout.length <= 2) return knockout;
  const winnerMap = {};
  for (const m of knockout) {
    if (m.done && m.winner) winnerMap[m.id] = m.winner;
  }
  const ko = knockout.map(m => ({ ...m }));
  const hasQF = ko.some(m => m.id.startsWith('qf'));
  const sf1Idx = ko.findIndex(m => m.id === 'sf1');
  const sf2Idx = ko.findIndex(m => m.id === 'sf2');
  const finalIdx = ko.findIndex(m => m.id === 'final');
  if (hasQF) {
    ko[sf1Idx].p1 = winnerMap['qf1'] || null;
    ko[sf1Idx].p2 = winnerMap['qf2'] || null;
    ko[sf2Idx].p1 = winnerMap['qf3'] || null;
    ko[sf2Idx].p2 = winnerMap['qf4'] || null;
    for (const idx of [sf1Idx, sf2Idx]) {
      if (!ko[idx].p1 || !ko[idx].p2) {
        ko[idx].done = false; ko[idx].winner = null;
        ko[idx].s1 = null; ko[idx].s2 = null;
      }
    }
  }
  ko[finalIdx].p1 = winnerMap['sf1'] || null;
  ko[finalIdx].p2 = winnerMap['sf2'] || null;
  if (!ko[finalIdx].p1 || !ko[finalIdx].p2) {
    ko[finalIdx].done = false; ko[finalIdx].winner = null;
    ko[finalIdx].s1 = null; ko[finalIdx].s2 = null; ko[finalIdx].sets = null;
  }
  return ko;
}

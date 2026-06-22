function generateKnockout(qualifiers) {
  if (qualifiers.length === 2) {
    return [createMatch(qualifiers[0].id, qualifiers[1].id, 'Final', null, 'final')];
  }
  if (qualifiers.length === 4) {
    return [
      createMatch(qualifiers[0].id, qualifiers[3].id, 'SF', null, 'sf1'),
      createMatch(qualifiers[1].id, qualifiers[2].id, 'SF', null, 'sf2'),
      createMatch(null, null, 'Final', null, 'final')
    ];
  }
  if (qualifiers.length === 8) {
    return [
      createMatch(qualifiers[0].id, qualifiers[3].id, 'QF', null, 'qf1'),
      createMatch(qualifiers[1].id, qualifiers[2].id, 'QF', null, 'qf2'),
      createMatch(qualifiers[4].id, qualifiers[7].id, 'QF', null, 'qf3'),
      createMatch(qualifiers[5].id, qualifiers[6].id, 'QF', null, 'qf4'),
      createMatch(null, null, 'SF', null, 'sf1'),
      createMatch(null, null, 'SF', null, 'sf2'),
      createMatch(null, null, 'Final', null, 'final')
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

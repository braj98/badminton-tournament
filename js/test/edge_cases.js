/* Edge Case Test Suite
   Load this AFTER all engine scripts (state.js, groups.js, fixtures.js, standings.js, knockout.js)
   Run: runAllEdgeCaseTests() from browser console
*/

function assert(condition, msg) {
  if (!condition) {
    console.error('  FAIL: ' + msg);
    return false;
  }
  console.log('  PASS: ' + msg);
  return true;
}

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => 'P' + String(i + 1));
}

function fillGroupScores(groups, fixtures) {
  for (const f of fixtures) {
    f.s1 = 13;
    f.s2 = Math.floor(Math.random() * 11);
    f.done = true;
  }
  // ensure no draws — if scores equal, adjust
  for (const f of fixtures) {
    if (f.s1 === f.s2) {
      f.s1 = 13;
      f.s2 = 10;
    }
  }
}

function testPlayerCount(n) {
  console.log('\n=== Testing ' + n + ' players ===');
  let pass = true;

  // 1. determineGroupCount
  const groupCount = determineGroupCount(n);
  let expectedGroups = n < 6 ? 1 : (n <= 10 ? 2 : 4);
  pass &= assert(groupCount === expectedGroups, 'determineGroupCount(' + n + ') = ' + groupCount + ' (expected ' + expectedGroups + ')');

  // 2. allocateGroups
  const players = makePlayers(n);
  const groups = allocateGroups(players, groupCount);
  const groupKeys = Object.keys(groups);
  pass &= assert(groupKeys.length === groupCount, 'Created ' + groupKeys.length + ' groups (expected ' + groupCount + ')');

  const sizes = groupKeys.map(k => groups[k].length);
  const totalAllocated = sizes.reduce((a, b) => a + b, 0);
  pass &= assert(totalAllocated === n, 'All ' + n + ' players allocated (got ' + totalAllocated + ')');

  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  pass &= assert(maxSize - minSize <= 1, 'Groups balanced: sizes=' + JSON.stringify(sizes) + ' (max-min=' + (maxSize - minSize) + ')');

  const allUnique = new Set([].concat(...groupKeys.map(k => groups[k]))).size === n;
  pass &= assert(allUnique, 'All players unique across groups');

  // 3. generateFixtures
  const fixtures = generateFixtures(groups);
  let expectedMatches = 0;
  for (const k of groupKeys) {
    const m = groups[k].length;
    expectedMatches += m * (m - 1) / 2;
  }
  pass &= assert(fixtures.length === expectedMatches, 'Generated ' + fixtures.length + ' matches (expected ' + expectedMatches + ')');

  // check interleaving: group order should alternate
  const groupOrder = fixtures.map(f => f.group);
  const uniqueGroupsInOrder = [...new Set(groupOrder)];
  pass &= assert(uniqueGroupsInOrder.length === groupCount, 'Interleaving: ' + uniqueGroupsInOrder.length + ' groups appear (expected ' + groupCount + ')');

  // check all fixtures have unique ids
  const ids = fixtures.map(f => f.id);
  pass &= assert(new Set(ids).size === fixtures.length, 'All fixture ids unique');

  // check head-to-head completeness (each pair plays exactly once)
  const pairSet = new Set();
  let pairsComplete = true;
  for (const k of groupKeys) {
    const members = groups[k];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = k + ':' + [members[i], members[j]].sort().join('-');
        pairSet.add(key);
      }
    }
  }
  for (const f of fixtures) {
    const key = f.group + ':' + [f.p1, f.p2].sort().join('-');
    if (!pairSet.has(key)) {
      pass &= assert(false, 'Fixture ' + f.id + ' pair not in expected pairs');
      pairsComplete = false;
    }
    pairSet.delete(key);
  }
  if (pairSet.size > 0) {
    pass &= assert(false, pairSet.size + ' expected pairs missing from fixtures');
  } else if (pairsComplete) {
    pass &= assert(true, 'All head-to-head pairs covered');
  }

  // 4. Fill scores & calculateStandings
  fillGroupScores(groups, fixtures);
  const result = calculateStandings(groups, fixtures);
  const standingsKeys = Object.keys(result.standings);
  pass &= assert(standingsKeys.length === groupCount, 'Standings computed for ' + standingsKeys.length + ' groups');

  for (const k of standingsKeys) {
    const st = result.standings[k];
    pass &= assert(st.length === groups[k].length, 'Group ' + k + ' standings has ' + st.length + ' entries (expected ' + groups[k].length + ')');
    // check ranking order: rank 1, 2, 3, ...
    for (let i = 0; i < st.length; i++) {
      pass &= assert(st[i].rank === i + 1, 'Group ' + k + ' player ' + st[i].name + ' rank=' + st[i].rank);
    }
    // check sorting: wins descending, then pd descending
    for (let i = 0; i < st.length - 1; i++) {
      if (st[i].won < st[i + 1].won) {
        pass &= assert(false, 'Group ' + k + ' sorting error: rank ' + (i + 1) + ' won=' + st[i].won + ' < rank ' + (i + 2) + ' won=' + st[i + 1].won);
      } else if (st[i].won === st[i + 1].won && st[i].pd < st[i + 1].pd) {
        pass &= assert(false, 'Group ' + k + ' sorting error: same wins but pd ' + st[i].pd + ' < ' + st[i + 1].pd);
      }
    }
  }

  // 5. Qualifiers
  const qualifiers = result.qualifiers;
  pass &= assert(qualifiers.length === groupCount * 2, 'Qualifiers count = ' + qualifiers.length + ' (expected ' + (groupCount * 2) + ')');

  // each group contributes exactly 2
  for (const k of groupKeys) {
    const qInGroup = qualifiers.filter(q => q.group === k);
    pass &= assert(qInGroup.length === 2, 'Group ' + k + ' has ' + qInGroup.length + ' qualifiers (expected 2)');
    // qualifiers should be rank 1 and 2 from standings
    const rank1 = qInGroup.find(q => q.rank === 1);
    const rank2 = qInGroup.find(q => q.rank === 2);
    pass &= assert(!!rank1 && !!rank2, 'Group ' + k + ' qualifiers include rank 1 and 2');
  }

  // 6. generateKnockout
  const knockout = generateKnockout(qualifiers);
  if (n <= 1) {
    pass &= assert(knockout.length === 0, 'Empty knockout for ' + n + ' players');
  } else {
    let expectedRounds = 1;
    if (groupCount >= 4) expectedRounds = 3; // QF+SF+Final
    else if (groupCount >= 2) expectedRounds = 2; // SF+Final
    // For 2 groups (n=6-10): qualifiers=4 -> SF+Final = 3 matches
    // For 1 group (n<6): qualifiers=2 -> Final = 1 match
    let expectedMatches = qualifiers.length / 2; // number of matches in first round
    let totalExpected = 0;
    let m = qualifiers.length;
    while (m >= 2) {
      totalExpected += m / 2;
      m = m / 2;
    }
    pass &= assert(knockout.length === totalExpected, 'Knockout has ' + knockout.length + ' matches (expected ' + totalExpected + ')');

    // check all rounds present
    const rounds = [...new Set(knockout.map(m => m.round))];
    if (totalExpected === 1) {
      pass &= assert(rounds[0] === 'Final', 'Knockout round = ' + rounds[0] + ' (expected Final)');
    } else if (totalExpected === 3) {
      pass &= assert(rounds.includes('SF') && rounds.includes('Final'), 'Knockout has SF and Final rounds');
    } else if (totalExpected === 7) {
      pass &= assert(rounds.includes('QF') && rounds.includes('SF') && rounds.includes('Final'), 'Knockout has QF, SF, Final rounds');
    }

    // 7. advanceKnockout - simulate full tournament progression
    let ko = knockout.map(m => ({ ...m }));
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of ko) {
        if (m.p1 && m.p2 && !m.done) {
          m.s1 = 11;
          m.s2 = Math.floor(Math.random() * 9);
          m.done = true;
          m.winner = m.s1 > m.s2 ? m.p1 : m.p2;
          changed = true;
        }
      }
      if (changed) ko = advanceKnockout(ko);
    }
    pass &= assert(ko.length === knockout.length, 'Advanced knockout length unchanged');

    const finalMatch = ko.find(m => m.round === 'Final');
    pass &= assert(finalMatch.p1 !== null && finalMatch.p2 !== null,
      'Final has both participants (p1=' + finalMatch.p1 + ', p2=' + finalMatch.p2 + ')');

    // 8. Determine champion
    const champion = finalMatch.winner;
    pass &= assert(champion !== null, 'Champion determined: ' + champion);
    const runnerUp = champion === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1;
    pass &= assert(runnerUp !== null, 'Runner-up determined: ' + runnerUp);
    pass &= assert(champion !== runnerUp, 'Champion and runner-up are different');
  }

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testParticipantModel() {
  console.log('\n=== Participant Model ===');
  let pass = true;

  const p1 = createParticipant('Alice');
  pass &= assert(typeof p1.id === 'string' && p1.id.startsWith('p'), 'createParticipant returns id like "p..."');
  pass &= assert(p1.name === 'Alice', 'createParticipant name = Alice');
  pass &= assert(p1.members === null, 'Singles participant members = null');

  const p2 = createParticipant('Bob & Carol', { a: 'Bob', b: 'Carol' });
  pass &= assert(p2.name === 'Bob & Carol', 'Doubles team name');
  pass &= assert(p2.members.a === 'Bob' && p2.members.b === 'Carol', 'Doubles team members');

  const participants = [p1, p2];
  const found = findParticipant(participants, p1.id);
  pass &= assert(found === p1, 'findParticipant by id');
  pass &= assert(findParticipant(participants, 'nonexistent') === undefined, 'findParticipant returns undefined for missing');

  const name1 = participantName(participants, p1.id);
  pass &= assert(name1 === 'Alice', 'participantName resolves');
  pass &= assert(participantName(participants, 'nonexistent') === undefined, 'participantName returns undefined for missing');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testNewFormatFlow() {
  console.log('\n=== New Format Flow (Participant IDs) ===');
  let pass = true;

  // Create participants like startTournament does
  const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  const participants = names.map(n => createParticipant(n));
  pass &= assert(participants.length === 6, 'Created 6 participants');
  pass &= assert(participants.every(p => p.id && p.name), 'All participants have id and name');

  const groupCount = determineGroupCount(participants.length);
  pass &= assert(groupCount === 2, '6 participants -> 2 groups');

  // allocateGroups with participant objects
  const groups = allocateGroups(participants, groupCount);
  const allIds = Object.values(groups).flat();
  for (const id of allIds) {
    pass &= assert(typeof id === 'string' && id.startsWith('p'), 'Groups contain IDs like "' + id + '"');
  }
  const resolvedNames = allIds.map(id => participantName(participants, id));
  pass &= assert(resolvedNames.every(n => names.includes(n)), 'All IDs resolve to valid names');

  // generateFixtures
  const fixtures = generateFixtures(groups);
  for (const f of fixtures) {
    pass &= assert(typeof f.p1 === 'string' && typeof f.p2 === 'string', 'Fixture p1/p2 are strings');
  }
  pass &= assert(fixtures.length === 15, '6 players -> 15 fixtures across 2 groups');

  // Fill scores with admin
  for (const f of fixtures) { f.s1 = 13; f.s2 = Math.floor(Math.random() * 9); f.done = f.s1 !== f.s2; }

  // calculateStandings with participants
  const result = calculateStandings(groups, fixtures, participants);
  pass &= assert(result.standings !== undefined, 'Standings computed');
  pass &= assert(result.qualifiers.length === 4, '4 qualifiers from 2 groups');
  for (const q of result.qualifiers) {
    pass &= assert(q.id.startsWith('p'), 'Qualifier id = "' + q.id + '"');
    pass &= assert(names.includes(q.name), 'Qualifier name resolved = "' + q.name + '"');
  }

  // generateKnockout with qualifiers that have .id
  const knockout = generateKnockout(result.qualifiers);
  pass &= assert(knockout.length === 3, '4 qualifiers -> 3 knockout matches');
  for (const m of knockout) {
    if (m.p1) pass &= assert(m.p1.startsWith('p'), 'Knockout p1 is id = "' + m.p1 + '"');
    if (m.p2) pass &= assert(m.p2.startsWith('p'), 'Knockout p2 is id = "' + m.p2 + '"');
  }

  // Simulate full tournament
  let ko = knockout.map(m => ({ ...m }));
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of ko) {
      if (m.p1 && m.p2 && !m.done) {
        m.s1 = 11; m.s2 = Math.floor(Math.random() * 9);
        m.done = true; m.winner = m.s1 > m.s2 ? m.p1 : m.p2;
        changed = true;
      }
    }
    if (changed) ko = advanceKnockout(ko);
  }
  const finalMatch = ko.find(m => m.round === 'Final');
  pass &= assert(finalMatch.p1 !== null && finalMatch.p2 !== null, 'Final has participants');
  pass &= assert(finalMatch.winner !== null, 'Champion determined: ' + finalMatch.winner);
  pass &= assert(finalMatch.winner.startsWith('p'), 'Champion is participant id');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function runAllEdgeCaseTests() {
  console.log('========================================');
  console.log('   EDGE CASE TEST SUITE');
  console.log('========================================');

  let modelPass = testParticipantModel();
  let newFormatPass = testNewFormatFlow();

  const counts = [2, 3, 4, 5, 6, 10, 11, 20];
  let totalPass = 0;
  let totalFail = 0;

  for (const n of counts) {
    let best = true;
    for (let iter = 0; iter < 5; iter++) {
      best = testPlayerCount(n) && best;
    }
    if (best) totalPass++; else totalFail++;
  }

  console.log('\n========================================');
  console.log('   RESULTS: ' + totalPass + '/' + counts.length + ' edge case tests passed');
  console.log('   Model tests: ' + (modelPass ? 'PASS' : 'FAIL'));
  console.log('   New format flow tests: ' + (newFormatPass ? 'PASS' : 'FAIL'));
  console.log('========================================');
}

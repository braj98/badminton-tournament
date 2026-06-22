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
  pass &= assert(fixtures.length === 6, '6 players -> 6 fixtures across 2 groups');

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

function testSportConfig() {
  console.log('\n=== Sport Config ===');
  let pass = true;

  const badm = getSportConfig('badminton', 'singles');
  pass &= assert(badm.minPlayers === 2, 'badminton minPlayers = 2');
  pass &= assert(badm.maxPlayers === 20, 'badminton maxPlayers = 20');
  pass &= assert(badm.groupPointsToWin === 13, 'badminton group scoring = 13');
  pass &= assert(badm.finalSets === 3, 'badminton final sets = 3');
  pass &= assert(badm.isTeamSport === false, 'badminton singles isTeamSport = false');

  const dbls = getSportConfig('badminton', 'doubles');
  pass &= assert(dbls.isTeamSport === true, 'doubles isTeamSport = true');
  pass &= assert(dbls.finalSets === 3, 'doubles inherits finalSets = 3');

  const tt = getSportConfig('tableTennis', 'singles');
  pass &= assert(tt.maxPlayers === 32, 'tableTennis maxPlayers = 32');
  pass &= assert(tt.finalSets === 5, 'tableTennis final sets = 5');

  const chess = getSportConfig('chess', 'singles');
  pass &= assert(chess.maxPlayers === 50, 'chess maxPlayers = 50');
  pass &= assert(chess.finalSets === 1, 'chess final sets = 1');

  // determineGroupCount with config thresholds
  const thresh = badm.groupThresholds;
  const counts = badm.groupCounts;
  pass &= assert(determineGroupCount(4, thresh, counts) === 1, '4 players -> 1 group');
  pass &= assert(determineGroupCount(8, thresh, counts) === 2, '8 players -> 2 groups');
  pass &= assert(determineGroupCount(12, thresh, counts) === 4, '12 players -> 4 groups');
  pass &= assert(determineGroupCount(20, thresh, counts) === 4, '20 players -> 4 groups');

  // getCurrentConfig with simulated state
  var s = { sport: 'badminton', format: 'singles' };
  var savedState = AppState.tournament;
  AppState.tournament = s;
  var cur = getCurrentConfig();
  pass &= assert(cur.minPlayers === 2, 'getCurrentConfig reads state');
  AppState.tournament = savedState;

  // backward compat for determineGroupCount (no config)
  pass &= assert(determineGroupCount(4) === 1, 'determineGroupCount(4) backward compat = 1');
  pass &= assert(determineGroupCount(8) === 2, 'determineGroupCount(8) backward compat = 2');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testCategorySportMigration() {
  console.log('\n=== Category Sport Migration ===');
  let pass = true;

  // Factory defaults should all have sport: 'badminton'
  for (const cat of FACTORY_CATEGORIES) {
    pass &= assert(cat.sport === 'badminton', 'Factory cat "' + cat.label + '" has sport=badminton');
  }

  // Simulate legacy categories without sport field
  const legacyCats = [
    { id: 'legacy_1', label: 'Legacy 1', type: 'singles' },
    { id: 'legacy_2', label: 'Legacy 2', type: 'doubles' },
  ];
  const origGet = window.getCategories;
  const origSave = window.saveCategories;
  window.getCategories = function() { return legacyCats; };
  let savedCats = null;
  window.saveCategories = function(cats) { savedCats = cats; };
  migrateCategorySports();
  pass &= assert(savedCats !== null, 'migrateCategorySports called saveCategories');
  for (const c of savedCats) {
    pass &= assert(c.sport === 'badminton', 'Legacy cat "' + c.label + '" gained sport=badminton');
  }
  // Should not re-migrate
  savedCats = null;
  migrateCategorySports();
  pass &= assert(savedCats === null, 'migrateCategorySports idempotent (no save on second call)');

  window.getCategories = origGet;
  window.saveCategories = origSave;

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testCategorySportFiltering() {
  console.log('\n=== Category Sport Filtering ===');
  let pass = true;

  const cats = [
    { id: 'cat_a', label: 'Cat A', type: 'singles', sport: 'badminton' },
    { id: 'cat_b', label: 'Cat B', type: 'singles', sport: 'badminton' },
    { id: 'cat_c', label: 'Cat C', type: 'singles', sport: 'tableTennis' },
    { id: 'cat_d', label: 'Cat D', type: 'singles', sport: 'chess' },
  ];
  const badmintonCats = cats.filter(c => c.sport === 'badminton');
  pass &= assert(badmintonCats.length === 2, 'Filter badminton -> 2 categories');
  pass &= assert(badmintonCats[0].id === 'cat_a' && badmintonCats[1].id === 'cat_b', 'Filtered to correct badminton cats');

  const ttCats = cats.filter(c => c.sport === 'tableTennis');
  pass &= assert(ttCats.length === 1 && ttCats[0].id === 'cat_c', 'Filter tableTennis -> 1 category');

  const chessCats = cats.filter(c => c.sport === 'chess');
  pass &= assert(chessCats.length === 1 && chessCats[0].id === 'cat_d', 'Filter chess -> 1 category');

  const noSportCats = cats.filter(c => c.sport === 'tableTennis');
  pass &= assert(noSportCats.every(c => c.sport === 'tableTennis'), 'No cross-sport contamination');

  // Adding a new category should preserve sport
  const addCat = { id: 'new_tt', label: 'New TT', type: 'singles', sport: 'tableTennis' };
  const allPlus = [...cats, addCat];
  const filtered = allPlus.filter(c => c.sport === 'tableTennis');
  pass &= assert(filtered.length === 2, 'Added tableTennis category appears in correct filter');

  // Deleting all of one sport should leave others untouched
  const afterDelete = allPlus.filter(c => c.sport !== 'tableTennis');
  pass &= assert(afterDelete.length === 3, 'Delete tableTennis categories leaves 3 remaining');
  pass &= assert(afterDelete.every(c => c.sport !== 'tableTennis'), 'No tableTennis categories remain');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testSportConfigFromCategory() {
  console.log('\n=== Sport Config From Category ===');
  let pass = true;

  // Simulate _setupConfig logic: read sport from category, resolve config
  const testCases = [
    { cat: { sport: 'badminton', type: 'singles' }, expectMin: 2, expectMax: 20, expectFinalSets: 3 },
    { cat: { sport: 'badminton', type: 'doubles' }, expectMin: 2, expectMax: 20, expectFinalSets: 3, expectTeam: true },
    { cat: { sport: 'tableTennis', type: 'singles' }, expectMin: 2, expectMax: 32, expectFinalSets: 5 },
    { cat: { sport: 'chess', type: 'singles' }, expectMin: 2, expectMax: 50, expectFinalSets: 1 },
  ];

  for (const tc of testCases) {
    const cfg = getSportConfig(tc.cat.sport, tc.cat.type === 'doubles' ? 'doubles' : 'singles');
    pass &= assert(cfg.minPlayers === tc.expectMin, tc.cat.sport + ' minPlayers = ' + cfg.minPlayers + ' (expected ' + tc.expectMin + ')');
    pass &= assert(cfg.maxPlayers === tc.expectMax, tc.cat.sport + ' maxPlayers = ' + cfg.maxPlayers + ' (expected ' + tc.expectMax + ')');
    pass &= assert(cfg.finalSets === tc.expectFinalSets, tc.cat.sport + ' finalSets = ' + cfg.finalSets + ' (expected ' + tc.expectFinalSets + ')');
    if (tc.expectTeam) {
      pass &= assert(cfg.isTeamSport === true, tc.cat.sport + ' doubles isTeamSport = true');
    }
  }

  // Legacy category without sport should default to badminton
  const legacyCat = { id: 'old', label: 'Old', type: 'singles' };
  const sport = legacyCat.sport || 'badminton';
  const cfg = getSportConfig(sport, 'singles');
  pass &= assert(cfg.minPlayers === 2, 'Legacy category (no sport) defaults to badminton config');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testCategoryEventLinking() {
  console.log('\n=== Category Event Linking ===');
  let pass = true;

  // Factory defaults should have event field
  for (const cat of FACTORY_CATEGORIES) {
    pass &= assert(cat.event === DEFAULT_EVENT, 'Factory cat "' + cat.label + '" has event="' + DEFAULT_EVENT + '"');
  }

  // Simulate legacy categories without event
  const legacyCats = [
    { id: 'old1', label: 'Old 1', type: 'singles', sport: 'badminton' },
  ];
  const origGet = window.getCategories;
  const origSave = window.saveCategories;
  window.getCategories = function() { return legacyCats; };
  let savedCats = null;
  window.saveCategories = function(cats) { savedCats = cats; };
  migrateCategorySports();
  pass &= assert(savedCats[0].event === DEFAULT_EVENT, 'Legacy cat gained event="' + DEFAULT_EVENT + '"');
  // Idempotent
  savedCats = null;
  migrateCategorySports();
  pass &= assert(savedCats === null, 'migrateCategorySports idempotent for event');
  window.getCategories = origGet;
  window.saveCategories = origSave;

  // Event filtering
  const cats = [
    { id: 'a', label: 'A', type: 'singles', sport: 'badminton', event: 'Event 1' },
    { id: 'b', label: 'B', type: 'singles', sport: 'badminton', event: 'Event 1' },
    { id: 'c', label: 'C', type: 'singles', sport: 'tableTennis', event: 'Event 2' },
  ];
  const e1 = cats.filter(c => c.event === 'Event 1');
  pass &= assert(e1.length === 2, 'Filter Event 1 -> 2 categories');
  const e2 = cats.filter(c => c.event === 'Event 2');
  pass &= assert(e2.length === 1 && e2[0].id === 'c', 'Filter Event 2 -> 1 category');

  // Unique events derived from categories
  const events = [...new Set(cats.map(c => c.event))];
  pass &= assert(events.length === 2 && events.includes('Event 1') && events.includes('Event 2'), 'Derived events = [Event 1, Event 2]');

  // Sport filtering within an event
  const event1Sports = [...new Set(cats.filter(c => c.event === 'Event 1').map(c => c.sport))];
  pass &= assert(event1Sports.length === 1 && event1Sports[0] === 'badminton', 'Event 1 has only badminton sport');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testTournamentEngineAPI() {
  console.log('\n=== Tournament Engine API ===');
  let pass = true;

  const participants = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(n => createParticipant(n));

  // createGroups
  const groupCount = determineGroupCount(participants.length);
  pass &= assert(groupCount === 2, 'determineGroupCount returns 2 for 6 players');
  const groups = createGroups(participants, groupCount);
  pass &= assert(Object.keys(groups).length === 2, 'createGroups returns 2 groups');
  const allIds = Object.values(groups).flat();
  pass &= assert(allIds.length === 6, 'createGroups allocates all 6 players');
  pass &= assert(allIds.every(id => id.startsWith('p')), 'createGroups stores participant IDs');

  // createFixtures
  const fixtures = createFixtures(groups);
  pass &= assert(fixtures.length === 6, 'createFixtures generates 6 matches');
  for (const f of fixtures) {
    pass &= assert(typeof f.p1 === 'string' && typeof f.p2 === 'string', 'Fixture p1/p2 are strings');
    pass &= assert(f.round === 'group', 'Fixture round = group');
    pass &= assert(f.group !== null, 'Fixture has group assigned');
  }

  // Fill scores
  for (const f of fixtures) { f.s1 = 13; f.s2 = Math.floor(Math.random() * 9); f.done = f.s1 !== f.s2; }

  // computeStandings
  const result = computeStandings(groups, fixtures, participants);
  pass &= assert(result.standings !== undefined, 'computeStandings returns standings');
  pass &= assert(result.qualifiers.length === 4, 'computeStandings returns 4 qualifiers');
  for (const q of result.qualifiers) {
    pass &= assert(q.id.startsWith('p'), 'Qualifier has participant id');
  }

  // createKnockoutBracket
  const knockout = createKnockoutBracket(result.qualifiers);
  pass &= assert(knockout.length === 3, 'createKnockoutBracket returns 3 matches');
  for (const m of knockout) {
    pass &= assert(m.round === 'SF' || m.round === 'Final', 'Knockout match round valid');
  }

  // advanceWinner — simulate full tournament
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
    if (changed) ko = advanceWinner(ko);
  }
  const finalMatch = ko.find(m => m.round === 'Final');
  pass &= assert(finalMatch.p1 !== null && finalMatch.p2 !== null, 'advanceWinner populates Final');
  pass &= assert(finalMatch.winner !== null, 'advanceWinner determines champion');

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function runAllEdgeCaseTests() {
  console.log('========================================');
  console.log('   EDGE CASE TEST SUITE');
  console.log('========================================');

  let apiPass = testTournamentEngineAPI();
  let modelPass = testParticipantModel();
  let newFormatPass = testNewFormatFlow();
  let configPass = testSportConfig();
  let sportMigratePass = testCategorySportMigration();
  let sportFilterPass = testCategorySportFiltering();
  let sportFromCatPass = testSportConfigFromCategory();
  let eventLinkingPass = testCategoryEventLinking();

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
  console.log('   Tournament Engine API tests: ' + (apiPass ? 'PASS' : 'FAIL'));
  console.log('   Sport Config tests: ' + (configPass ? 'PASS' : 'FAIL'));
  console.log('   Category Sport Migration tests: ' + (sportMigratePass ? 'PASS' : 'FAIL'));
  console.log('   Category Sport Filtering tests: ' + (sportFilterPass ? 'PASS' : 'FAIL'));
  console.log('   Sport Config From Category tests: ' + (sportFromCatPass ? 'PASS' : 'FAIL'));
  console.log('   Category Event Linking tests: ' + (eventLinkingPass ? 'PASS' : 'FAIL'));
  console.log('========================================');
}

// ===================== NAVIGATION / UI TESTS =====================

function testNavigationFlow() {
  console.log('\n=== Navigation Flow (globals) ===');
  let pass = true;

  const _origView = AppState.view;
  const _origEvent = AppState.event;
  const _origSport = AppState.sport;
  const _origCat = AppState.category;

  // 1. goHome
  goHome();
  pass &= assert(AppState.view === 'home', 'goHome() → AppState.view=home');

  // 2. goToEventPage
  goToEventPage('Test Event');
  pass &= assert(AppState.view === 'event', 'goToEventPage() → AppState.view=event');
  pass &= assert(AppState.event === 'Test Event', 'goToEventPage() → AppState.event="Test Event"');

  // 3. goToSportPage
  goToSportPage('Test Event', 'badminton');
  pass &= assert(AppState.view === 'sport', 'goToSportPage() → AppState.view=sport');
  pass &= assert(AppState.event === 'Test Event', 'goToSportPage() keeps event');
  pass &= assert(AppState.sport === 'badminton', 'goToSportPage() → AppState.sport=badminton');

  // 4. navigateToSport
  navigateToSport('Event B', 'chess');
  pass &= assert(AppState.view === 'sport', 'navigateToSport() → AppState.view=sport');
  pass &= assert(AppState.event === 'Event B', 'navigateToSport() → AppState.event="Event B"');
  pass &= assert(AppState.sport === 'chess', 'navigateToSport() → AppState.sport=chess');

  // 5. switchTab dispatches correctly
  switchTab('groups');
  pass &= assert(AppState.view === 'groups', 'switchTab("groups") → AppState.view=groups');
  switchTab('fixtures');
  pass &= assert(AppState.view === 'fixtures', 'switchTab("fixtures") → AppState.view=fixtures');
  switchTab('knockout');
  pass &= assert(AppState.view === 'knockout', 'switchTab("knockout") → AppState.view=knockout');

  // 6. goBackFromChampion (if we were on champion)
  var _svView = AppState.view;
  AppState.view = 'champion';
  goBackFromChampion();
  pass &= assert(AppState.view === 'knockout', 'goBackFromChampion() → AppState.view=knockout');
  AppState.view = _svView;

  // 7. closeResults
  AppState.showingResults = true;
  closeResults();
  pass &= assert(!AppState.showingResults, 'closeResults() → AppState.showingResults=false');

  // 8. goToFixturesFromKnockout
  AppState.view = 'knockout';
  goToFixturesFromKnockout();
  pass &= assert(AppState.view === 'fixtures', 'goToFixturesFromKnockout() → AppState.view=fixtures');

  // 9. goToGroups
  goToGroups();
  pass &= assert(AppState.view === 'groups', 'goToGroups() → AppState.view=groups');

  // Restore
  AppState.view = _origView;
  AppState.event = _origEvent;
  AppState.sport = _origSport;
  AppState.category = _origCat;

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testBreadcrumb() {
  console.log('\n=== Breadcrumb Rendering ===');
  let pass = true;

  var bc = document.getElementById('breadcrumb');
  pass &= assert(!!bc, 'breadcrumb element exists in DOM');
  if (!bc) return false;

  const _origView = AppState.view;
  const _origEvent = AppState.event;
  const _origSport = AppState.sport;

  // Home — breadcrumb hidden
  goHome();
  pass &= assert(bc.classList.contains('hidden'), 'Home: breadcrumb hidden');

  // Event page — shows "Home › Event"
  goToEventPage('Test Event');
  pass &= assert(!bc.classList.contains('hidden'), 'Event page: breadcrumb visible');
  if (!bc.classList.contains('hidden')) {
    var html = bc.innerHTML;
    pass &= assert(html.indexOf('Home') >= 0, 'Event breadcrumb contains Home');
    pass &= assert(html.indexOf('Test Event') >= 0, 'Event breadcrumb contains event name');
    pass &= assert(html.indexOf('bc-item bc-current') >= 0, 'Event breadcrumb has bc-current');
    var seps = (html.match(/›/g) || []).length;
    pass &= assert(seps === 1, 'Event breadcrumb has 1 separator (got ' + seps + ')');
  }

  // Sport page — shows "Home › Event › Sport"
  goToSportPage('Test Event', 'badminton');
  pass &= assert(!bc.classList.contains('hidden'), 'Sport page: breadcrumb visible');
  if (!bc.classList.contains('hidden')) {
    var html = bc.innerHTML;
    pass &= assert(html.indexOf('Home') >= 0, 'Sport breadcrumb contains Home');
    pass &= assert(html.indexOf('Test Event') >= 0, 'Sport breadcrumb contains event');
    pass &= assert(html.indexOf('Badminton') >= 0, 'Sport breadcrumb contains sport label');
    pass &= assert(html.indexOf('bc-current') >= 0, 'Sport breadcrumb has bc-current');
    var seps = (html.match(/›/g) || []).length;
    pass &= assert(seps === 2, 'Sport breadcrumb has 2 separators (got ' + seps + ')');
  }

  // Tournament view — shows "Home › Event › Sport › Category"
  var cats = getCategories().filter(function(c) { return c.sport === 'badminton'; });
  if (cats.length > 0) {
    AppState.category = cats[0].id;
    AppState.view = 'setup';
    renderAll();
    pass &= assert(!bc.classList.contains('hidden'), 'Tournament view: breadcrumb visible');
    if (!bc.classList.contains('hidden')) {
      var html = bc.innerHTML;
      pass &= assert(html.indexOf('Home') >= 0, 'Tournament breadcrumb contains Home');
      pass &= assert(html.indexOf(cats[0].label) >= 0, 'Tournament breadcrumb contains category label');
      var seps = (html.match(/›/g) || []).length;
      pass &= assert(seps === 3, 'Tournament breadcrumb has 3 separators (got ' + seps + ')');
    }
  } else {
    console.log('  SKIP: no categories available for tournament breadcrumb test');
  }

  // Restore
  AppState.view = _origView;
  AppState.event = _origEvent;
  AppState.sport = _origSport;
  renderAll();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testTabVisibility() {
  console.log('\n=== Tournament Tab Visibility ===');
  let pass = true;

  var _tb = document.getElementById('tournamentTabs');
  var _btns = _tb ? _tb.querySelectorAll('.tab-btn') : [];
  pass &= assert(!!_tb, 'tournamentTabs element exists');
  pass &= assert(_btns.length >= 4, 'at least 4 tab buttons found (got ' + _btns.length + ')');
  if (!_tb || _btns.length < 4) return false;

  const _origView = AppState.view;
  const _origCat = AppState.category;

  // Scenario: setup phase — tabs hidden
  var cats = getCategories();
  if (cats.length > 0) {
    AppState.category = cats[0].id;
    AppState.tournament = defaultState();
    AppState.tournament.phase = 'setup';
    AppState.view = 'setup';
    renderAll();
    pass &= assert(_tb.classList.contains('hidden'), 'Setup phase: tabs container hidden');
  }

  // Scenario: groups phase — Groups/Fixtures visible, Knockout/Champion hidden
  if (cats.length > 0) {
    AppState.tournament.phase = 'groups';
    AppState.view = 'groups';
    renderAll();
    pass &= assert(!_tb.classList.contains('hidden'), 'Groups phase: tabs container visible');
    for (var i = 0; i < _btns.length; i++) {
      var tab = _btns[i].dataset.tab;
      var _hidden = _btns[i].classList.contains('hidden');
      if (tab === 'groups' || tab === 'fixtures') {
        pass &= assert(!_hidden, 'Groups phase: tab "' + tab + '" is visible');
      } else {
        pass &= assert(_hidden, 'Groups phase: tab "' + tab + '" is hidden');
      }
    }
  }

  // Scenario: knockout phase — all tabs visible
  if (cats.length > 0) {
    AppState.tournament.phase = 'knockout';
    AppState.view = 'knockout';
    renderAll();
    pass &= assert(!_tb.classList.contains('hidden'), 'Knockout phase: tabs container visible');
    for (var i = 0; i < _btns.length; i++) {
      pass &= assert(!_btns[i].classList.contains('hidden'), 'Knockout phase: tab "' + _btns[i].dataset.tab + '" is visible');
    }
  }

  // Scenario: champion phase — all tabs visible
  if (cats.length > 0) {
    AppState.tournament.phase = 'champion';
    AppState.view = 'champion';
    renderAll();
    pass &= assert(!_tb.classList.contains('hidden'), 'Champion phase: tabs container visible');
    for (var i = 0; i < _btns.length; i++) {
      pass &= assert(!_btns[i].classList.contains('hidden'), 'Champion phase: tab "' + _btns[i].dataset.tab + '" is visible');
    }
  }

  // Restore
  AppState.view = _origView;
  AppState.category = _origCat;
  renderAll();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testScreenVisibility() {
  console.log('\n=== Screen Visibility ===');
  let pass = true;

  const screens = ['screen-home', 'screen-event', 'screen-sport', 'screen-setup', 'screen-groups', 'screen-fixtures', 'screen-knockout', 'screen-champion', 'screen-results'];
  var screenEls = {};
  var allExist = true;
  for (var i = 0; i < screens.length; i++) {
    var el = document.getElementById(screens[i]);
    screenEls[screens[i]] = el;
    if (!el) { allExist = false; console.log('  MISSING: ' + screens[i]); }
  }
  pass &= assert(allExist, 'All 9 screen elements exist in DOM');
  if (!allExist) return false;

  const _origView = AppState.view;

  function countActive() {
    var n = 0;
    for (var i = 0; i < screens.length; i++) {
      if (screenEls[screens[i]].classList.contains('active')) n++;
    }
    return n;
  }

  function getActive() {
    for (var i = 0; i < screens.length; i++) {
      if (screenEls[screens[i]].classList.contains('active')) return screens[i];
    }
    return null;
  }

  // Test each view shows exactly one screen
  // Home
  goHome();
  pass &= assert(countActive() === 1, 'Home: exactly 1 active screen (got ' + countActive() + ')');
  pass &= assert(getActive() === 'screen-home', 'Home: screen-home is active');

  // Event
  goToEventPage('Test Event');
  pass &= assert(countActive() === 1, 'Event: exactly 1 active screen (got ' + countActive() + ')');
  pass &= assert(getActive() === 'screen-event', 'Event: screen-event is active');

  // Sport
  goToSportPage('Test Event', 'badminton');
  pass &= assert(countActive() === 1, 'Sport: exactly 1 active screen (got ' + countActive() + ')');
  pass &= assert(getActive() === 'screen-sport', 'Sport: screen-sport is active');

  // Tournament views
  var cats = getCategories();
  if (cats.length > 0) {
    AppState.category = cats[0].id;
    AppState.tournament = defaultState();

    // Setup
    AppState.tournament.phase = 'setup';
    AppState.view = 'setup';
    renderAll();
    pass &= assert(getActive() === 'screen-setup', 'Setup: screen-setup is active');

    // Groups
    AppState.tournament.phase = 'groups';
    AppState.view = 'groups';
    renderAll();
    pass &= assert(getActive() === 'screen-groups', 'Groups: screen-groups is active');

    // Fixtures
    AppState.tournament.phase = 'fixtures';
    AppState.view = 'fixtures';
    renderAll();
    pass &= assert(getActive() === 'screen-fixtures', 'Fixtures: screen-fixtures is active');

    // Knockout
    AppState.tournament.phase = 'knockout';
    AppState.view = 'knockout';
    renderAll();
    pass &= assert(getActive() === 'screen-knockout', 'Knockout: screen-knockout is active');

    // Champion
    AppState.tournament.phase = 'champion';
    AppState.view = 'champion';
    renderAll();
    pass &= assert(getActive() === 'screen-champion', 'Champion: screen-champion is active');
  } else {
    console.log('  SKIP: tournament view tests (no categories)');
  }

  // Restore
  AppState.view = _origView;
  renderAll();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testTabActiveState() {
  console.log('\n=== Tab Active State ===');
  let pass = true;

  var _tb = document.getElementById('tournamentTabs');
  if (!_tb) return false;
  var _btns = _tb.querySelectorAll('.tab-btn');
  if (_btns.length < 4) return false;

  const _origView = AppState.view;
  const _origCat = AppState.category;

  var cats = getCategories();
  if (cats.length > 0) {
    AppState.category = cats[0].id;
    AppState.tournament = defaultState();
    AppState.tournament.phase = 'groups';

    AppState.view = 'groups';
    renderAll();
    for (var i = 0; i < _btns.length; i++) {
      var expected = _btns[i].dataset.tab === 'groups';
      var actual = _btns[i].classList.contains('active');
      pass &= assert(actual === expected, 'Groups view: tab "' + _btns[i].dataset.tab + '" active=' + actual + ' (expected ' + expected + ')');
    }

    AppState.view = 'fixtures';
    renderAll();
    for (var i = 0; i < _btns.length; i++) {
      var expected = _btns[i].dataset.tab === 'fixtures';
      var actual = _btns[i].classList.contains('active');
      pass &= assert(actual === expected, 'Fixtures view: tab "' + _btns[i].dataset.tab + '" active=' + actual + ' (expected ' + expected + ')');
    }

    AppState.tournament.phase = 'knockout';
    AppState.view = 'knockout';
    renderAll();
    for (var i = 0; i < _btns.length; i++) {
      var expected = _btns[i].dataset.tab === 'knockout';
      var actual = _btns[i].classList.contains('active');
      pass &= assert(actual === expected, 'Knockout view: tab "' + _btns[i].dataset.tab + '" active=' + actual + ' (expected ' + expected + ')');
    }

    AppState.view = 'champion';
    renderAll();
    for (var i = 0; i < _btns.length; i++) {
      var expected = _btns[i].dataset.tab === 'champion';
      var actual = _btns[i].classList.contains('active');
      pass &= assert(actual === expected, 'Champion view: tab "' + _btns[i].dataset.tab + '" active=' + actual + ' (expected ' + expected + ')');
    }
  } else {
    console.log('  SKIP: no categories');
  }

  AppState.view = _origView;
  AppState.category = _origCat;
  renderAll();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testCategoryBarFiltering() {
  console.log('\n=== Category Bar Filtering ===');
  let pass = true;

  var bar = document.getElementById('catBar');
  pass &= assert(!!bar, 'catBar element exists');
  if (!bar) return false;

  const _origEvent = AppState.event;
  const _origSport = AppState.sport;
  const _origCat = AppState.category;

  // Category bar should only show categories matching AppState.event + AppState.sport
  // Navigate to a specific event+sport and check
  var cats = getCategories();
  var events = [...new Set(cats.map(function(c) { return c.event || DEFAULT_EVENT; }))];
  var testEvent = events[0] || DEFAULT_EVENT;
  var testSport = 'badminton';
  var expectedCount = cats.filter(function(c) { return (c.event || DEFAULT_EVENT) === testEvent && c.sport === testSport; }).length;

  AppState.event = testEvent;
  AppState.sport = testSport;
  renderCategoryBar();
  var renderedBtns = bar.querySelectorAll('.cat-btn');
  pass &= assert(renderedBtns.length === expectedCount,
    'catBar shows ' + renderedBtns.length + ' categories for ' + testEvent + '/' + testSport + ' (expected ' + expectedCount + ')');

  // Check each button has a dot indicator
  for (var i = 0; i < renderedBtns.length; i++) {
    var dot = renderedBtns[i].querySelector('.dot');
    pass &= assert(!!dot, 'Category button ' + i + ' has .dot indicator');
  }

  // Switch sport, verify count changes
  var ttCats = cats.filter(function(c) { return (c.event || DEFAULT_EVENT) === testEvent && c.sport === 'tableTennis'; });
  if (ttCats.length > 0) {
    AppState.sport = 'tableTennis';
    renderCategoryBar();
    var ttBtns = bar.querySelectorAll('.cat-btn');
    pass &= assert(ttBtns.length === ttCats.length,
      'Switching sport: catBar shows ' + ttBtns.length + ' (expected ' + ttCats.length + ')');
  } else {
    AppState.sport = 'tableTennis';
    renderCategoryBar();
    var ttBtns = bar.querySelectorAll('.cat-btn');
    pass &= assert(ttBtns.length === 0, 'tableTennis with no cats: catBar empty');
  }

  // Restore
  AppState.event = _origEvent;
  AppState.sport = _origSport;
  AppState.category = _origCat;
  renderAll();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testSportBarRendering() {
  console.log('\n=== Sport Bar Rendering ===');
  let pass = true;

  var bar = document.getElementById('sportBar');
  pass &= assert(!!bar, 'sportBar element exists');
  if (!bar) return false;

  const _origEvent = AppState.event;
  const _origSport = AppState.sport;

  // Sport bar should only show sports that have categories in the current event
  var cats = getCategories();
  var events = [...new Set(cats.map(function(c) { return c.event || DEFAULT_EVENT; }))];

  if (events.length > 0) {
    var testEvent = events[0];
    var eventSports = new Set(cats.filter(function(c) { return (c.event || DEFAULT_EVENT) === testEvent; }).map(function(c) { return c.sport; }));
    AppState.event = testEvent;
    renderSportBar();
    var btns = bar.querySelectorAll('.sport-btn');
    pass &= assert(btns.length === eventSports.size,
      'Sport bar shows ' + btns.length + ' sports for ' + testEvent + ' (expected ' + eventSports.size + ')');
    for (var i = 0; i < btns.length; i++) {
      var s = btns[i].textContent;
      if (s === 'Badminton') pass &= assert(eventSports.has('badminton'), 'Badminton in sport bar');
      else if (s === 'Table Tennis') pass &= assert(eventSports.has('tableTennis'), 'Table Tennis in sport bar');
      else if (s === 'Chess') pass &= assert(eventSports.has('chess'), 'Chess in sport bar');
    }
  }

  // Current sport button should have .active class
  AppState.event = _origEvent || DEFAULT_EVENT;
  AppState.sport = 'badminton';
  renderSportBar();
  var activeBtns = bar.querySelectorAll('.sport-btn.active');
  pass &= assert(activeBtns.length === 1, 'Exactly 1 active sport button');
  if (activeBtns.length === 1) {
    pass &= assert(activeBtns[0].textContent === 'Badminton', 'Active sport button is Badminton');
  }

  AppState.event = _origEvent;
  AppState.sport = _origSport;
  renderSportBar();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testEventBarRendering() {
  console.log('\n=== Event Bar Rendering ===');
  let pass = true;

  var bar = document.getElementById('eventBar');
  pass &= assert(!!bar, 'eventBar element exists');
  if (!bar) return false;

  const _origEvent = AppState.event;

  var cats = getCategories();
  var events = [...new Set(cats.map(function(c) { return c.event || DEFAULT_EVENT; }))];

  renderEventBar();
  var btns = bar.querySelectorAll('.event-btn');
  pass &= assert(btns.length === events.length,
    'Event bar shows ' + btns.length + ' events (expected ' + events.length + ')');

  // Current event should have .active
  AppState.event = events[0] || DEFAULT_EVENT;
  renderEventBar();
  var activeBtns = bar.querySelectorAll('.event-btn.active');
  pass &= assert(activeBtns.length === 1, 'Exactly 1 active event button');
  if (activeBtns.length === 1) {
    pass &= assert(activeBtns[0].textContent === AppState.event, 'Active event button matches AppState.event');
  }

  AppState.event = _origEvent;
  renderEventBar();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testHeaderContent() {
  console.log('\n=== Header Content ===');
  let pass = true;

  var badge = document.getElementById('eventBadge');
  var tag = document.getElementById('sportTag');
  pass &= assert(!!badge, 'eventBadge exists');
  pass &= assert(!!tag, 'sportTag exists');

  if (badge && tag) {
    const _origEvent = AppState.event;
    const _origSport = AppState.sport;

    AppState.event = 'Test Event XYZ';
    AppState.sport = 'chess';
    updateHeader();
    pass &= assert(badge.textContent === 'Test Event XYZ', 'Header badge = "Test Event XYZ" (got "' + badge.textContent + '")');
    pass &= assert(tag.textContent === 'Chess', 'Header tag = "Chess" (got "' + tag.textContent + '")');

    AppState.event = _origEvent;
    AppState.sport = _origSport;
    updateHeader();
  }

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function testActionBarKnockoutButtons() {
  console.log('\n=== Action Bar (Knockout Results Buttons) ===');
  let pass = true;

  var bar = document.getElementById('actionBar');
  pass &= assert(!!bar, 'actionBar element exists');
  if (!bar) return false;

  const _origView = AppState.view;

  // Action bar hidden on event/sport/home
  AppState.view = 'home';
  renderActionBar();
  pass &= assert(bar.style.display === 'none' || bar.classList.contains('hidden'), 'ActionBar hidden on home');

  AppState.view = 'event';
  renderActionBar();
  pass &= assert(bar.style.display === 'none' || bar.classList.contains('hidden'), 'ActionBar hidden on event');

  AppState.view = 'sport';
  renderActionBar();
  pass &= assert(bar.style.display === 'none' || bar.classList.contains('hidden'), 'ActionBar hidden on sport');

  // ActionBar visible on tournament views
  AppState.view = 'setup';
  renderActionBar();
  pass &= assert(bar.style.display !== 'none', 'ActionBar visible on setup');

  AppState.view = 'groups';
  renderActionBar();
  pass &= assert(bar.style.display !== 'none', 'ActionBar visible on groups');

  // Knockout: should have Results buttons in right area
  AppState.view = 'knockout';
  renderActionBar();
  var right = document.getElementById('actionBarRight');
  if (right) {
    var btns = right.querySelectorAll('button');
    pass &= assert(btns.length >= 2, 'Knockout actionBar has 2+ buttons (got ' + btns.length + ')');
  }

  AppState.view = _origView;
  renderActionBar();

  console.log(pass ? '  >>> ALL PASS <<<' : '  >>> SOME FAILURES <<<');
  return pass;
}

function runAllNavigationTests() {
  console.log('\n========================================');
  console.log('   NAVIGATION / UI TEST SUITE');
  console.log('========================================');

  var flowPass = testNavigationFlow();
  var breadcrumbPass = testBreadcrumb();
  var tabVisPass = testTabVisibility();
  var screenVisPass = testScreenVisibility();
  var tabActivePass = testTabActiveState();
  var catBarPass = testCategoryBarFiltering();
  var sportBarPass = testSportBarRendering();
  var eventBarPass = testEventBarRendering();
  var headerPass = testHeaderContent();
  var actionBarPass = testActionBarKnockoutButtons();

  console.log('\n========================================');
  console.log('   NAVIGATION/UI RESULTS');
  console.log('   Navigation flow:     ' + (flowPass ? 'PASS' : 'FAIL'));
  console.log('   Breadcrumb:          ' + (breadcrumbPass ? 'PASS' : 'FAIL'));
  console.log('   Tab visibility:      ' + (tabVisPass ? 'PASS' : 'FAIL'));
  console.log('   Screen visibility:   ' + (screenVisPass ? 'PASS' : 'FAIL'));
  console.log('   Tab active state:    ' + (tabActivePass ? 'PASS' : 'FAIL'));
  console.log('   Category bar:        ' + (catBarPass ? 'PASS' : 'FAIL'));
  console.log('   Sport bar:           ' + (sportBarPass ? 'PASS' : 'FAIL'));
  console.log('   Event bar:           ' + (eventBarPass ? 'PASS' : 'FAIL'));
  console.log('   Header content:      ' + (headerPass ? 'PASS' : 'FAIL'));
  console.log('   Action bar:          ' + (actionBarPass ? 'PASS' : 'FAIL'));
  console.log('========================================');
}

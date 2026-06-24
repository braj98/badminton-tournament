#!/usr/bin/env node
/* Node.js Test Runner for Engine
   Run: node js/test/runner.js
*/

const fs = require('fs');
const vm = require('vm');

// localStorage mock
const _store = {};
const _storage = {
  getItem: k => _store[k] !== undefined ? _store[k] : null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: k => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]); }
};

// Load model scripts (order matters)
const models = [
  'js/models/participant.js',
  'js/models/match.js',
  'js/models/tournament.js',
  'js/models/sportConfig.js',
  'js/models/appState.js',
  'js/models/template.js',
  'js/models/event.js',
  'js/storage/local.js'
];

// Load engine scripts
const scripts = [
  'js/engine/state.js',
  'js/engine/groups.js',
  'js/engine/fixtures.js',
  'js/engine/standings.js',
  'js/engine/knockout.js',
  'js/engine/tournamentEngine.js'
];

// Create a mock context
const context = {
  console: {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args)
  },
  Math, Array, Object, Set, Map, JSON, Date,
  setTimeout, clearTimeout,
  require: require, module: module, process: process,
  localStorage: _storage,
  isAdmin: () => true,
  _supabase: null,
  AppState: { user: { role: 'admin' }, event: null, eventId: null, sport: null, category: null, view: null, tournament: null, ui: { showingResults: false, managePanelOpen: false } },
  APP_CONFIG: { defaultEvent: "BREN AVALON SPORTS MEET 2026" },
  DEFAULT_EVENT_ID: "bren_avalon_sports_meet_2026",
  FACTORY_CATEGORIES: [
    { id: 'junior', label: 'Junior', type: 'singles', sport: 'badminton', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'junior_doubles', label: 'Jr Dbls', type: 'doubles', sport: 'badminton', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'senior_boys', label: 'Sr Boys', type: 'singles', sport: 'badminton', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'senior_girls', label: 'Sr Girls', type: 'singles', sport: 'badminton', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'senior_doubles', label: 'Sr Dbls', type: 'doubles', sport: 'badminton', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'tt_singles', label: 'TT Singles', type: 'singles', sport: 'tableTennis', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" },
    { id: 'tt_doubles', label: 'TT Dbls', type: 'doubles', sport: 'tableTennis', event: "BREN AVALON SPORTS MEET 2026", eventId: "bren_avalon_sports_meet_2026" }
  ],
  SPORT_CONFIG: {
    badminton: {
      minPlayers: 2, maxPlayers: 20, groupPointsToWin: 13, knockoutPointsToWin: 11,
      finalSets: 3, finalPointsToWin: 11, maxScoreInput: 30, maxFinalSetInput: 15,
      groupThresholds: [5, 10, 20], groupCounts: [1, 2, 4]
    },
    tableTennis: {
      minPlayers: 2, maxPlayers: 32, groupPointsToWin: 11, knockoutPointsToWin: 11,
      finalSets: 5, finalPointsToWin: 11, maxScoreInput: 20, maxFinalSetInput: 15,
      groupThresholds: [5, 10, 32], groupCounts: [1, 2, 4]
    },
    chess: {
      minPlayers: 2, maxPlayers: 50, groupPointsToWin: 1, knockoutPointsToWin: 1,
      finalSets: 1, finalPointsToWin: 1, maxScoreInput: 1, maxFinalSetInput: 1,
      groupThresholds: [5, 10, 50], groupCounts: [1, 2, 4]
    }
  }
};

// Make global functions available
context.global = context;

// Load and execute each script
const allScripts = [...models, ...scripts];
for (const script of allScripts) {
  if (fs.existsSync(script)) {
    const code = fs.readFileSync(script, 'utf8');
    try {
      vm.createContext(context);
      vm.runInContext(code, context, { filename: script });
      console.log(`✓ Loaded ${script}`);
    } catch (e) {
      console.error(`✗ Failed to load ${script}: ${e.message}`);
    }
  } else {
    console.error(`✗ Script not found: ${script}`);
  }
}

// Now run the tests from edge_cases.js
let pass = 0;
let fail = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error('  FAIL: ' + msg);
    fail++;
    return false;
  }
  console.log('  PASS: ' + msg);
  pass++;
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
  for (const f of fixtures) {
    if (f.s1 === f.s2) {
      f.s1 = 13;
      f.s2 = 10;
    }
  }
}

function testPlayerCount(n) {
  console.log('\n=== Testing ' + n + ' players ===');

  // 1. determineGroupCount
  const groupCount = context.determineGroupCount(n);
  let expectedGroups = n < 6 ? 1 : (n <= 10 ? 2 : 4);
  assert(groupCount === expectedGroups, 'determineGroupCount(' + n + ') = ' + groupCount + ' (expected ' + expectedGroups + ')');

  // 2. allocateGroups
  const players = makePlayers(n);
  const groups = context.allocateGroups(players, groupCount);
  const groupKeys = Object.keys(groups);
  assert(groupKeys.length === groupCount, 'Created ' + groupKeys.length + ' groups (expected ' + groupCount + ')');

  const sizes = groupKeys.map(k => groups[k].length);
  const totalAllocated = sizes.reduce((a, b) => a + b, 0);
  assert(totalAllocated === n, 'All ' + n + ' players allocated (got ' + totalAllocated + ')');

  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  assert(maxSize - minSize <= 1, 'Groups balanced: sizes=' + JSON.stringify(sizes) + ' (max-min=' + (maxSize - minSize) + ')');

  const allUnique = new Set([].concat(...groupKeys.map(k => groups[k]))).size === n;
  assert(allUnique, 'All players unique across groups');

  // 3. generateFixtures
  const fixtures = context.generateFixtures(groups);
  let expectedMatches = 0;
  for (const k of groupKeys) {
    const m = groups[k].length;
    expectedMatches += m * (m - 1) / 2;
  }
  assert(fixtures.length === expectedMatches, 'Generated ' + fixtures.length + ' matches (expected ' + expectedMatches + ')');

  // check all fixtures have unique ids
  const ids = fixtures.map(f => f.id);
  assert(new Set(ids).size === fixtures.length, 'All fixture ids unique');

  // check head-to-head completeness
  const pairSet = new Set();
  let pairsComplete = true;
  for (const f of fixtures) {
    const p1 = f.p1, p2 = f.p2;
    const key = p1 < p2 ? p1 + ':' + p2 : p2 + ':' + p1;
    if (pairSet.has(key)) pairsComplete = false;
    pairSet.add(key);
  }
  assert(pairsComplete, 'All head-to-head pairs covered');

  // 4. Fill scores & calculateStandings (Qualification)
  fillGroupScores(groups, fixtures);
  const result = context.calculateStandings(groups, fixtures);
  const standingsKeys = Object.keys(result.standings);
  assert(standingsKeys.length === groupCount, 'Standings computed for ' + standingsKeys.length + ' groups');

  for (const k of standingsKeys) {
    const st = result.standings[k];
    assert(st.length === groups[k].length, 'Group ' + k + ' standings has ' + st.length + ' entries (expected ' + groups[k].length + ')');
    for (let i = 0; i < st.length; i++) {
      assert(st[i].rank === i + 1, 'Group ' + k + ' player ' + st[i].name + ' rank=' + st[i].rank);
    }
    for (let i = 0; i < st.length - 1; i++) {
      if (st[i].won < st[i + 1].won) {
        assert(false, 'Group ' + k + ' sorting error: rank ' + (i + 1) + ' won=' + st[i].won + ' < rank ' + (i + 2) + ' won=' + st[i + 1].won);
      } else if (st[i].won === st[i + 1].won && st[i].pd < st[i + 1].pd) {
        assert(false, 'Group ' + k + ' sorting error: same wins but pd ' + st[i].pd + ' < ' + st[i + 1].pd);
      }
    }
  }

  // 5. Qualifiers
  const qualifiers = result.qualifiers;
  assert(qualifiers.length === groupCount * 2, 'Qualifiers count = ' + qualifiers.length + ' (expected ' + (groupCount * 2) + ')');

  for (const k of groupKeys) {
    const qInGroup = qualifiers.filter(q => q.group === k);
    assert(qInGroup.length === 2, 'Group ' + k + ' has ' + qInGroup.length + ' qualifiers (expected 2)');
    const rank1 = qInGroup.find(q => q.rank === 1);
    const rank2 = qInGroup.find(q => q.rank === 2);
    assert(!!rank1 && !!rank2, 'Group ' + k + ' qualifiers include rank 1 and 2');
  }

  // 6. generateKnockout
  const knockout = context.generateKnockout(qualifiers);
  if (n <= 1) {
    assert(knockout.length === 0, 'Empty knockout for ' + n + ' players');
  } else {
    let totalExpected = 0;
    let m = qualifiers.length;
    while (m >= 2) {
      totalExpected += m / 2;
      m = m / 2;
    }
    assert(knockout.length === totalExpected, 'Knockout has ' + knockout.length + ' matches (expected ' + totalExpected + ')');

    const rounds = [...new Set(knockout.map(m => m.round))];
    if (totalExpected === 1) {
      assert(rounds[0] === 'Final', 'Knockout round = ' + rounds[0] + ' (expected Final)');
    } else if (totalExpected === 3) {
      assert(rounds.includes('SF') && rounds.includes('Final'), 'Knockout has SF and Final rounds');
    } else if (totalExpected === 7) {
      assert(rounds.includes('QF') && rounds.includes('SF') && rounds.includes('Final'), 'Knockout has QF, SF, Final rounds');
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
      if (changed) ko = context.advanceKnockout(ko);
    }
    assert(ko.length === knockout.length, 'Advanced knockout length unchanged');

    const finalMatch = ko.find(m => m.round === 'Final');
    assert(finalMatch.p1 !== null && finalMatch.p2 !== null,
      'Final has both participants (p1=' + finalMatch.p1 + ', p2=' + finalMatch.p2 + ')');

    // 8. Determine champion
    const champion = finalMatch.winner;
    assert(champion !== null, 'Champion determined: ' + champion);
    const runnerUp = champion === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1;
    assert(runnerUp !== null, 'Runner-up determined: ' + runnerUp);
    assert(champion !== runnerUp, 'Champion and runner-up are different');
  }
}

// Run tests for different player counts
console.log('\n========== ENGINE TESTS ==========\n');

[2, 3, 4, 5, 6, 7, 10, 11, 20].forEach(n => testPlayerCount(n));

// ===================== STORAGE MODEL TESTS =====================

function testTemplateModel(ctx) {
  ctx.localStorage.clear();
  console.log('\n=== Template Model ===');
  let p = 0, f = 0;
  function a(cond, msg) { cond ? (p++, console.log('  PASS: ' + msg)) : (f++, console.error('  FAIL: ' + msg)); }

  a(ctx.getTemplates().length === 0, 'getTemplates() returns empty on fresh start');
  ctx.saveTemplates([{ id: 't1', name: 'Test 1', sport: 'badminton', type: 'singles' }]);
  a(ctx.getTemplates().length === 1, 'saveTemplates() persists one template');
  a(ctx.getTemplates()[0].id === 't1', 'Template ID preserved through save/load');

  const id1 = ctx.createTemplateId('Junior');
  a(id1 === 'junior', 'createTemplateId("Junior") = "junior"');
  const id2 = ctx.createTemplateId('JUNIOR');
  a(id2 === 'junior' || id2 === 'junior_1', 'createTemplateId("JUNIOR") collides or dedups');
  ctx.saveTemplates([]);
  const id3 = ctx.createTemplateId('Senior Boys');
  a(id3 === 'senior_boys', 'createTemplateId with spaces becomes underscores');
  const id4 = ctx.createTemplateId('Test!!@#');
  a(id4 === 'test', 'createTemplateId strips non-alphanumeric chars');

  ctx.localStorage.clear();
  console.log(`  >>> ${p} PASS, ${f} FAIL <<<`);
  return f === 0;
}

function testEventModel(ctx) {
  ctx.localStorage.clear();
  console.log('\n=== Event Model ===');
  let p = 0, f = 0;
  function a(cond, msg) { cond ? (p++, console.log('  PASS: ' + msg)) : (f++, console.error('  FAIL: ' + msg)); }

  a(ctx.getEvents().length === 0, 'getEvents() returns empty on fresh start');

  const e1 = ctx.createEvent('Test Event');
  a(!!e1, 'createEvent returns event object');
  a(e1.id === 'test_event', 'createEvent generates correct ID');
  a(e1.name === 'Test Event', 'createEvent preserves name');
  a(e1.templateIds.length === 0, 'New event has empty templateIds');

  const dup = ctx.createEvent('Test Event');
  a(!dup, 'Duplicate event name returns null');

  const e2 = ctx.createEvent('Event B');
  a(!!e2, 'Second event created');
  a(ctx.getEvents().length === 2, 'getEvents returns 2 events');

  const renameResult = ctx.renameEventImpl('Test Event', 'Renamed Event');
  a(renameResult === null, 'renameEventImpl returns null on success');
  const events = ctx.getEvents();
  a(!!events.find(function(e) { return e.name === 'Renamed Event'; }), 'Event renamed');
  a(!events.find(function(e) { return e.name === 'Test Event'; }), 'Old name no longer exists');

  a(ctx.renameEventImpl('Renamed Event', '') === 'empty', 'Empty name rejected');
  a(ctx.renameEventImpl('Renamed Event', '   ') === 'empty', 'Whitespace name rejected');
  a(ctx.renameEventImpl('Renamed Event', 'Event B') === 'duplicate', 'Duplicate name rejected');
  ctx.createEvent('New Event');
  a(ctx.renameEventImpl('Not Found', 'Anything') === 'not_found', 'Non-existent old name returns not_found');

  ctx.addTemplateToEvent('test_event', 'tmpl_1');
  a(!!ctx.getEvents().find(function(e) { return e.id === 'test_event'; }).templateIds.includes('tmpl_1'), 'addTemplateToEvent works');

  ctx.saveEvents([{ id: 'event_b', name: 'Event B', templateIds: [], createdAt: 1 }]);
  const afterCleanup = ctx.getEvents();
  a(afterCleanup.length === 1, 'Cleanup: only Event B remains');

  ctx.localStorage.clear();
  console.log(`  >>> ${p} PASS, ${f} FAIL <<<`);
  return f === 0;
}

function testGetCategoriesShim(ctx) {
  ctx.localStorage.clear();
  console.log('\n=== getCategories() Shim ===');
  let p = 0, f = 0;
  function a(cond, msg) { cond ? (p++, console.log('  PASS: ' + msg)) : (f++, console.error('  FAIL: ' + msg)); }

  // Empty state returns factory defaults
  const empty = ctx.getCategories();
  a(empty.length === 7, 'Empty state → 7 factory categories');
  a(empty[0].eventId === 'bren_avalon_sports_meet_2026', 'Factory cat has eventId');
  ctx.localStorage.clear();

  // Pre-populated templates+events → shim returns combined view
  ctx.saveTemplates([
    { id: 't1', name: 'Cat 1', sport: 'badminton', type: 'singles' },
    { id: 't2', name: 'Cat 2', sport: 'tableTennis', type: 'doubles' }
  ]);
  ctx.saveEvents([{ id: 'ev1', name: 'Event A', templateIds: ['t1'], createdAt: 1 }]);
  const cats = ctx.getCategories();
  a(cats.length === 1, '1 event × 1 template = 1 category');
  a(cats[0].id === 't1' && cats[0].label === 'Cat 1' && cats[0].event === 'Event A', 'Category has correct fields');
  a(cats[0].eventId === 'ev1', 'Category has eventId');

  // Template not in any event → excluded from shim
  const cats2 = ctx.getCategories();
  a(cats2.length === 1, 'Unlinked template excluded');
  a(!cats2.find(function(c) { return c.id === 't2'; }), 'Table tennis template not in result');

  ctx.localStorage.clear();
  console.log(`  >>> ${p} PASS, ${f} FAIL <<<`);
  return f === 0;
}

// Run storage model tests
console.log('\n========== STORAGE MODEL TESTS ==========\n');
let tmplPass = testTemplateModel(context);
let evPass = testEventModel(context);
let shimPass = testGetCategoriesShim(context);
context.localStorage.clear();

console.log('\n========== RESULTS ==========');
console.log(`Passed: ${pass}`);
console.log(`Failed: ${fail}`);
console.log(`Model tests: ${tmplPass ? 'PASS' : 'FAIL'}, ${evPass ? 'PASS' : 'FAIL'}, ${shimPass ? 'PASS' : 'FAIL'}`);
console.log(`Total:  ${pass + fail}`);

process.exit(fail > 0 ? 1 : 0);
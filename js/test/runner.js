#!/usr/bin/env node
/* Node.js Test Runner for Engine
   Run: node js/test/runner.js
*/

const fs = require('fs');
const vm = require('vm');

// Load model scripts (order matters)
const models = [
  'js/models/participant.js',
  'js/models/match.js',
  'js/models/tournament.js',
  'js/models/sportConfig.js',
  'js/models/appState.js'
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
  Math,
  Array,
  Object,
  Set,
  Map,
  JSON,
  Date,
  setTimeout,
  clearTimeout,
  require: require,
  module: module,
  process: process,
  APP_CONFIG: {
    defaultEvent: "BREN AVALON SPORTS MEET 2026"
  },
  SPORT_CONFIG: {
    badminton: {
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
}

// Run tests for different player counts
console.log('\n========== ENGINE TESTS ==========\n');

[2, 3, 4, 5, 6, 7, 10, 11, 20].forEach(n => testPlayerCount(n));

console.log('\n========== RESULTS ==========');
console.log(`Passed: ${pass}`);
console.log(`Failed: ${fail}`);
console.log(`Total:  ${pass + fail}`);

process.exit(fail > 0 ? 1 : 0);
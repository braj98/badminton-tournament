// ===================== KNOCKOUT =====================
function generateKnockout() {
  const q = state.qualifiers;
  const ko = [];

  if (q.length === 2) {
    ko.push({ id: 'final', round: 'Final', p1: q[0].name, p2: q[1].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
  } else if (q.length === 4) {
    ko.push({ id: 'sf1', round: 'SF', p1: q[0].name, p2: q[3].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'sf2', round: 'SF', p1: q[1].name, p2: q[2].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'final', round: 'Final', p1: null, p2: null,
             s1: null, s2: null, sets: null, done: false, winner: null });
  } else if (q.length === 8) {
    ko.push({ id: 'qf1', round: 'QF', p1: q[0].name, p2: q[3].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'qf2', round: 'QF', p1: q[1].name, p2: q[2].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'qf3', round: 'QF', p1: q[4].name, p2: q[7].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'qf4', round: 'QF', p1: q[5].name, p2: q[6].name,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'sf1', round: 'SF', p1: null, p2: null,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'sf2', round: 'SF', p1: null, p2: null,
             s1: null, s2: null, sets: null, done: false, winner: null });
    ko.push({ id: 'final', round: 'Final', p1: null, p2: null,
             s1: null, s2: null, sets: null, done: false, winner: null });
  }
  state.knockout = ko;
}

function advanceKnockout() {
  const ko = state.knockout;
  if (ko.length <= 2) return;

  const winnerMap = {};
  for (const m of ko) {
    if (m.done && m.winner) winnerMap[m.id] = m.winner;
  }

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
}

function enterKnockoutScore(id, s1, s2) {
  if (!_isAdmin) return;
  const m = state.knockout.find(m => m.id === id);
  if (!m) return;
  m.s1 = parseInt(s1) || 0;
  m.s2 = parseInt(s2) || 0;
  m.updatedAt = Date.now();

  if (m.round === 'Final') return;

  if (m.s1 !== m.s2 && m.p1 && m.p2) {
    m.done = true;
    m.winner = m.s1 > m.s2 ? m.p1 : m.p2;
  } else {
    m.done = false;
    m.winner = null;
  }
  advanceKnockout();
  saveState();
  renderKnockout();
}

function enterFinalSet(id, setNum, s1, s2) {
  if (!_isAdmin) return;
  const m = state.knockout.find(m => m.id === id);
  if (!m) return;
  if (!m.sets) m.sets = [{s1:null,s2:null},{s1:null,s2:null},{s1:null,s2:null}];
  m.sets[setNum] = { s1: parseInt(s1)||0, s2: parseInt(s2)||0 };
  m.updatedAt = Date.now();

  let w1 = 0, w2 = 0;
  let allDecided = true;
  for (const s of m.sets) {
    if (s.s1 === null || s.s2 === null) { allDecided = false; break; }
    if (s.s1 > s.s2) w1++;
    else if (s.s2 > s.s1) w2++;
  }

  if ((w1 >= 2 || w2 >= 2) && m.p1 && m.p2) {
    m.done = true;
    m.winner = w1 >= 2 ? m.p1 : m.p2;
    m.s1 = w1;
    m.s2 = w2;
  } else {
    m.done = false;
    m.winner = null;
    m.s1 = null;
    m.s2 = null;
  }
  advanceKnockout();
  saveState();
  renderKnockout();
}

function renderKnockout() {
  clearDisabled();
  const container = document.getElementById('bracket');
  const ko = state.knockout;
  if (!ko || ko.length === 0) { container.innerHTML = '<p class="text-muted">No knockout matches.</p>'; return; }

  const rounds = ['QF', 'SF', 'Final'];
  let html = '';

  for (const round of rounds) {
    const matches = ko.filter(m => m.round === round);
    if (matches.length === 0) continue;
    html += '<div class="bracket-round"><h3>' + (round === 'QF' ? 'Quarter Finals' : round === 'SF' ? 'Semi Finals' : 'Final') + '</h3>';
    for (const m of matches) {
      const isFinal = m.round === 'Final';
      html += '<div class="bracket-match">';

      if (isFinal) {
        html += '<span class="pname">' + (m.p1 || 'TBD') + '</span>'
          + renderFinalSetInputs(m)
          + '<span class="pname">' + (m.p2 || 'TBD') + '</span>'
          + (m.done ? '<span class="winner-badge">🏆 ' + m.winner + '</span>' : '');
      } else {
        const canPlay = m.p1 && m.p2;
        html += '<span class="pname">' + (m.p1 || 'TBD') + '</span>'
          + (canPlay
            ? '<input class="score-input" type="number" min="0" max="30" value="' + (m.s1 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ks2\').value)" onfocus="this.select()">'
            : '<span style="min-width:56px;text-align:center;">—</span>')
          + '<span class="vs">vs</span>'
          + (canPlay
            ? '<input class="score-input ks2" type="number" min="0" max="30" value="' + (m.s2 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
            : '<span style="min-width:56px;text-align:center;">—</span>')
          + '<span class="pname">' + (m.p2 || 'TBD') + '</span>'
          + (m.done ? '<span class="winner-badge">→ ' + m.winner + '</span>' : '');
      }
      html += '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;

  const finalMatch = ko.find(m => m.id === 'final');
  const btn = document.getElementById('btnShowResults');
  btn.classList.toggle('hidden', !finalMatch || !finalMatch.done);
}

function renderFinalSets(m) {
  if (!m.sets) return '<span class="vs">vs</span>';
  let h = '';
  for (let i = 0; i < 3; i++) {
    const s = m.sets[i];
    if (!s || s.s1 === null) break;
    h += '<span style="font-size:.8rem;padding:0 4px;">' + s.s1 + '-' + s.s2 + '</span>';
  }
  return h;
}

function renderFinalSetInputs(m) {
  let h = '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">';
  for (let i = 0; i < 3; i++) {
    const s = m.sets ? m.sets[i] : null;
    h += '<span style="display:flex;align-items:center;gap:2px;font-size:.8rem;">'
      + 'S' + (i+1) + ':'
      + '<input class="score-input" type="number" min="0" max="15" style="width:56px;" value="' + (s ? (s.s1 ?? '') : '') + '" '
      + 'onchange="enterFinalSet(\'' + m.id + '\',' + i + ',this.value,this.parentElement.querySelector(\'.fs2-' + i + '\').value)" onfocus="this.select()">'
      + '-'
      + '<input class="score-input fs2-' + i + '" type="number" min="0" max="15" style="width:56px;" value="' + (s ? (s.s2 ?? '') : '') + '" '
      + 'onchange="enterFinalSet(\'' + m.id + '\',' + i + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
      + '</span>';
  }
  h += '</div>';
  return h;
}

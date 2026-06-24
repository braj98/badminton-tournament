function renderLiveView() {
  clearDisabled();
  const container = document.getElementById('resultsList');
  const ev = getEvents().find(e => e.id === AppState.eventId);
  if (!ev) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No event selected.</p>';
    return;
  }
  const templates = getTemplates();
  const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final', 'group': 'Group Stage' };
  const sportIcons = { badminton: '🏸', tableTennis: '🏓', chess: '♟' };
  let html = '';
  let hasContent = false;
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    const arr = [];
    const cfg = getSportConfig(tmpl.sport, tmpl.type);
    for (const f of (s.fixtures || [])) {
      if (f.status === 'LIVE') arr.push({ catId: tmpl.id, catName: tmpl.name, round: f.round, c: f, participants: s.participants });
    }
    for (const m of (s.knockout || [])) {
      if (m.status === 'LIVE') arr.push({ catId: tmpl.id, catName: tmpl.name, round: m.round, c: m, participants: s.participants });
    }
    if (arr.length === 0) continue;
    hasContent = true;
    html += '<div style="margin-bottom:12px;">'
      + '<div class="event-group-header">' + (sportIcons[tmpl.sport] || '🏸') + ' ' + escapeHtml(tmpl.name) + '</div>';
    for (const item of arr) {
      const m = item.c;
      var isFinal = item.round === 'Final';
      var isGroup = item.round === 'group';
      var n1 = pName(m.p1, item.participants), n2 = pName(m.p2, item.participants);
      html += '<div class="result-card result-live">'
        + '<div class="result-card-header">'
        + '<span class="result-cat">' + escapeHtml(roundLabel[item.round] || item.round) + '</span>'
        + '<span class="result-round" style="color:var(--danger);">🔴 LIVE</span>'
        + '</div>'
        + '<div class="result-match">' + escapeHtml(n1) + ' <span class="vs">vs</span> ' + escapeHtml(n2) + '</div>';
      if (isAdmin()) {
        html += '<div class="match-score-area" style="margin-top:4px;">';
        if (isFinal) {
          html += _liveFinalSetInputs(m, item.catId, cfg);
        } else if (isGroup) {
          var maxS = cfg.maxScoreInput;
          html += '<input class="score-input" type="number" min="0" max="' + maxS + '" value="' + (m.s1 ?? '') + '" '
            + 'onchange="enterLiveFixtureScore(\'' + item.catId + '\',' + m.id + ',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
            + '<span class="vs">vs</span>'
            + '<input class="score-input ls2" type="number" min="0" max="' + maxS + '" value="' + (m.s2 ?? '') + '" '
            + 'onchange="enterLiveFixtureScore(\'' + item.catId + '\',' + m.id + ',this.parentElement.querySelector(\'.score-input\').value,this.value)">';
        } else {
          var maxS2 = cfg.maxScoreInput;
          var _koId = m.id;
          html += '<input class="score-input" type="number" min="0" max="' + maxS2 + '" value="' + (m.s1 ?? '') + '" '
            + 'onchange="enterLiveKnockoutScore(\'' + item.catId + '\',\'' + _koId + '\',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
            + '<span class="vs">vs</span>'
            + '<input class="score-input ls2" type="number" min="0" max="' + maxS2 + '" value="' + (m.s2 ?? '') + '" '
            + 'onchange="enterLiveKnockoutScore(\'' + item.catId + '\',\'' + _koId + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)">';
        }
        html += '</div>';
      } else {
        html += '<div class="result-score">' + (m.s1 ?? '-') + ' - ' + (m.s2 ?? '-') + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  if (!hasContent) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No matches currently live.</p>';
  }
  container.innerHTML = html;
  document.getElementById('subNavLive').classList.add('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function _liveFinalSetInputs(m, catId, cfg) {
  let h = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  for (let i = 0; i < cfg.finalSets; i++) {
    const s = m.sets ? m.sets[i] : null;
    h += '<span style="display:flex;align-items:center;gap:2px;font-size:.8rem;">'
      + 'S' + (i+1) + ':'
      + '<input class="score-input" type="number" min="0" max="' + cfg.maxFinalSetInput + '" style="width:56px;" value="' + (s ? (s.s1 ?? '') : '') + '" '
      + 'onchange="enterLiveFinalSet(\'' + catId + '\',\'' + m.id + '\',' + i + ',this.value,this.parentElement.querySelector(\'.fs2-' + i + '\').value)" onfocus="this.select()">'
      + '-'
      + '<input class="score-input fs2-' + i + '" type="number" min="0" max="' + cfg.maxFinalSetInput + '" style="width:56px;" value="' + (s ? (s.s2 ?? '') : '') + '" '
      + 'onchange="enterLiveFinalSet(\'' + catId + '\',\'' + m.id + '\',' + i + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
      + '</span>';
  }
  h += '</div>';
  return h;
}

function enterLiveFixtureScore(catId, id, s1, s2) {
  if (!isAdmin()) return;
  const s = localLoad(catId);
  if (!s) return;
  const f = s.fixtures.find(function(m) { return m.id === id; });
  if (!f) return;
  f.s1 = parseInt(s1) || 0;
  f.s2 = parseInt(s2) || 0;
  f.updatedAt = Date.now();
  if (f.status === 'UPCOMING') f.status = 'LIVE';
  const result = computeStandings(s.groups, s.fixtures, s.participants);
  s.standings = result.standings;
  s.qualifiers = result.qualifiers;
  s.knockout = createKnockoutBracket(s.qualifiers);
  s._lastSave = Date.now();
  s.updatedAt = s._lastSave;
  localSave(catId, s);
  if (_supabase && isAdmin() && s.phase !== 'setup') scheduleCloudSave(catId, s);
  renderLiveView();
}

function enterLiveKnockoutScore(catId, id, s1, s2) {
  if (!isAdmin()) return;
  const s = localLoad(catId);
  if (!s) return;
  const m = s.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  m.s1 = parseInt(s1) || 0;
  m.s2 = parseInt(s2) || 0;
  m.updatedAt = Date.now();
  if (m.status === 'UPCOMING') m.status = 'LIVE';
  if (m.round !== 'Final') {
    s.knockout = advanceWinner(s.knockout);
  }
  s._lastSave = Date.now();
  s.updatedAt = s._lastSave;
  localSave(catId, s);
  if (_supabase && isAdmin() && s.phase !== 'setup') scheduleCloudSave(catId, s);
  renderLiveView();
}

function enterLiveFinalSet(catId, id, setNum, s1, s2) {
  if (!isAdmin()) return;
  const s = localLoad(catId);
  if (!s) return;
  const m = s.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  var _cfg = getSportConfig(s.sport, s.format);
  if (!m.sets) {
    m.sets = [];
    for (var _i = 0; _i < _cfg.finalSets; _i++) m.sets.push({s1:null,s2:null});
  }
  const v1 = s1 === '' || s1 === null || s1 === undefined ? null : parseInt(s1) || 0;
  const v2 = s2 === '' || s2 === null || s2 === undefined ? null : parseInt(s2) || 0;
  m.sets[setNum] = { s1: v1, s2: v2 };
  m.updatedAt = Date.now();
  if (m.status === 'UPCOMING') m.status = 'LIVE';
  s._lastSave = Date.now();
  s.updatedAt = s._lastSave;
  localSave(catId, s);
  if (_supabase && isAdmin() && s.phase !== 'setup') scheduleCloudSave(catId, s);
  renderLiveView();
}

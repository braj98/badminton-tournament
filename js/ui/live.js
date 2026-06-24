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
  let html = '<div class="live-match-stack">';
  let hasContent = false;
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    const cfg = getSportConfig(tmpl.sport, tmpl.type);
    const arr = [];
    for (const f of (s.fixtures || [])) {
      if (f.status === 'LIVE' && f.p1 && f.p2) arr.push({ catId: tmpl.id, catName: tmpl.name, round: f.round, c: f, participants: s.participants, isFixture: true });
    }
    for (const m of (s.knockout || [])) {
      if (m.status === 'LIVE' && m.p1 && m.p2) arr.push({ catId: tmpl.id, catName: tmpl.name, round: m.round, c: m, participants: s.participants, isFixture: false });
    }
    for (const item of arr) {
      hasContent = true;
      const m = item.c;
      const n1 = pName(m.p1, item.participants);
      const n2 = pName(m.p2, item.participants);
      const rl = roundLabel[item.round] || item.round;
      const isFinal = item.round === 'Final';
      html += '<div class="live-match-row">'
        + '<div class="meta-tags-block">'
        + '<span class="division-label-string">' + (sportIcons[tmpl.sport] || '🏸') + ' ' + escapeHtml(tmpl.name) + '</span>'
        + '<span class="stage-badge-tag type-live-badge">🔴 ' + escapeHtml(rl) + '</span>'
        + '</div>'
        + '<div class="competitors-versus-block">'
        + '<span>' + escapeHtml(n1) + '</span>'
        + '<span class="vs-separator-label">vs</span>'
        + '<span>' + escapeHtml(n2) + '</span>'
        + '</div>'
        + '<div class="score-live-wrapper">';
      if (isAdmin()) {
        if (isFinal) {
          html += _liveFinalSetInputs(m, item.catId, cfg);
        } else if (item.isFixture) {
          html += '<input class="score-input ls-first" type="number" min="0" max="' + cfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" '
            + 'onchange="enterLiveFixtureScore(\'' + item.catId + '\',' + m.id + ',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
            + '<span class="score-sep-live">-</span>'
            + '<input class="score-input ls2" type="number" min="0" max="' + cfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" '
            + 'onchange="enterLiveFixtureScore(\'' + item.catId + '\',' + m.id + ',this.parentElement.querySelector(\'.ls-first\').value,this.value)">';
        } else {
          html += '<input class="score-input ls-first" type="number" min="0" max="' + cfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" '
            + 'onchange="enterLiveKnockoutScore(\'' + item.catId + '\',\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
            + '<span class="score-sep-live">-</span>'
            + '<input class="score-input ls2" type="number" min="0" max="' + cfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" '
            + 'onchange="enterLiveKnockoutScore(\'' + item.catId + '\',\'' + m.id + '\',this.parentElement.querySelector(\'.ls-first\').value,this.value)">';
        }
      } else {
        html += '<span class="score-display-live">';
        if (isFinal && m.sets) {
          var setsShown = m.sets.filter(function(st) { return st.s1 !== null && st.s2 !== null; });
          if (setsShown.length > 0) {
            html += setsShown.map(function(st) { return st.s1 + '-' + st.s2; }).join(' / ');
          } else {
            html += ' — ';
          }
        } else {
          html += (m.s1 ?? '-') + ' - ' + (m.s2 ?? '-');
        }
        html += '</span>';
      }
      html += '</div></div>';
    }
  }
  if (!hasContent) {
    html = '<div class="empty-state-card">'
      + '<div class="empty-state-icon">📡</div>'
      + '<div class="empty-state-title">No Matches Currently Live</div>'
      + '<div class="empty-state-sub">There are no active matches running right now.</div>'
      + '<button class="btn-upcoming-cta" onclick="switchMatchView(\'upcoming\')">📅 Check Upcoming Schedule</button>'
      + '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('subNavFeed').classList.remove('active');
  document.getElementById('subNavLive').classList.add('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function _liveFinalSetInputs(m, catId, cfg) {
  let h = '<div class="final-sets-inline">';
  for (let i = 0; i < cfg.finalSets; i++) {
    const s = m.sets ? m.sets[i] : null;
    h += '<div class="final-set-group">'
      + 'S' + (i + 1) + ':'
      + '<input class="score-input" type="number" min="0" max="' + cfg.maxFinalSetInput + '" style="width:52px;" value="' + (s ? (s.s1 ?? '') : '') + '" '
      + 'onchange="enterLiveFinalSet(\'' + catId + '\',\'' + m.id + '\',' + i + ',this.value,this.parentElement.querySelector(\'.fs2-' + i + '\').value)" onfocus="this.select()">'
      + '-'
      + '<input class="score-input fs2-' + i + '" type="number" min="0" max="' + cfg.maxFinalSetInput + '" style="width:52px;" value="' + (s ? (s.s2 ?? '') : '') + '" '
      + 'onchange="enterLiveFinalSet(\'' + catId + '\',\'' + m.id + '\',' + i + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
      + '</div>';
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

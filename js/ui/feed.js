function renderTournamentFeed() {
  clearDisabled();
  const container = document.getElementById('resultsList');
  const templates = getTemplates();
  const events = getEvents();
  const ev = events.find(function(e) { return e.id === AppState.eventId; });
  if (!ev || !ev.templateIds) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No tournament data.</p>';
    return;
  }

  const resolve = function(participants, id) {
    return participants ? participantName(participants, id) || id || 'TBD' : id || 'TBD';
  };
  const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final', 'group': 'Group Stage' };
  const feedItems = [];

  for (let ti = 0; ti < ev.templateIds.length; ti++) {
    const tmplId = ev.templateIds[ti];
    const tmpl = templates.find(function(t) { return t.id === tmplId; });
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s || s.phase === 'setup') continue;
    migrateMatchStatus(s);

    const sportIcon = s.sport === 'tableTennis' ? '🏓' : s.sport === 'chess' ? '♟' : '🏸';
    const catName = tmpl.name;
    const participants = s.participants;
    const fixtures = s.fixtures || [];
    const knockout = s.knockout || [];

    // LIVE matches
    for (let fi = 0; fi < fixtures.length; fi++) {
      const f = fixtures[fi];
      if (f.status !== 'LIVE') continue;
      feedItems.push({
        type: 'live', sportIcon, catName,
        round: 'Group Stage', p1: resolve(participants, f.p1), p2: resolve(participants, f.p2),
        scoreDisplay: (f.s1 !== null && f.s2 !== null) ? f.s1 + '-' + f.s2 : null,
        updatedAt: f.updatedAt || 0
      });
    }
    for (let ki = 0; ki < knockout.length; ki++) {
      const m = knockout[ki];
      if (m.status !== 'LIVE') continue;
      feedItems.push({
        type: 'live', sportIcon, catName,
        round: roundLabel[m.round] || m.round,
        p1: resolve(participants, m.p1), p2: resolve(participants, m.p2),
        sets: m.sets, isFinal: m.round === 'Final',
        scoreDisplay: (m.round !== 'Final' && m.s1 !== null && m.s2 !== null) ? m.s1 + '-' + m.s2 : null,
        updatedAt: m.updatedAt || 0
      });
    }

    // RESULTS (completed knockout + fixtures)
    for (let ci = 0; ci < knockout.length; ci++) {
      const cm = knockout[ci];
      if (cm.status !== 'COMPLETED' || !cm.p1 || !cm.p2) continue;
      let scoreDisplay = '';
      if (cm.round === 'Final' && cm.sets) {
        scoreDisplay = cm.sets
          .filter(function(st) { return st.s1 !== null && st.s2 !== null; })
          .map(function(st) { return st.s1 + '-' + st.s2; })
          .join(' / ');
      } else if (cm.s1 !== null && cm.s2 !== null) {
        scoreDisplay = cm.s1 + '-' + cm.s2;
      }
      feedItems.push({
        type: 'result', sportIcon, catName,
        round: roundLabel[cm.round] || cm.round,
        p1: resolve(participants, cm.p1), p2: resolve(participants, cm.p2),
        winner: resolve(participants, cm.winner),
        scoreDisplay: scoreDisplay || '—',
        updatedAt: cm.updatedAt || 0
      });
    }
    for (let fi2 = 0; fi2 < fixtures.length; fi2++) {
      const df = fixtures[fi2];
      if (!df.done || df.status !== 'COMPLETED' || !df.p1 || !df.p2) continue;
      feedItems.push({
        type: 'result', sportIcon, catName, round: 'Group Stage',
        p1: resolve(participants, df.p1), p2: resolve(participants, df.p2),
        winner: resolve(participants, df.winner),
        scoreDisplay: (df.s1 !== null && df.s2 !== null) ? df.s1 + '-' + df.s2 : '—',
        updatedAt: df.updatedAt || 0
      });
    }

    // UPCOMING
    for (let ufi = 0; ufi < fixtures.length; ufi++) {
      const uf = fixtures[ufi];
      if (uf.status !== 'UPCOMING' || !uf.p1 || !uf.p2) continue;
      feedItems.push({
        type: 'next', sportIcon, catName, round: 'Group Stage',
        p1: resolve(participants, uf.p1), p2: resolve(participants, uf.p2),
        catId: tmpl.id, matchId: uf.id, isFixture: true
      });
    }
    for (let uki = 0; uki < knockout.length; uki++) {
      const uk = knockout[uki];
      if (uk.status !== 'UPCOMING' || !uk.p1 || !uk.p2) continue;
      feedItems.push({
        type: 'next', sportIcon, catName,
        round: roundLabel[uk.round] || uk.round,
        p1: resolve(participants, uk.p1), p2: resolve(participants, uk.p2),
        catId: tmpl.id, matchId: uk.id, isFixture: false
      });
    }

    // CHAMPIONS
    if (s.phase === 'champion' && s.champion) {
      feedItems.push({
        type: 'champion', sportIcon, catName,
        champion: resolve(participants, s.champion),
        runnerUp: resolve(participants, s.runnerUp),
        championPhoto: s.championPhoto,
        completedAt: s.completedAt || 0
      });
    }
  }

  if (feedItems.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No tournament activity yet.</p>';
    setFeedTabActive();
    return;
  }

  feedItems.sort(function(a, b) {
    const order = { live: 0, result: 1, next: 2, champion: 3 };
    const aOrder = order[a.type] || 4;
    const bOrder = order[b.type] || 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aTime = a.updatedAt || a.completedAt || 0;
    const bTime = b.updatedAt || b.completedAt || 0;
    return bTime - aTime;
  });

  let html = '<div class="timeline-stack">';
  let resultCount = 0;
  for (let i = 0; i < feedItems.length; i++) {
    const item = feedItems[i];
    if (item.type === 'result') {
      resultCount++;
      if (resultCount > 10) continue;
    }
    html += renderFeedItem(item);
  }
  html += '</div>';
  container.innerHTML = html;
  setFeedTabActive();
}

function renderFeedItem(item) {
  let badge, typeClass;
  if (item.type === 'live') { badge = '🔴 LIVE'; typeClass = 'type-live'; }
  else if (item.type === 'result') { badge = '📖 Result'; typeClass = 'type-result'; }
  else if (item.type === 'next') { badge = '📅 Next Match'; typeClass = 'type-next'; }
  else { badge = '🏆 Champion'; typeClass = 'type-champion'; }

  let cardCls = 'timeline-row-card';
  if (item.round === 'Final') cardCls += ' round-final';
  else if (item.round === 'Semi Final') cardCls += ' round-sf';
  else if (item.round === 'Quarter Final') cardCls += ' round-qf';
  if (item.type === 'champion') cardCls += ' is-champion';

  let html = '<div class="' + cardCls + '">'
    + '<div class="badge-column">'
    + '<span class="status-badge ' + typeClass + '">' + badge + '</span>'
    + '<span class="sub-division-text">' + item.sportIcon + ' ' + escapeHtml(item.catName)
    + (item.round ? ' ' + escapeHtml(item.round) : '') + '</span>'
    + '</div>'
    + '<div class="match-details-column">';

  if (item.type === 'live') {
    html += '<div class="match-vs-row">'
      + escapeHtml(item.p1) + ' <span class="vs-text">vs</span> ' + escapeHtml(item.p2)
      + '</div>';
    if (item.isFinal && item.sets) {
      html += '<div style="display:flex;gap:4px;font-size:.8rem;">';
      for (let si = 0; si < item.sets.length; si++) {
        const st = item.sets[si];
        if (st && st.s1 !== null) html += '<span>S' + (si+1) + ': ' + st.s1 + '-' + st.s2 + '</span>';
      }
      html += '</div>';
    } else if (item.scoreDisplay) {
      html += '<div class="score-display-pill" style="align-self:flex-start;font-size:.75rem;">' + escapeHtml(item.scoreDisplay) + '</div>';
    }
  } else if (item.type === 'result') {
    html += '<div class="match-vs-row">'
      + escapeHtml(item.p1) + ' <span class="vs-text">vs</span> <span class="winner">' + escapeHtml(item.p2) + ' ✓</span>'
      + '</div>';
  } else if (item.type === 'next') {
    html += '<div class="match-vs-row">'
      + escapeHtml(item.p1) + ' <span class="vs-text">vs</span> ' + escapeHtml(item.p2)
      + '</div>';
  } else if (item.type === 'champion') {
    html += '<div class="match-vs-row"><span class="champion-trophy-emblem">🏆</span> ' + escapeHtml(item.champion) + '</div>'
      + '<div class="runner-up-subline">Runner-up: ' + escapeHtml(item.runnerUp || '—') + '</div>';
  }

  html += '</div>'
    + '<div class="action-score-column">';

  if (item.type === 'result') {
    html += '<span class="score-display-pill">' + escapeHtml(item.scoreDisplay) + '</span>';
  } else if (item.type === 'next' && isAdmin()) {
    html += '<button class="btn-action-score" onclick="startUpcomingMatch(\'' + item.catId + '\',\'' + item.matchId + '\')">✍️ Enter Score</button>';
  } else if (item.type === 'champion') {
    // empty — no action needed
  }

  html += '</div></div>';
  return html;
}

function setFeedTabActive() {
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
  const ft = document.getElementById('subNavFeed');
  if (ft) ft.classList.add('active');
}

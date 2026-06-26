function renderUpcomingView() {
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
  let html = '<div class="upcoming-queue-stack">';
  let hasContent = false;
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    for (const f of (s.fixtures || [])) {
      if (f.status !== 'UPCOMING' || !f.p1 || !f.p2) continue;
      hasContent = true;
      html += renderUpcomingCard(tmpl, s, 'Group Stage', f, f.id, true, sportIcons);
    }
    for (const m of (s.knockout || [])) {
      if (m.status !== 'UPCOMING' || !m.p1 || !m.p2) continue;
      hasContent = true;
      html += renderUpcomingCard(tmpl, s, roundLabel[m.round] || m.round, m, m.id, false, sportIcons);
    }
  }
  if (!hasContent) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No upcoming matches.</p>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('subNavFeed').classList.remove('active');
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.add('active');
  document.getElementById('subNavChampions').classList.remove('active');
  renderTicker();
}

function renderUpcomingCard(tmpl, s, roundLabel, m, matchId, isFixture, sportIcons) {
  const n1 = pName(m.p1, s.participants);
  const n2 = pName(m.p2, s.participants);
  let roundCls = '';
  const roundKey = m.round === 'Final' ? 'Final' : m.round === 'SF' ? 'Semi Final' : m.round === 'QF' ? 'Quarter Final' : roundLabel;
  if (roundKey === 'Final') roundCls = ' round-final';
  else if (roundKey === 'Semi Final') roundCls = ' round-sf';
  else if (roundKey === 'Quarter Final') roundCls = ' round-qf';

  let html = '<div class="match-schedule-row' + roundCls + '">'
    + '<div class="meta-tags-block">'
    + '<span class="division-label-string">' + (sportIcons[tmpl.sport] || '🏸') + ' ' + escapeHtml(tmpl.name) + '</span>'
    + '<span class="stage-badge-tag">' + escapeHtml(roundKey) + '</span>'
    + '</div>'
    + '<div class="competitors-versus-block">'
    + '<span>' + escapeHtml(n1) + '</span>'
    + '<span class="vs-separator-label">vs</span>'
    + '<span>' + escapeHtml(n2) + '</span>'
    + '</div>'
    + '<div class="actions-schedule-wrapper">';
  if (isAdmin()) {
    const pinned = isTickerMatch(tmpl.id, matchId);
    html += '<span class="ticker-pin' + (pinned ? ' active' : '') + '" onclick="toggleTickerMatch(\'' + tmpl.id + '\',\'' + matchId + '\')" title="Show on ticker">📌</span>';
    html += '<button class="btn-action-start" onclick="startUpcomingMatch(\'' + tmpl.id + '\',\'' + matchId + '\')">▶️ Start</button>';
  }
  html += '</div></div>';
  return html;
}

function startUpcomingMatch(catId, id) {
  if (!isAdmin()) return;
  if (!confirm('Start this match? It will be marked as live.')) return;
  const s = localLoad(catId);
  if (!s) return;
  var m = s.fixtures.find(function(f) { return f.id === id; })
    || s.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  startMatch(m);
  s._lastSave = Date.now();
  s.updatedAt = s._lastSave;
  localSave(catId, s);
  if (_supabase && isAdmin() && s.phase !== 'setup') scheduleCloudSave(catId, s);
  renderUpcomingView();
}

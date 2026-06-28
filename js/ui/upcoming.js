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
  const now = Date.now();

  let matchList = [];
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    for (const f of (s.fixtures || [])) {
      if (f.status !== 'UPCOMING' || !f.p1 || !f.p2) continue;
      matchList.push({ tmpl, s, m: f, matchId: f.id, isFixture: true });
    }
    for (const m of (s.knockout || [])) {
      if (m.status !== 'UPCOMING' || !m.p1 || !m.p2) continue;
      matchList.push({ tmpl, s, m: m, matchId: m.id, isFixture: false });
    }
  }

  matchList.sort((a, b) => {
    const sa = a.m.scheduledAt, sb = b.m.scheduledAt;
    const aU = !sa, bU = !sb;
    if (aU && bU) return 0;
    if (aU) return 1;
    if (bU) return -1;
    const aSoon = (sa - now) <= 3600000 && (sa - now) > 0;
    const bSoon = (sb - now) <= 3600000 && (sb - now) > 0;
    if (aSoon && !bSoon) return -1;
    if (!aSoon && bSoon) return 1;
    if (aSoon && bSoon) return sa - sb;
    return sa - sb;
  });

  let html = '<div class="upcoming-queue-stack">';
  let hasContent = false;
  for (const entry of matchList) {
    hasContent = true;
    html += renderUpcomingCard(entry.tmpl, entry.s, entry.m, entry.matchId, entry.isFixture, sportIcons);
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

function formatScheduleLabel(m) {
  if (!m.scheduledAt) return null;
  const now = Date.now();
  const sa = m.scheduledAt;
  const diff = sa - now;

  if (diff <= 0) {
    return { text: '🔴 LIVE NOW', cls: 'schedule-live' };
  }
  if (diff <= 3600000) {
    const totalMins = Math.floor(diff / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    let t = '';
    if (hrs > 0) t += hrs + 'h ';
    t += mins + 'm';
    return { text: '🔥 Starting Soon · In ' + t, cls: 'schedule-soon' };
  }

  const d = new Date(sa);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = d.getHours();
  const mns = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return {
    text: '📅 ' + days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' · ' + h + ':' + String(mns).padStart(2, '0') + ' ' + ap,
    cls: 'schedule-set'
  };
}

function tsToLocalDT(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function scheduleMatch(catId, matchId, ts) {
  const s = localLoad(catId);
  if (!s) return;
  const m = s.fixtures.find(f => f.id === matchId) || s.knockout.find(mm => mm.id === matchId);
  if (!m) return;
  m.scheduledAt = ts ? new Date(ts).getTime() : null;
  s._lastSave = Date.now();
  localSave(catId, s);
  if (_supabase && isAdmin()) scheduleCloudSave(catId, s);
  renderUpcomingView();
}

function renderUpcomingCard(tmpl, s, m, matchId, isFixture, sportIcons) {
  const n1 = pName(m.p1, s.participants);
  const n2 = pName(m.p2, s.participants);
  const roundKey = m.round === 'Final' ? 'Final' : m.round === 'SF' ? 'Semi Final' : m.round === 'QF' ? 'Quarter Final' : (m.round || 'Group Stage');
  let roundCls = '';
  if (roundKey === 'Final') roundCls = ' round-final';
  else if (roundKey === 'Semi Final') roundCls = ' round-semifinal';
  else if (roundKey === 'Quarter Final') roundCls = ' round-quarterfinal';

  const schedule = formatScheduleLabel(m);
  let scheduleHtml = '';
  if (schedule) {
    scheduleHtml = '<div class="match-schedule-meta">'
      + '<span class="schedule-label ' + schedule.cls + '">' + schedule.text + '</span>';
  }
  if (isAdmin()) {
    scheduleHtml += '<div class="schedule-input-row">'
    + '<input type="datetime-local" class="schedule-dt-input" value="' + tsToLocalDT(m.scheduledAt) + '" style="font-size:.7rem;padding:2px 6px;width:auto;min-width:150px;">'
    + '<button class="btn btn-sm" onclick="scheduleMatch(\'' + tmpl.id + '\',\'' + matchId + '\', this.parentNode.firstElementChild.value)" style="font-size:.65rem;padding:2px 8px;">🕐 Set</button>'
    + (m.scheduledAt ? '<button class="btn btn-sm" onclick="scheduleMatch(\'' + tmpl.id + '\',\'' + matchId + '\', \'\')" style="font-size:.65rem;padding:2px 6px;color:var(--danger);">✕</button>' : '')
    + '</div>';
  }
  if (schedule) {
    scheduleHtml += '</div>';
  }

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
    + scheduleHtml
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

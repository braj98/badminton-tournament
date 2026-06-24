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
  let html = '';
  let hasContent = false;
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    const arr = [];
    for (const f of (s.fixtures || [])) {
      if (f.status === 'UPCOMING' && f.p1 && f.p2) arr.push({ catId: tmpl.id, catName: tmpl.name, round: f.round, c: f, participants: s.participants });
    }
    for (const m of (s.knockout || [])) {
      if (m.status === 'UPCOMING' && m.p1 && m.p2) arr.push({ catId: tmpl.id, catName: tmpl.name, round: m.round, c: m, participants: s.participants });
    }
    if (arr.length === 0) continue;
    hasContent = true;
    html += '<div style="margin-bottom:12px;">'
      + '<div class="event-group-header">' + (sportIcons[tmpl.sport] || '🏸') + ' ' + escapeHtml(tmpl.name) + '</div>';
    for (const item of arr) {
      const m = item.c;
      var n1 = pName(m.p1, item.participants), n2 = pName(m.p2, item.participants);
      html += '<div class="result-card">'
        + '<div class="result-card-header">'
        + '<span class="result-cat">' + escapeHtml(roundLabel[item.round] || item.round) + '</span>'
        + '<span class="result-round" style="color:var(--text-muted);">⏳ Upcoming</span>'
        + '</div>'
        + '<div class="result-match">' + escapeHtml(n1) + ' <span class="vs">vs</span> ' + escapeHtml(n2) + '</div>';
      if (isAdmin()) {
        html += '<div style="margin-top:6px;"><button class="btn btn-sm btn-outline" onclick="startUpcomingMatch(\'' + item.catId + '\',\'' + m.id + '\')" style="font-size:.75rem;padding:2px 12px;">▶ Start Match</button></div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  if (!hasContent) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No upcoming matches.</p>';
  }
  container.innerHTML = html;
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.add('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function startUpcomingMatch(catId, id) {
  if (!isAdmin()) return;
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

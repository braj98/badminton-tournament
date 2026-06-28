function getTickerMatches() {
  const cats = getCategories().filter(c => c.eventId === AppState.eventId);
  const matches = [];
  for (const cat of cats) {
    const s = localLoad(cat.id);
    if (!s || !s.tickerMatches || !s.tickerMatches.length) continue;
    for (const f of (s.fixtures || [])) {
      if (s.tickerMatches.includes(f.id) && f.p1 && f.p2) {
        matches.push({ cat, m: f, participants: s.participants });
      }
    }
    for (const m of (s.knockout || [])) {
      if (s.tickerMatches.includes(m.id) && m.p1 && m.p2) {
        matches.push({ cat, m, participants: s.participants });
      }
    }
  }
  return matches;
}

let _tickerAnim = null;
let _tickerPaused = false;

function renderTicker() {
  const bar = document.getElementById('tickerBar');
  const track = document.getElementById('tickerTrack');
  if (!bar || !track) return;
  const matches = getTickerMatches();
  if (!matches.length) {
    bar.classList.add('hidden');
    if (_tickerAnim) { cancelAnimationFrame(_tickerAnim); _tickerAnim = null; }
    return;
  }
  bar.classList.remove('hidden');
  const sportIcons = { badminton: '🏸', tableTennis: '🏓', chess: '♟' };
  const items = [];
  const _now = Date.now();
  let liveCount = 0;
  for (const { cat, m, participants } of matches) {
    if (m.status === 'LIVE') liveCount++;
  }
  if (liveCount > 0) {
    items.push('<span class="ticker-item ticker-live-badge">'
      + '<span class="ticker-live-dot">🔴</span>'
      + '<span class="ticker-live-count">' + liveCount + ' LIVE</span>'
      + '</span>');
  }
  for (const { cat, m, participants } of matches) {
    const n1 = pName(m.p1, participants);
    const n2 = pName(m.p2, participants);
    const icon = sportIcons[cat.sport] || '🏸';
    let scoreHtml = '';
    if (m.status === 'LIVE') {
      if (m.round === 'Final' && m.sets) {
        const sets = m.sets.filter(st => st.s1 !== null && st.s2 !== null);
        if (sets.length) scoreHtml = sets.map(st => st.s1 + '-' + st.s2).join(' / ');
      } else if (m.s1 !== null && m.s2 !== null) {
        scoreHtml = m.s1 + '-' + m.s2;
      }
    }
    const statusLabel = m.status === 'LIVE'
      ? '<span class="ticker-live">🔴 LIVE</span>'
      : '<span class="ticker-upcoming">📅</span>';
    const score = scoreHtml ? ' (' + scoreHtml + ')' : '';
    var tickerCls = 'ticker-item';
    if (m.status === 'LIVE') tickerCls += ' ticker-live-item';
    if (m.scheduledAt && m.scheduledAt > _now && m.scheduledAt - _now <= 3600000) tickerCls += ' schedule-soon';
    items.push('<span class="' + tickerCls + '">'
      + '<span class="ticker-cat">' + icon + ' ' + escapeHtml(cat.label) + '</span>'
      + '<span class="ticker-name">' + statusLabel + ' ' + escapeHtml(n1) + ' vs ' + escapeHtml(n2) + score + '</span>'
      + (isAdmin() ? '<span class="ticker-unpin" onclick="toggleTickerMatch(\'' + cat.id + '\',\'' + m.id + '\')" title="Remove from ticker">✕</span>' : '')
      + '</span>');
  }
  track.innerHTML = items.join('');
  track.style.transform = 'translateX(0)';
  if (_tickerAnim) { cancelAnimationFrame(_tickerAnim); _tickerAnim = null; }
  _tickerPaused = false;
  bar.onmouseenter = function() { _tickerPaused = true; };
  bar.onmouseleave = function() { _tickerPaused = false; };
  startTickerScroll(track, bar);
}

function startTickerScroll(track, bar) {
  var pos = 0;
  var speed = 0.5;

  function step() {
    if (!bar || !track) return;
    var barW = bar.offsetWidth;
    var trackW = track.scrollWidth;
    if (trackW <= barW) { _tickerAnim = requestAnimationFrame(step); return; }
    if (!_tickerPaused) pos -= speed;
    if (pos <= -trackW) pos = 0;
    track.style.transform = 'translateX(' + pos + 'px)';
    _tickerAnim = requestAnimationFrame(step);
  }
  _tickerAnim = requestAnimationFrame(step);
}

function toggleTickerMatch(catId, matchId) {
  if (!isAdmin()) return;
  const s = localLoad(catId);
  if (!s) return;
  if (!s.tickerMatches) s.tickerMatches = [];
  const idx = s.tickerMatches.indexOf(matchId);
  if (idx !== -1) {
    s.tickerMatches.splice(idx, 1);
  } else {
    if (s.tickerMatches.length >= 5) {
      showToast('Maximum 5 matches can be pinned to the ticker.', 3000);
      return;
    }
    s.tickerMatches.push(matchId);
  }
  s._lastSave = Date.now();
  localSave(catId, s);
  if (_supabase && isAdmin() && s.phase !== 'setup') scheduleCloudSave(catId, s);
  renderTicker();
  renderMatchView();
}

function isTickerMatch(catId, matchId) {
  const s = localLoad(catId);
  if (!s || !s.tickerMatches) return false;
  return s.tickerMatches.includes(matchId);
}

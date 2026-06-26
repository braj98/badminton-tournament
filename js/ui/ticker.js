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

function renderTicker() {
  const bar = document.getElementById('tickerBar');
  const track = document.getElementById('tickerTrack');
  if (!bar || !track) return;
  const matches = getTickerMatches();
  if (!matches.length) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  const sportIcons = { badminton: '🏸', tableTennis: '🏓', chess: '♟' };
  const items = [];
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
    items.push('<span class="ticker-item">'
      + '<span class="ticker-cat">' + icon + ' ' + escapeHtml(cat.label) + '</span>'
      + '<span class="ticker-name">' + statusLabel + ' ' + escapeHtml(n1) + ' vs ' + escapeHtml(n2) + score + '</span>'
      + '</span>');
  }
  const content = items.join('');
  track.innerHTML = content + content;
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

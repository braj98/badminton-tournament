// ===================== PUBLISHED EVENT REPORT =====================

function goToReport() {
  navigateTo('report');
}

function closeReport() {
  navigateTo('event');
}

function generateDraftReport() {
  var ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
  if (!ev) return;
  var cats = getCategories().filter(function(c) { return c.eventId === ev.id; });
  var stateMap = {};
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    var tmpl = getTemplates().find(function(t) { return t.id === c.id; });
    if (!tmpl) continue;
    stateMap[tmpl.id] = localLoad(tmpl.id);
  }
  var report = generateEventReport(ev, cats, stateMap);
  saveReport(AppState.eventId, report);
  goToReport();
}

function publishReport() {
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.status = 'published';
  report.publishedAt = Date.now();
  if (report.timeline) report.timeline.published = Date.now();
  saveReport(AppState.eventId, report);
  goToReport();
}

function unpublishReport() {
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.status = 'draft';
  report.publishedAt = null;
  saveReport(AppState.eventId, report);
  goToReport();
}

function deleteReportDraft() {
  deleteReport(AppState.eventId);
  closeReport();
}

function renderReport() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('reportContainer');
  var report = loadReport(AppState.eventId);
  if (!report) {
    container.innerHTML = '<div class="report-page"><div class="report-empty"><p style="font-size:1.1rem;margin-bottom:12px;">No report generated yet.</p>'
      + (isAdmin() ? '<button class="btn" onclick="generateDraftReport()">📄 Generate Report</button>' : '')
      + '<div style="margin-top:16px;"><button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button></div></div></div>';
    setupReportScreens();
    return;
  }

  var ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
  var isAdminUser = isAdmin();
  var isPublished = report.status === 'published';

  // Check stale
  var stale = checkReportStale(report, ev);

  var html = '<div class="report-page">';

  // Admin actions bar
  if (isAdminUser) {
    html += '<div class="report-admin-bar">';
    if (isPublished) {
      html += '<span class="report-status-badge published">Published</span>';
      if (stale) {
        html += '<span class="report-stale-warning">⚠ Published report is out of date. Please regenerate and republish.</span>';
      }
      html += '<button class="btn btn-sm btn-secondary" onclick="generateDraftReport()">🔄 Regenerate</button>';
      html += '<button class="btn btn-sm btn-secondary" onclick="unpublishReport()">📝 Unpublish</button>';
    } else {
      html += '<span class="report-status-badge draft">Draft</span>';
      html += '<button class="btn btn-sm" onclick="publishReport()">📢 Publish Report</button>';
      html += '<button class="btn btn-sm btn-secondary" onclick="generateDraftReport()">🔄 Regenerate</button>';
      html += '<button class="btn btn-sm btn-outline" onclick="deleteReportDraft()" style="color:var(--danger);border-color:var(--danger);">🗑 Delete Draft</button>';
    }
    html += '<button class="btn btn-sm btn-secondary" onclick="window.print()">🖨 Print</button>';
    html += '</div>';
  } else {
    if (!isPublished) {
      container.innerHTML = '<div class="report-page"><div class="report-empty"><p>Report not yet published. Check back later.</p>'
        + '<div style="margin-top:16px;"><button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button></div></div></div>';
      setupReportScreens();
      return;
    }
    if (stale) {
      html += '<div class="report-stale-warning">⚠ This report may be out of date. The latest results may differ.</div>';
    }
  }

  // === 1. Event Banner ===
  html += '<div class="report-banner">'
    + '<div class="report-banner-icon">🏆</div>'
    + '<h1 class="report-event-name">' + escapeHtml(report.eventName) + '</h1>'
    + '<p class="report-event-status">'
    + (isPublished
      ? '📖 Official Event Report · Published on ' + new Date(report.publishedAt).toLocaleDateString()
      : '📝 Draft Report')
    + '</p>'
    + (report.organization ? '<p class="report-org">' + escapeHtml(report.organization) + '</p>' : '')
    + (report.eventDates ? '<p class="report-dates">' + escapeHtml(report.eventDates) + '</p>' : '')
    + '</div>';

  // === 2. Appreciation + Narrative ===
  html += '<div class="report-section report-appreciation-section">'
    + '<div class="report-section-title">🙏 Appreciation</div>';
  if (isAdminUser) {
    html += '<textarea id="reportAppreciationInput" class="report-textarea" onchange="saveReportAppreciation()">' + escapeHtml(report.appreciation) + '</textarea>';
  } else {
    html += '<div class="report-quote">' + escapeHtml(report.appreciation) + '</div>';
  }
  // Auto-generated narrative sentence
  if (report.narrative) {
    html += '<div class="report-narrative">' + escapeHtml(report.narrative) + '</div>';
  }
  html += '</div>';

  // === 3. Event at a Glance ===
  var highlights = report.highlights || {};
  // Recalculate completed count from actual champion data (handles stale reports)
  var _completedCount = 0;
  for (var _cci = 0; _cci < (report.champions || []).length; _cci++) {
    if (report.champions[_cci].champion) _completedCount++;
  }
  html += '<div class="report-section"><div class="report-section-title">📊 Event at a Glance</div>'
    + '<div class="report-highlights-grid">'
    + '<div class="report-highlight-card"><span class="num">' + (highlights.participants || 0) + '</span><span class="lbl">Participants</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + (highlights.sports || 0) + '</span><span class="lbl">Sports</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + (highlights.competitions || 0) + '</span><span class="lbl">Competitions</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + (highlights.matches || 0) + '</span><span class="lbl">Matches Played</span></div>'
    + '</div>'
    + '<div class="report-completed-summary">'
    + (_completedCount) + ' of ' + (highlights.competitions || 0) + ' competitions completed'
    + '</div></div>';

  // === 4. Event Timeline ===
  var timeline = report.timeline || {};
  var hasTimeline = timeline.registration || timeline.started || timeline.completed || timeline.published;
  if (hasTimeline || isAdminUser) {
    html += '<div class="report-section"><div class="report-section-title">📅 Event Timeline</div>'
      + '<div class="report-timeline">';
    if (isAdminUser) {
      html += '<div class="report-timeline-row"><span class="tl-label">📋 Registration Closed</span><input type="date" class="tl-input" id="tlRegistration" value="' + _fmtDateInput(timeline.registration) + '" onchange="saveTimelineDate(\'registration\', this.value)"></div>';
      html += '<div class="report-timeline-row"><span class="tl-label">🏸 Tournament Started</span><input type="date" class="tl-input" id="tlStarted" value="' + _fmtDateInput(timeline.started) + '" onchange="saveTimelineDate(\'started\', this.value)"></div>';
      html += '<div class="report-timeline-row"><span class="tl-label">🏆 Tournament Completed</span><input type="date" class="tl-input" id="tlCompleted" value="' + _fmtDateInput(timeline.completed) + '" onchange="saveTimelineDate(\'completed\', this.value)"></div>';
      html += '<div class="report-timeline-row"><span class="tl-label" style="opacity:.5;">📖 Report Published</span><span class="tl-date" style="opacity:.5;">' + _renderTimelineVal(timeline.published) + '</span></div>';
    } else {
      html += _renderTimelineItem('📋 Registration Closed', timeline.registration);
      html += _renderTimelineItem('🏸 Tournament Started', timeline.started);
      html += _renderTimelineItem('🏆 Tournament Completed', timeline.completed);
      html += _renderTimelineItem('📖 Report Published', timeline.published);
    }
    html += '</div></div>';
  }

  // === 5. Match Statistics ===
  var ms = report.matchStats || {};
  html += '<div class="report-section"><div class="report-section-title">🎯 Match Statistics</div>'
    + '<div class="report-match-stats">'
    + '<div class="report-stat-row"><span class="stat-label">Group Matches</span><span class="stat-value">' + (ms.group || 0) + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Quarter Final Matches</span><span class="stat-value">' + (ms.quarterFinal || 0) + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Semi Final Matches</span><span class="stat-value">' + (ms.semiFinal || 0) + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Final Matches</span><span class="stat-value">' + (ms.final || 0) + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">BYE Matches</span><span class="stat-value">' + (ms.bye || 0) + '</span></div>'
    + '<div class="report-stat-row report-stat-total"><span class="stat-label">Completed Matches</span><span class="stat-value">' + (ms.completed || 0) + '</span></div>'
    + '</div></div>';

  // === 6. Champions ===
  var showChampions = [];
  for (var ci = 0; ci < (report.champions || []).length; ci++) {
    var ch = report.champions[ci];
    if (!ch.champion) continue;
    showChampions.push(ch);
  }
  if (showChampions.length > 0) {
    html += '<div class="report-section"><div class="report-section-title">🏆 Champions</div>';
    for (var ci2 = 0; ci2 < showChampions.length; ci2++) {
      var ch2 = showChampions[ci2];
      html += '<div class="report-champion-row">'
        + '<span class="report-champ-sport">' + getSportIcon(ch2.sport) + '</span>'
        + '<span class="report-champ-comp">' + escapeHtml(ch2.competition) + '</span>'
        + '<span class="report-champ-title">Champion</span>'
        + '<span class="report-champ-winner">🥇 ' + (ch2.champion ? escapeHtml(ch2.champion) : '—') + '</span>'
        + '<span class="report-champ-title">Runner-Up</span>'
        + '<span class="report-champ-runnerup">🥈 ' + (ch2.runnerUp ? escapeHtml(ch2.runnerUp) : '—') + '</span>'
        + '</div>';
    }
    html += '</div>';
  }

  // === 7. Sport Summary ===
  if (report.sports && report.sports.length > 0) {
    html += '<div class="report-section"><div class="report-section-title">📋 Sport Summary</div>';
    for (var si = 0; si < report.sports.length; si++) {
      var sp = report.sports[si];
      // Recalculate completed from champion data (handles stale reports)
      var spCompleted = 0;
      for (var _spci = 0; _spci < (report.champions || []).length; _spci++) {
        if (report.champions[_spci].sport === sp.name && report.champions[_spci].champion) spCompleted++;
      }
      var totalCount = sp.competitions ? sp.competitions.length : 0;
      html += '<div class="report-sport-card">'
        + '<div class="report-sport-card-header">' + getSportIcon(sp.name) + ' ' + getSportLabel(sp.name) + '</div>'
        + '<div class="report-sport-card-stats">'
        + '<span>' + sp.participants + ' participants</span>'
        + '<span>' + totalCount + ' competitions</span>'
        + '<span>' + sp.matches + ' matches</span>'
        + '<span>' + spCompleted + ' of ' + totalCount + ' completed</span>'
        + '</div>'
        + '</div>';
    }
    html += '</div>';
  }

  // === 8. Photo Gallery ===
  if (report.photos && report.photos.length > 0) {
    html += '<div class="report-section"><div class="report-section-title">📸 Photo Gallery</div>'
      + '<div class="report-photo-gallery">';
    for (var pi = 0; pi < report.photos.length; pi++) {
      html += '<div class="report-photo-item"><img src="' + escapeHtml(report.photos[pi]) + '" alt="Event photo" loading="lazy"></div>';
    }
    html += '</div></div>';
  } else if (isAdminUser) {
    html += '<div class="report-section report-photo-placeholder"><div class="report-section-title">📸 Photo Gallery</div>'
      + '<p class="text-muted">Add photos to celebrate the event. (Coming soon)</p></div>';
  }

  // === 9. Organized By ===
  html += '<div class="report-section report-organized-by-section">'
    + '<div class="report-section-title">👥 Organized By</div>';
  if (isAdminUser) {
    html += '<textarea id="reportOrganizedByInput" class="report-textarea" onchange="saveReportOrganizedBy()" placeholder="e.g. Bren Avalon Sports Committee">' + escapeHtml(report.organizedBy || '') + '</textarea>';
  } else {
    html += '<div class="report-quote">' + (report.organizedBy ? escapeHtml(report.organizedBy) : '—') + '</div>';
  }
  html += '</div>';

  // === 10. Closing Message ===
  html += '<div class="report-section report-closing-section">'
    + '<div class="report-section-title">💐 Closing Message</div>';
  if (isAdminUser) {
    html += '<textarea id="reportClosingInput" class="report-textarea" onchange="saveReportClosing()">' + escapeHtml(report.closing) + '</textarea>';
  } else {
    html += '<div class="report-quote">' + escapeHtml(report.closing) + '</div>';
  }
  html += '</div>';

  // Footer
  html += '<div class="report-footer">'
    + '<p>Generated ' + new Date(report.generatedAt).toLocaleDateString()
    + (report.publishedAt ? ' · Published ' + new Date(report.publishedAt).toLocaleDateString() : '')
    + '</p>'
    + '<button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button>'
    + '</div></div>';

  container.innerHTML = html;
  setupReportScreens();
}

function _renderTimelineItem(label, timestamp) {
  if (!timestamp) return '<div class="report-timeline-row"><span class="tl-label">' + label + '</span><span class="tl-date">—</span></div>';
  return '<div class="report-timeline-row"><span class="tl-label">' + label + '</span><span class="tl-date">' + new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span></div>';
}

function _renderTimelineVal(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _fmtDateInput(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function saveTimelineDate(field, value) {
  var report = loadReport(AppState.eventId);
  if (!report) return;
  if (!report.timeline) report.timeline = {};
  report.timeline[field] = value ? new Date(value).getTime() : null;
  saveReport(AppState.eventId, report);
  renderReport();
}

function saveReportAppreciation() {
  var input = document.getElementById('reportAppreciationInput');
  if (!input) return;
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.appreciation = input.value;
  saveReport(AppState.eventId, report);
}

function saveReportOrganizedBy() {
  var input = document.getElementById('reportOrganizedByInput');
  if (!input) return;
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.organizedBy = input.value;
  saveReport(AppState.eventId, report);
}

function saveReportClosing() {
  var input = document.getElementById('reportClosingInput');
  if (!input) return;
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.closing = input.value;
  saveReport(AppState.eventId, report);
}

function checkReportStale(report, event) {
  if (!event || !report) return false;
  var cats = getCategories().filter(function(c) { return c.eventId === event.id; });
  for (var i = 0; i < cats.length; i++) {
    var state = localLoad(cats[i].id);
    if (state && state._lastSave && report.generatedAt < state._lastSave) {
      return true;
    }
  }
  return false;
}

function setupReportScreens() {
  showScreen('screen-report', true);
  showScreen('screen-home', false);
  showScreen('screen-event', false);
  showScreen('screen-sport', false);
  showScreen('screen-setup', false);
  showScreen('screen-groups', false);
  showScreen('screen-fixtures', false);
  showScreen('screen-knockout', false);
  showScreen('screen-champion', false);
  showScreen('screen-results', false);
}

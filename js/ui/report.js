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
    + '<p class="report-event-status">' + (isPublished ? 'Successfully Completed' : 'Draft Report') + '</p>'
    + (report.organization ? '<p class="report-org">' + escapeHtml(report.organization) + '</p>' : '')
    + (report.eventDates ? '<p class="report-dates">' + escapeHtml(report.eventDates) + '</p>' : '')
    + '</div>';

  // === 2. Appreciation (editable for admin) ===
  html += '<div class="report-section report-appreciation-section">'
    + '<div class="report-section-title">🙏 Appreciation</div>';
  if (isAdminUser) {
    html += '<textarea id="reportAppreciationInput" class="report-textarea" onchange="saveReportAppreciation()">' + escapeHtml(report.appreciation) + '</textarea>';
  } else {
    html += '<div class="report-quote">' + escapeHtml(report.appreciation) + '</div>';
  }
  html += '</div>';

  // === 3. Tournament Highlights ===
  html += '<div class="report-section"><div class="report-section-title">📊 Tournament Highlights</div>'
    + '<div class="report-highlights-grid">'
    + '<div class="report-highlight-card"><span class="num">' + report.highlights.participants + '</span><span class="lbl">Participants</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + report.highlights.sports + '</span><span class="lbl">Sports</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + report.highlights.competitions + '</span><span class="lbl">Competitions</span></div>'
    + '<div class="report-highlight-card"><span class="num">' + report.highlights.matches + '</span><span class="lbl">Matches Played</span></div>'
    + '</div></div>';

  // === 4. Match Statistics ===
  html += '<div class="report-section"><div class="report-section-title">🎯 Match Statistics</div>'
    + '<div class="report-match-stats">'
    + '<div class="report-stat-row"><span class="stat-label">Group Stage</span><span class="stat-value">' + report.matchStats.group + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Quarter Finals</span><span class="stat-value">' + report.matchStats.quarterFinal + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Semi Finals</span><span class="stat-value">' + report.matchStats.semiFinal + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">Finals</span><span class="stat-value">' + report.matchStats.final + '</span></div>'
    + '<div class="report-stat-row"><span class="stat-label">BYE Matches</span><span class="stat-value">' + report.matchStats.bye + '</span></div>'
    + '<div class="report-stat-row report-stat-total"><span class="stat-label">Completed Matches</span><span class="stat-value">' + report.matchStats.completed + '</span></div>'
    + '</div></div>';

  // === 5. Champions ===
  if (report.champions.length > 0) {
    html += '<div class="report-section"><div class="report-section-title">🏆 Champions</div>';
    for (var ci = 0; ci < report.champions.length; ci++) {
      var ch = report.champions[ci];
      html += '<div class="report-champion-row">'
        + '<span class="report-champ-sport">' + getSportIcon(ch.sport) + '</span>'
        + '<span class="report-champ-comp">' + escapeHtml(ch.competition) + '</span>'
        + '<span class="report-champ-winner">🥇 ' + (ch.champion ? escapeHtml(ch.champion) : '—') + '</span>'
        + '<span class="report-champ-runnerup">🥈 ' + (ch.runnerUp ? escapeHtml(ch.runnerUp) : '—') + '</span>'
        + '</div>';
    }
    html += '</div>';
  }

  // === 6. Sport Summary ===
  if (report.sports.length > 0) {
    html += '<div class="report-section"><div class="report-section-title">📋 Sport Summary</div>';
    for (var si = 0; si < report.sports.length; si++) {
      var sp = report.sports[si];
      html += '<div class="report-sport-card">'
        + '<div class="report-sport-card-header">' + getSportIcon(sp.name) + ' ' + getSportLabel(sp.name) + '</div>'
        + '<div class="report-sport-card-stats">'
        + '<span>' + sp.participants + ' participants</span>'
        + '<span>' + sp.competitions.length + ' competitions</span>'
        + '<span>' + sp.matches + ' matches</span>'
        + '</div>';
      if (sp.champions.length > 0) {
        html += '<div class="report-sport-champions">';
        for (var sci = 0; sci < sp.champions.length; sci++) {
          var sc = sp.champions[sci];
          html += '<div class="report-sport-champ"><span>' + escapeHtml(sc.competition) + '</span> 🥇 ' + (sc.champion ? escapeHtml(sc.champion) : '—') + (sc.runnerUp ? ' 🥈 ' + escapeHtml(sc.runnerUp) : '') + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  // === 7. Photo Gallery ===
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

  // === 8. Closing Message ===
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

function saveReportAppreciation() {
  var input = document.getElementById('reportAppreciationInput');
  if (!input) return;
  var report = loadReport(AppState.eventId);
  if (!report) return;
  report.appreciation = input.value;
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

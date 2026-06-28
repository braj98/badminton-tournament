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
  // Preserve manually edited fields from existing report
  var existing = loadReport(AppState.eventId);
  var report = generateEventReport(ev, cats, stateMap);
  if (existing) {
    report.version = (existing.version || 0) + 1;
    report.appreciation = existing.appreciation || report.appreciation;
    report.organizedBy = existing.organizedBy || report.organizedBy;
    report.closing = existing.closing || report.closing;
    report.untilNextTime = existing.untilNextTime || report.untilNextTime;
    report.organization = existing.organization || report.organization;
    report.eventDates = existing.eventDates || report.eventDates;
    if (existing.timeline) {
      if (existing.timeline.registration) report.timeline.registration = existing.timeline.registration;
      if (existing.timeline.started) report.timeline.started = existing.timeline.started;
      if (existing.timeline.completed) report.timeline.completed = existing.timeline.completed;
      if (existing.timeline.published) report.timeline.published = existing.timeline.published;
    }
  }
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

function shareReport() {
  var url = window.location.origin + window.location.pathname + '?report=' + AppState.eventId;
  navigator.clipboard.writeText(url).then(function() {
    showToast('🔗 Link copied to clipboard');
  }).catch(function() {
    showToast('🔗 ' + url);
  });
}

function renderReport() {
  clearDisabled();
  updateNavigationVisibility();
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

  var html = '<div class="report-page">';

  // Admin actions bar (hidden in standalone shareable view)
  if (!window._reportStandalone && isAdminUser) {
    html += '<div class="report-admin-bar">'
      + '<div class="report-admin-left">';
    if (isPublished) {
      html += '<span class="report-publish-area">'
        + '<span class="report-status-badge published">Published</span>'
        + '<span class="report-hover-actions">'
        + '<button class="report-btn report-btn-sm" onclick="shareReport()" title="Share">🔗</button>'
        + '<button class="report-btn report-btn-sm" onclick="window.print()" title="Print">🖨️</button>'
        + '<button class="report-btn report-btn-sm" onclick="unpublishReport()" title="Unpublish">📝</button>'
        + '</span></span>';
    } else {
      html += '<button class="report-btn report-btn-primary" onclick="publishReport()" title="Publish Report">📢</button>'
        + '<button class="report-btn report-btn-save" onclick="saveReportDraft()" title="Save Draft">💾</button>';
    }
    html += '</div><div class="report-admin-right">';
    html += '<button class="report-btn report-btn-utility" onclick="generateDraftReport()" title="Regenerate">🔄</button>'
      + (!isPublished ? '<button class="report-btn report-btn-utility" onclick="deleteReportDraft()" title="Delete Draft" style="color:var(--danger);">🗑️</button>' : '')
      + '<button class="report-btn report-btn-utility" onclick="closeReport()" title="Back">←</button>'
      + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:.8rem;">'
        + '<span style="color:var(--text-muted);white-space:nowrap;">🔗 Share:</span>'
        + '<input type="text" readonly value="' + (window.location.origin + window.location.pathname + '?report=' + AppState.eventId) + '"'
        + ' style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:.78rem;background:var(--bg-page);color:var(--text-main);cursor:text;min-width:0;"'
        + ' onclick="this.select()"'
        + ' title="Click to select, then copy">'
        + '<button class="report-btn report-btn-utility" onclick="var i=this.previousElementSibling;navigator.clipboard.writeText(i.value).then(function(){showToast(\'🔗 Copied\')})" style="padding:4px 10px;font-size:.78rem;" title="Copy link">📋</button>'
        + '</div>';
  } else {
    if (!isPublished) {
      container.innerHTML = '<div class="report-page"><div class="report-empty"><p>Report not yet published. Check back later.</p>'
        + (!window._reportStandalone ? '<div style="margin-top:16px;"><button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button></div>' : '') + '</div></div>';
      setupReportScreens();
      return;
    }
    if (!window._reportStandalone) {
      html += '<div style="margin-bottom:12px;"><button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button></div>';
    }
  }

  var highlights = report.highlights || {};
  var timeline = report.timeline || {};

  // === 1. Hero Section ===
  html += '<section class="report-hero">'
    + '<div class="report-hero-content">'
    + '<h1 class="report-hero-title">' + escapeHtml(report.eventName) + '</h1>'
    + '<p class="report-hero-status">'
    + (isPublished
      ? 'Official Event Report · Published on ' + new Date(report.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Draft Report')
    + '</p>'
    + (report.organization ? '<p style="font-size:0.8rem;opacity:.75;margin:4px 0 0;">' + escapeHtml(report.organization) + '</p>' : '')
    + '</div>'
    + '<div class="report-hero-stats">'
    + '<div class="report-hero-stat"><span class="num">' + (highlights.matches || 0) + '</span><span class="lbl">Matches</span></div>'
    + '<div class="report-hero-stat"><span class="num">' + (highlights.participants || 0) + '</span><span class="lbl">Players</span></div>'
    + '</div>'
    + '<div class="report-hero-bg-icon"><span class="material-symbols-outlined" data-icon="sports_badminton">sports_badminton</span></div>'
    + '</section>';

  // === 2. Appreciation + Timeline Bento ===
  html += '<div class="report-bento">'
    // Appreciation card
    + '<div class="report-card report-card-accent">'
    + '<div class="report-card-header"><span class="material-symbols-outlined icon" data-icon="volunteer_activism">volunteer_activism</span>'
    + '<h2 class="report-card-title">Appreciation</h2></div>';
  if (isAdminUser) {
    html += '<textarea id="reportAppreciationInput" class="report-textarea" style="margin-bottom:10px;">' + escapeHtml(report.appreciation) + '</textarea>';
  } else {
    html += '<p class="report-card-body">' + escapeHtml(report.appreciation) + '</p>';
  }
  if (report.narrative) {
    html += '<p class="report-card-body" style="margin-top:8px;font-style:italic;">' + escapeHtml(report.narrative) + '</p>';
  }
  html += '<div style="display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px;background:var(--surface-container-low,#eff4ff);border-radius:8px;">'
    + '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-fixed,#dbe1ff);display:flex;align-items:center;justify-content:center;">'
    + '<span class="material-symbols-outlined" style="font-size:1rem;color:var(--primary);" data-icon="person">person</span></div>';
  if (isAdminUser) {
    html += '<textarea id="reportOrganizedByInput" class="report-textarea" style="min-height:40px;" placeholder="Tournament Director">' + escapeHtml(report.organizedBy || '') + '</textarea>';
  } else {
    html += '<div style="flex:1;"><p style="font-size:.82rem;font-weight:600;margin:0;">' + escapeHtml(report.organizedBy || 'Tournament Director') + '</p></div>';
  }
  html += '</div>';
  html += '</div>'
    // Timeline card
    + '<div class="report-card">'
    + '<div class="report-card-header"><span class="material-symbols-outlined icon-secondary" data-icon="timeline">timeline</span>'
    + '<h2 class="report-card-title">Timeline</h2></div>'
    + '<ul class="report-timeline-stepper">';
  if (isAdminUser) {
    html += _tlStepInput('Registration Closed', 'registration', timeline.registration);
    html += _tlStepInput('Tournament Started', 'started', timeline.started);
    html += _tlStepInput('Tournament Completed', 'completed', timeline.completed);
  } else {
    html += _tlStepView('Registration Closed', timeline.registration);
    html += _tlStepView('Tournament Started', timeline.started);
    html += _tlStepView('Tournament Completed', timeline.completed, 'In Progress');
  }
  html += '</ul></div></div>';

  // === 3. Champions Gallery ===
  var showChampions = [];
  for (var ci = 0; ci < (report.champions || []).length; ci++) {
    var ch = report.champions[ci];
    if (!ch.champion) continue;
    showChampions.push(ch);
  }
  if (showChampions.length > 0) {
    html += '<div class="report-champion-header">'
      + '<h2><span class="material-symbols-outlined" style="color:#facc15;" data-icon="emoji_events">emoji_events</span> Champions</h2>'
      + '<span class="report-champion-count">' + showChampions.length + ' CATEGOR' + (showChampions.length === 1 ? 'Y' : 'IES') + '</span>'
      + '</div>'
      + '<div class="report-champion-grid">';
    for (var ci2 = 0; ci2 < showChampions.length; ci2++) {
      var ch2 = showChampions[ci2];
      var sportIcon = ch2.sport === 'badminton' ? 'sports_badminton' : ch2.sport === 'tableTennis' ? 'sports_tennis' : 'chess';
      html += '<div class="report-champ-card">'
        + '<div class="report-champ-card-header">'
        + '<span class="name">' + escapeHtml(ch2.competition) + '</span>'
        + '<span class="material-symbols-outlined" style="font-size:1rem;color:var(--text-muted)" data-icon="' + sportIcon + '">' + sportIcon + '</span>'
        + '</div>'
        + '<div class="report-champ-card-body">'
        + '<div class="report-champ-entry">'
        + '<div class="report-champ-icon winner"><span class="material-symbols-outlined" style="color:var(--primary);font-variation-settings:\'FILL\' 1;" data-icon="workspace_premium">workspace_premium</span></div>'
        + '<div class="report-champ-meta"><p class="role">Champion</p><p class="winner-name">' + escapeHtml(ch2.champion) + '</p></div>'
        + '</div>'
        + '<div class="report-champ-entry">'
        + '<div class="report-champ-icon runnerup"><span class="material-symbols-outlined" style="color:var(--text-muted)" data-icon="military_tech">military_tech</span></div>'
        + '<div class="report-champ-meta"><p class="role">Runner-up</p><p class="runnerup-name">' + (ch2.runnerUp ? escapeHtml(ch2.runnerUp) : '\u2014') + '</p></div>'
        + '</div>'
        + '</div></div>';
    }
    html += '</div>';
  }

  // === 4. Match Statistics ===
  var ms = report.matchStats || {};
  var totalActual = (ms.group || 0) + (ms.quarterFinal || 0) + (ms.semiFinal || 0) + (ms.final || 0);
  var _pct = function(v) { return totalActual > 0 ? Math.round((v / totalActual) * 100) : 0; };
  html += '<div class="report-card report-stats-section">'
    + '<div class="report-card-header" style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:0;">'
    + '<span class="material-symbols-outlined icon" data-icon="analytics">analytics</span>'
    + '<h2 class="report-card-title">Match Statistics</h2></div>'
    + '<table class="report-stats-table">'
    + '<thead><tr><th>Phase</th><th>Match Count</th><th>Contribution</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Group Matches</td><td class="stat-val">' + (ms.group || 0) + '</td><td><div class="report-progress-track"><div class="report-progress-fill-custom" style="width:' + _pct(ms.group) + '%;"></div></div></td></tr>'
    + '<tr><td>Quarter Final Matches</td><td class="stat-val">' + (ms.quarterFinal || 0) + '</td><td><div class="report-progress-track"><div class="report-progress-fill-custom" style="width:' + _pct(ms.quarterFinal) + '%;"></div></div></td></tr>'
    + '<tr><td>Semi Final Matches</td><td class="stat-val">' + (ms.semiFinal || 0) + '</td><td><div class="report-progress-track"><div class="report-progress-fill-custom" style="width:' + _pct(ms.semiFinal) + '%;"></div></div></td></tr>'
    + '<tr><td>Final Matches</td><td class="stat-val">' + (ms.final || 0) + '</td><td><div class="report-progress-track"><div class="report-progress-fill-custom" style="width:' + _pct(ms.final) + '%;"></div></div></td></tr>'
    + ((ms.bye || 0) > 0 ? '<tr><td>BYE Matches</td><td class="stat-val">' + (ms.bye || 0) + '</td><td><div class="report-progress-track"><div class="report-progress-fill-custom" style="width:' + _pct(ms.bye) + '%;background:var(--text-muted);"></div></div></td></tr>' : '')
    + '<tr class="report-stats-total-row"><td>Completed Matches</td><td class="stat-val">' + (ms.completed || 0) + '</td><td><span class="report-stats-percent">' + totalActual + ' TOTAL</span></td></tr>'
    + '</tbody></table></div>';

  // === 5. Sport Summary ===
  if (report.sports && report.sports.length > 0) {
    html += '<div class="report-card" style="margin-bottom:24px;">'
      + '<div class="report-card-header"><span class="material-symbols-outlined icon" data-icon="list">list</span>'
      + '<h2 class="report-card-title">Sport Summary</h2></div>';
    for (var si = 0; si < report.sports.length; si++) {
      var sp = report.sports[si];
      var spCompleted = 0;
      for (var _spci = 0; _spci < (report.champions || []).length; _spci++) {
        if (report.champions[_spci].sport === sp.name && report.champions[_spci].champion) spCompleted++;
      }
      var sportIcon2 = sp.name === 'badminton' ? 'sports_badminton' : sp.name === 'tableTennis' ? 'sports_tennis' : 'chess';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">'
        + '<div class="report-sport-icon"><span class="material-symbols-outlined" style="font-size:1rem;color:var(--primary)" data-icon="' + sportIcon2 + '">' + sportIcon2 + '</span></div>'
        + '<div style="flex:1;"><p style="font-size:.85rem;font-weight:600;margin:0;">' + getSportLabel(sp.name) + '</p>'
        + '<p style="font-size:.75rem;color:var(--text-muted);margin:0;">' + sp.participants + ' participants \u00B7 ' + (sp.competitions ? sp.competitions.length : 0) + ' competitions \u00B7 ' + sp.matches + ' matches \u00B7 ' + spCompleted + ' of ' + (sp.competitions ? sp.competitions.length : 0) + ' completed</p></div>'
        + '</div>';
    }
    html += '</div>';
  }

  // === 6. Photo Gallery ===
  if (report.photos && report.photos.length > 0) {
    html += '<div class="report-card" style="margin-bottom:24px;">'
      + '<div class="report-card-header"><span class="material-symbols-outlined icon" data-icon="photo_library">photo_library</span>'
      + '<h2 class="report-card-title">Photo Gallery</h2></div>'
      + '<div class="report-photo-gallery">';
    for (var pi = 0; pi < report.photos.length; pi++) {
      html += '<div class="report-photo-item"><img src="' + escapeHtml(report.photos[pi]) + '" alt="Event photo" loading="lazy"></div>';
    }
    html += '</div></div>';
  } else if (isAdminUser) {
    html += '<div class="report-card" style="margin-bottom:24px;">'
      + '<div class="report-card-header"><span class="material-symbols-outlined icon" data-icon="photo_library">photo_library</span>'
      + '<h2 class="report-card-title">Photo Gallery</h2></div>'
      + '<p style="font-size:.85rem;color:var(--text-muted);">No event photos have been added yet.</p></div>';
  }

  // === 7. Closing Message (Carrying the Legacy Forward) ===
  html += '<div class="report-closing-message">'
    + '<div class="report-closing-message-header"><span class="material-symbols-outlined" data-icon="volunteer_activism">volunteer_activism</span> Carrying the Legacy Forward</div>';
  if (isAdminUser) {
    html += '<textarea id="reportClosingInput" class="report-textarea" style="margin-bottom:8px;">' + escapeHtml(report.closing) + '</textarea>';
  } else {
    html += '<p class="report-closing-message-text">' + escapeHtml(report.closing) + '</p>';
  }
  html += '</div>';

  // === 8. Until Next Time... ===
  html += '<div class="report-closing">'
    + '<div class="report-closing-header"><span class="material-symbols-outlined" style="color:#facc15;font-variation-settings:\'FILL\' 1;" data-icon="emoji_events">emoji_events</span> Until Next Time...</div>';
  if (isAdminUser) {
    html += '<textarea id="reportUntilNextTimeInput" class="report-textarea" style="margin-bottom:8px;">' + escapeHtml(report.untilNextTime || 'Carry forward the spirit of fair play, respect, perseverance, and community. See you at the next event!') + '</textarea>';
  } else {
    html += '<p class="report-closing-text">' + escapeHtml(report.untilNextTime || 'Carry forward the spirit of fair play, respect, perseverance, and community. See you at the next event!') + '</p>';
  }
  html += '</div>';

  // === 9. Footer ===
  html += '<div class="report-footer">'
    + '<div class="report-footer-left">'
    + '<span class="brand">Pro-Circuit Reports</span>'
    + '<span class="copy">&copy; 2026 Bren Avalon Sports Committee. All Rights Reserved.</span>'
    + '</div>'
    + '<div class="report-footer-links">'
    + '<a href="#">Privacy Policy</a>'
    + '<a href="#">Terms of Service</a>'
    + '<a href="#">Support</a>'
    + '</div></div></div>';

  container.innerHTML = html;
  setupReportScreens();
}

function _tlStepView(label, timestamp, fallback) {
  var dateStr = timestamp
    ? new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : (fallback || '\u2014');
  return '<li class="report-tl-item">'
    + '<div class="report-tl-dot"><span class="material-symbols-outlined" style="font-size:12px;font-variation-settings:\'wght\' 700;" data-icon="check">check</span></div>'
    + '<p class="report-tl-label">' + label + '</p>'
    + '<p class="report-tl-date">' + dateStr + '</p>'
    + '</li>';
}

function _tlStepInput(label, field, value) {
  return '<li class="report-tl-item">'
    + '<div class="report-tl-dot"><span class="material-symbols-outlined" style="font-size:12px;font-variation-settings:\'wght\' 700;" data-icon="edit">edit</span></div>'
    + '<p class="report-tl-label">' + label + '</p>'
    + '<input type="date" class="tl-input" style="margin-top:4px;" value="' + _fmtDateInput(value) + '" onchange="saveTimelineDate(\'' + field + '\', this.value)">'
    + '</li>';
}

function _fmtDateInput(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _fmtDateInput(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function saveReportDraft() {
  var report = loadReport(AppState.eventId);
  if (!report) return;
  var appreciation = document.getElementById('reportAppreciationInput');
  var organizedBy = document.getElementById('reportOrganizedByInput');
  var closing = document.getElementById('reportClosingInput');
  var untilNextTime = document.getElementById('reportUntilNextTimeInput');
  if (appreciation) report.appreciation = appreciation.value;
  if (organizedBy) report.organizedBy = organizedBy.value;
  if (closing) report.closing = closing.value;
  if (untilNextTime) report.untilNextTime = untilNextTime.value;
  saveReport(AppState.eventId, report);
  showToast('💾 Draft saved');
}

function saveTimelineDate(field, value) {
  var report = loadReport(AppState.eventId);
  if (!report) return;
  if (!report.timeline) report.timeline = {};
  report.timeline[field] = value ? new Date(value).getTime() : null;
  saveReport(AppState.eventId, report);
  renderReport();
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

// ===================== EVENT / TOURNAMENT REPORT =====================

function goToReport() {
  AppState.ui.reportMode = 'event';
  navigateTo('report');
}

function goToTournamentReport() {
  AppState.ui.reportMode = 'tournament';
  AppState.ui.reportReturnView = AppState.view;
  navigateTo('report');
}

function closeReport() {
  if (AppState.ui.reportMode === 'tournament' && AppState.ui.reportReturnView) {
    navigateTo(AppState.ui.reportReturnView);
  } else {
    navigateTo('event');
  }
}

function renderReport() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('reportContainer');

  if (AppState.ui.reportMode === 'tournament') {
    var tmpl = getTemplates().find(function(t) { return t.id === AppState.category; });
    if (!tmpl) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">Category not found.</p>';
      setupReportScreens();
      return;
    }
    var cat = getCategories().find(function(c) { return c.id === tmpl.id; });
    if (!cat) { cat = { id: tmpl.id, label: tmpl.name, sport: tmpl.sport, eventId: AppState.eventId }; }
    var ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
    var evName = ev ? ev.name : 'Tournament';
    var state = localLoad(tmpl.id);
    var cats = [cat];
    var stateMap = {};
    stateMap[tmpl.id] = state;
    var report = generateEventReport({ id: AppState.eventId, name: evName, templateIds: [tmpl.id] }, cats, stateMap);
    report.eventName = escapeHtml(cat.label) + ' — Tournament Report';
    renderReportContent(container, report);
    setupReportScreens();
    return;
  }

  var ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
  if (!ev) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">Event not found.</p>';
    setupReportScreens();
    return;
  }

  var cats = getCategories().filter(function(c) { return c.eventId === ev.id; });
  var stateMap = {};
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    var tmpl = getTemplates().find(function(t) { return t.id === c.id; });
    if (!tmpl) continue;
    stateMap[tmpl.id] = localLoad(tmpl.id);
  }

  var report = generateEventReport(ev, cats, stateMap);
  renderReportContent(container, report);
  setupReportScreens();
}

function renderReportContent(container, report) {
  var html = '<div class="report-page">'
    + '<div class="report-header">'
    + '<h2 class="report-title">' + escapeHtml(report.eventName) + ' — Event Report</h2>'
    + '<p class="report-date">Generated ' + new Date(report.generatedAt).toLocaleDateString() + '</p>'
    + '</div>'
    + '<div class="report-actions">'
    + '<button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button>'
    + '<button class="btn btn-sm" onclick="window.print()">🖨 Print</button>'
    + '</div>'
    + '<div class="report-summary-cards">'
    + '<div class="report-summary-card"><span class="num">' + report.totals.sports + '</span><span class="lbl">Sports</span></div>'
    + '<div class="report-summary-card"><span class="num">' + report.totals.competitions + '</span><span class="lbl">Competitions</span></div>'
    + '<div class="report-summary-card"><span class="num">' + report.totals.participants + '</span><span class="lbl">Participants</span></div>'
    + '<div class="report-summary-card"><span class="num">' + report.totals.matches + '</span><span class="lbl">Matches</span></div>'
    + '</div>';

  if (report.appreciation) {
    html += '<div class="report-message report-appreciation">' + escapeHtml(report.appreciation) + '</div>';
  }

  for (var s = 0; s < report.sports.length; s++) {
    var sport = report.sports[s];
    html += '<div class="report-sport-section">'
      + '<h3 class="report-sport-title">' + getSportIcon(sport.name) + ' ' + getSportLabel(sport.name)
      + ' <span class="report-sport-counts">(' + sport.competitions.length + ' comps, ' + sport.participants + ' participants, ' + sport.totalMatches + ' matches)</span></h3>'
      + '<table class="report-table">'
      + '<thead><tr><th>Competition</th><th>Champion</th><th>Runner-Up</th><th>Matches</th><th>Completed</th></tr></thead>'
      + '<tbody>';

    for (var c = 0; c < sport.competitions.length; c++) {
      var comp = sport.competitions[c];
      var ch = comp.champion ? escapeHtml(comp.champion) : '—';
      var ru = comp.runnerUp ? escapeHtml(comp.runnerUp) : '—';
      html += '<tr><td class="comp-name">' + escapeHtml(comp.label) + '</td>'
        + '<td class="champion-cell">' + ch + '</td>'
        + '<td class="runnerup-cell">' + ru + '</td>'
        + '<td>' + comp.matches + '</td>'
        + '<td>' + comp.completed + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }

  if (report.closing) {
    html += '<div class="report-message report-closing">' + escapeHtml(report.closing) + '</div>';
  }

  html += '<div class="report-footer-actions">'
    + '<button class="btn btn-secondary btn-sm" onclick="closeReport()">← Back</button>'
    + '<button class="btn btn-sm" onclick="window.print()">🖨 Print Report</button>'
    + '</div>'
    + '</div>';

  container.innerHTML = html;
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

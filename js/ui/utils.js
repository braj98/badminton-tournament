function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function isDoubles(catId) {
  const cat = getCategories().find(c => c.id === catId);
  return cat && cat.type === 'doubles';
}

function pName(id) {
  if (!id && id !== 0) return 'TBD';
  if (AppState.tournament && AppState.tournament.participants) {
    const p = findParticipant(AppState.tournament.participants, id);
    if (p) return p.name;
  }
  return id;
}

function getInitials(id) {
  if (!id) return '?';
  var name = pName(id);
  if (!name || name === 'TBD') return '?';
  var parts = name.split(/[ &]+/);
  var initials = '';
  for (var i = 0; i < parts.length && i < 2; i++) {
    if (parts[i].length > 0) initials += parts[i][0].toUpperCase();
  }
  return initials || '?';
}

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
  if (state && state.participants) {
    const p = findParticipant(state.participants, id);
    if (p) return p.name;
  }
  return id;
}

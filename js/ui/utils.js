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

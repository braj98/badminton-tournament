const TEMPLATES_KEY = 'btm_templates';

function getTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (raw) { const t = JSON.parse(raw); if (t.length) return t; }
  } catch(e) {}
  return [];
}

function saveTemplates(templates) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); } catch(e) {}
}

function createTemplateId(label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 't';
  const templates = getTemplates();
  let id = base;
  let counter = 1;
  while (templates.find(t => t.id === id)) {
    id = base + '_' + counter++;
  }
  return id;
}

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

function createTemplateId(_label) {
  const templates = getTemplates();
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  let id = 'tmpl_' + ts + '_' + rand;
  while (templates.find(t => t.id === id)) {
    id = 'tmpl_' + ts + '_' + Math.random().toString(36).slice(2, 6);
  }
  return id;
}

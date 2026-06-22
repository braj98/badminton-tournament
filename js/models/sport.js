const SPORT_INFO = {
  badminton: { label: 'Badminton', icon: '🏸' },
  tableTennis: { label: 'Table Tennis', icon: '🏓' },
  chess: { label: 'Chess', icon: '♟' },
};

const SPORT_IDS = ['badminton', 'tableTennis', 'chess'];

function getSportLabel(sport) {
  return (SPORT_INFO[sport] && SPORT_INFO[sport].label) || sport;
}

function getSportIcon(sport) {
  return (SPORT_INFO[sport] && SPORT_INFO[sport].icon) || '🎯';
}

function getActiveSports() {
  return SPORT_IDS.filter(s => {
    const cats = getCategories().filter(c => (c.event || DEFAULT_EVENT) === AppState.event && c.sport === s);
    return cats.length > 0;
  });
}
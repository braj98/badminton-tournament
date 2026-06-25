let _mid = 0;

function createMatch(p1, p2, round, group, id) {
  return {
    id: id !== undefined ? id : 'm' + _mid++,
    p1: p1,
    p2: p2,
    round: round || 'group',
    group: group || null,
    s1: null,
    s2: null,
    done: false,
    winner: null,
    sets: null,
    status: 'UPCOMING',
    updatedAt: null
  };
}

function calculateStandings(groups, fixtures, participants) {
  const standings = {};
  for (const key of Object.keys(groups)) {
    const playersInGroup = groups[key];
    const stats = {};
    for (const p of playersInGroup) {
      const pObj = participants ? findParticipant(participants, p) : null;
      stats[p] = { id: p, name: pObj ? pObj.name : p, played: 0, won: 0, lost: 0, pf: 0, pa: 0, pd: 0 };
    }
    const groupMatches = fixtures.filter(f => f.group === key && f.done);
    for (const m of groupMatches) {
      const p1 = m.p1, p2 = m.p2;
      stats[p1].played++;
      stats[p2].played++;
      stats[p1].pf += m.s1; stats[p1].pa += m.s2;
      stats[p2].pf += m.s2; stats[p2].pa += m.s1;
      if (m.s1 > m.s2) { stats[p1].won++; stats[p2].lost++; }
      else { stats[p2].won++; stats[p1].lost++; }
    }
    for (const p of playersInGroup) {
      stats[p].pd = stats[p].pf - stats[p].pa;
    }
    const sorted = playersInGroup.slice().sort((a, b) => {
      if (stats[a].won !== stats[b].won) return stats[b].won - stats[a].won;
      if (stats[a].pd !== stats[b].pd) return stats[b].pd - stats[a].pd;
      const h2h = fixtures.find(f => f.done && ((f.p1 === a && f.p2 === b) || (f.p1 === b && f.p2 === a)));
      if (h2h) {
        const aWon = (h2h.p1 === a && h2h.s1 > h2h.s2) || (h2h.p2 === a && h2h.s2 > h2h.s1);
        return aWon ? -1 : 1;
      }
      return stats[b].pf - stats[a].pf;
    });
    standings[key] = sorted.map((p, idx) => ({ ...stats[p], rank: idx + 1 }));
  }
  const qualifiers = [];
  for (const key of Object.keys(standings)) {
    const top2 = standings[key].slice(0, 2);
    for (const p of top2) {
      qualifiers.push({ group: key, rank: p.rank, name: p.name, id: p.id });
    }
  }
  return { standings, qualifiers };
}

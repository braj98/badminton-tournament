function determineGroupCount(playerCount) {
  if (playerCount < 6) return 1;
  if (playerCount <= 10) return 2;
  return 4;
}

function allocateGroups(players, groupCount) {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups = {};
  const letters = 'ABCDEFGH';
  for (let i = 0; i < shuffled.length; i++) {
    const key = letters[i % groupCount];
    if (!groups[key]) groups[key] = [];
    groups[key].push(shuffled[i]);
  }
  return groups;
}

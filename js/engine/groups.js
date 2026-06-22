function determineGroupCount(playerCount, thresholds, groupCounts) {
  if (thresholds && groupCounts) {
    for (let i = 0; i < thresholds.length; i++) {
      if (playerCount <= thresholds[i]) return groupCounts[i];
    }
    return groupCounts[groupCounts.length - 1];
  }
  if (playerCount < 6) return 1;
  if (playerCount <= 10) return 2;
  return 4;
}

function allocateGroups(entries, groupCount) {
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups = {};
  const letters = 'ABCDEFGH';
  for (let i = 0; i < shuffled.length; i++) {
    const key = letters[i % groupCount];
    if (!groups[key]) groups[key] = [];
    const val = shuffled[i];
    groups[key].push(typeof val === 'object' && val !== null ? val.id : val);
  }
  return groups;
}

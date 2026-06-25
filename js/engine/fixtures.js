function generateFixtures(groups) {
  const groupKeys = Object.keys(groups);
  const byGroup = {};
  for (const key of groupKeys) {
    const members = groups[key];
    const matches = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        matches.push(createMatch(members[i], members[j], 'group', key));
      }
    }
    byGroup[key] = matches;
  }
  const scheduled = [];
  let maxLen = 0;
  for (const key of groupKeys) maxLen = Math.max(maxLen, byGroup[key].length);
  for (let i = 0; i < maxLen; i++) {
    for (const key of groupKeys) {
      if (byGroup[key][i]) {
        byGroup[key][i].id = 'fixture_' + scheduled.length;
        scheduled.push(byGroup[key][i]);
      }
    }
  }
  return scheduled;
}

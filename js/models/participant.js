let _pid = 0;

function createParticipant(name, members) {
  return {
    id: 'p' + (_pid++),
    name: name,
    members: members || null,
    createdAt: Date.now()
  };
}

function findParticipant(participants, id) {
  return participants ? participants.find(p => p.id === id) : null;
}

function participantName(participants, id) {
  if (!participants || !id) return id;
  const p = findParticipant(participants, id);
  return p ? p.name : id;
}

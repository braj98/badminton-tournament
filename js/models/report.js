function createEmptyReport(eventId, eventName) {
  return {
    eventId: eventId,
    eventName: eventName,
    generatedAt: Date.now(),
    appreciation: '',
    closing: '',
    photos: [],
    sports: [],
    totals: {
      participants: 0,
      competitions: 0,
      sports: 0,
      matches: 0
    }
  };
}

function createSportSummary(name) {
  return {
    name: name,
    competitions: [],
    participants: 0,
    totalMatches: 0
  };
}

function createCompetitionSummary(templateId, label) {
  return {
    templateId: templateId,
    label: label,
    champion: null,
    runnerUp: null,
    matches: 0,
    completed: 0
  };
}

function createEventReport(eventId, eventName) {
  return {
    eventId: eventId,
    eventName: eventName,
    organization: '',
    organizedBy: '',
    eventDates: '',
    status: 'draft',
    publishedAt: null,
    generatedAt: Date.now(),
    lastModified: Date.now(),
    version: 1,
    generatedBy: '',
    publishedBy: '',
    appreciation: 'Thank you to every participant, volunteer, referee, organizer and supporter for making this event a memorable success.',
    narrative: '',
    closing: 'Congratulations to all winners, runner-ups and participants. We look forward to seeing you again at the next event.',
    untilNextTime: 'Carry forward the spirit of fair play, respect, perseverance, and community. See you at the next event!',
    photos: [],
    timeline: {
      registration: null,
      started: null,
      completed: null
    },
    highlights: {
      participants: 0,
      sports: 0,
      competitions: 0,
      matches: 0,
      completed: 0
    },
    matchStats: {
      group: 0,
      quarterFinal: 0,
      semiFinal: 0,
      final: 0,
      bye: 0,
      completed: 0
    },
    champions: [],
    sports: []
  };
}

function changeReportStatus(report, status, actor) {
  report.status = status;
  report.lastModified = Date.now();
  if (status === 'published') {
    report.publishedAt = Date.now();
    report.publishedBy = actor || '';
  }
  if (status === 'draft') {
    report.publishedAt = null;
    report.publishedBy = '';
  }
  return report;
}

function createChampionEntry(sport, competition, champion, runnerUp) {
  return { sport: sport, competition: competition, champion: champion, runnerUp: runnerUp };
}

function createSportSummary(name) {
  return {
    name: name,
    competitions: [],
    participants: 0,
    matches: 0,
    champions: [],
    completed: 0
  };
}

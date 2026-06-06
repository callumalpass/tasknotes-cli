const TaskNotesAPI = require('./api');

class TestTaskNotesAPI extends TaskNotesAPI {
  constructor() {
    super();
    this.lastRequest = null;
  }

  async request(endpoint, options = {}) {
    this.lastRequest = { endpoint, options };
    return { ok: true };
  }
}

describe('TaskNotesAPI calendar subscription URL validation', () => {
  it('accepts file:// URLs when creating subscriptions', async () => {
    const api = new TestTaskNotesAPI();

    await api.createCalendarSubscription({
      name: 'Local ICS',
      url: 'file:///home/user/calendars/work.ics'
    });

    expect(api.lastRequest.endpoint).toBe('/api/calendars/subscriptions');
    expect(api.lastRequest.options.method).toBe('POST');

    const payload = JSON.parse(api.lastRequest.options.body);
    expect(payload.url).toBe('file:///home/user/calendars/work.ics');
  });

  it('accepts file:// URLs when updating subscriptions', async () => {
    const api = new TestTaskNotesAPI();

    await api.updateCalendarSubscription('sub-1', {
      url: 'file:///tmp/personal.ics'
    });

    expect(api.lastRequest.endpoint).toBe('/api/calendars/subscriptions/sub-1');
    expect(api.lastRequest.options.method).toBe('PUT');

    const payload = JSON.parse(api.lastRequest.options.body);
    expect(payload.url).toBe('file:///tmp/personal.ics');
  });

  it('rejects unsupported URL protocols', async () => {
    const api = new TestTaskNotesAPI();

    await expect(
      api.createCalendarSubscription({
        name: 'Bad URL',
        url: 'ftp://example.com/calendar.ics'
      })
    ).rejects.toThrow('Subscription URL must use http://, https://, webcal://, or file://');
  });
});

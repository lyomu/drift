import { OpenAiNewsAiProvider } from './openai-news-ai.provider';

const request = {
  headline: 'Tennis clinic announced', excerpt: 'The player announced a tennis clinic.',
  maxSummaryCharacters: 240, allowedCategories: ['LATEST'],
};
const output = {
  summary: 'A tennis clinic was announced.', category_slug: 'LATEST',
  tags: [], players: [], tournaments: [], language: 'en',
  relevance_score: 0.9, confidence: 0.95, risk_flags: [],
};

describe('OpenAiNewsAiProvider', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  beforeEach(() => { process.env.OPENAI_API_KEY = 'test-key'; });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it('sends bounded source text and parses a structured response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({
      status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    }) });
    global.fetch = fetchMock;
    await expect(new OpenAiNewsAiProvider().process(request)).resolves.toEqual(output);
    const [url, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body) as { store: boolean; input: string; tools?: unknown };
    expect(body.store).toBe(false);
    expect(body.tools).toBeUndefined();
    expect(JSON.parse(body.input)).toEqual(request);
  });

  it('does not retry authentication errors', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    global.fetch = fetchMock;
    await expect(new OpenAiNewsAiProvider().process(request)).rejects.toMatchObject({ code: 'AUTHENTICATION' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient provider outage once', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) });
    global.fetch = fetchMock;
    await expect(new OpenAiNewsAiProvider().process(request)).resolves.toEqual(output);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails closed on a provider refusal', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }) });
    await expect(new OpenAiNewsAiProvider().process(request)).rejects.toMatchObject({ code: 'REFUSED' });
  });
});

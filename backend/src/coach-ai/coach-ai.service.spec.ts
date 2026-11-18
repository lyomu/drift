import { CoachAiService } from './coach-ai.service';

describe('CoachAiService', () => {
  const previousSecret = process.env.JWT_SECRET;
  let row: {
    id: string;
    encryptedKey: string;
    model: string;
    enabled: boolean;
    updatedAt: Date;
  } | null;
  let prisma: {
    coachAiSetting: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: CoachAiService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'a-long-drift-test-secret-with-at-least-32-bytes';
    row = null;
    prisma = {
      coachAiSetting: {
        findUnique: jest.fn().mockImplementation(async () => row),
        upsert: jest.fn().mockImplementation(async ({ create, update }) => {
          row = {
            ...(row ?? { id: 'default', updatedAt: new Date() }),
            ...(row ? update : create),
          };
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          row = { ...row!, ...data };
          return row;
        }),
      },
    };
    service = new CoachAiService(prisma as never);
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('encrypts the key and never returns it in admin status', async () => {
    const status = await service.saveKey(' sk-test-secret ');
    expect(row!.encryptedKey).not.toContain('sk-test-secret');
    expect(row!.encryptedKey).toMatch(/^v1\./);
    expect(status).toMatchObject({
      configured: true,
      enabled: true,
      provider: 'deepseek',
    });
    expect(JSON.stringify(status)).not.toContain('sk-test-secret');
    expect(await service.active()).toEqual({
      key: 'sk-test-secret',
      model: 'deepseek-flash',
    });
  });

  it('uses the saved key in a DeepSeek JSON request and stops when paused', async () => {
    await service.saveKey('sk-test-secret');
    const originalFetch = global.fetch;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: '{"overall":"Good","tips":[]}' },
          },
        ],
      }),
    });
    global.fetch = mockFetch as typeof fetch;
    try {
      expect(await service.generateJson('Write JSON', '{}')).toEqual({
        result: { overall: 'Good', tips: [] },
        model: 'deepseek-flash',
      });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/chat/completions');
      expect(options.headers.Authorization).toBe('Bearer sk-test-secret');
      expect(JSON.parse(options.body)).toMatchObject({
        model: 'deepseek-flash',
        response_format: { type: 'json_object' },
      });
      await service.setEnabled(false);
      expect(await service.active()).toBeNull();
      await expect(service.generateJson('Write JSON', '{}')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

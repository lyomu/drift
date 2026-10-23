import { NewsAiService, validateNewsAiResult } from './news-ai.service';
import type { NewsAiProvider } from './news-ai.provider';
import { NewsAiProviderError } from './news-ai.provider';
import { PrismaService } from '../prisma/prisma.service';

const output = {
  summary: 'A tennis player announced a clinic.', category_slug: 'LATEST',
  tags: ['clinic'], players: [], tournaments: [], language: 'en',
  relevance_score: 0.9, confidence: 0.95, risk_flags: [],
};

describe('NewsAiService', () => {
  it('rejects malformed and unapproved provider metadata', () => {
    expect(validateNewsAiResult({ ...output, category_slug: 'UNKNOWN' }, 240, ['LATEST'])).toBeNull();
    expect(validateNewsAiResult({ ...output, confidence: 1.2 }, 240, ['LATEST'])).toBeNull();
    expect(validateNewsAiResult({ ...output, summary: '<script>bad</script>' }, 240, ['LATEST'])).toBeNull();
    expect(validateNewsAiResult(output, 240, ['LATEST'])?.confidence).toBe(0.95);
  });

  it('uses an atomic daily request claim before contacting the provider', async () => {
    const prisma = { newsAiQuotaDay: {
      upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    } };
    const provider = { name: 'mock', model: 'test', configured: true, process: jest.fn() };
    const service = new NewsAiService(prisma as unknown as PrismaService, provider as NewsAiProvider);
    await expect(service.process('Tennis', 'A long enough excerpt', 240, 1, ['LATEST'])).resolves.toBeNull();
    expect(provider.process).not.toHaveBeenCalled();
  });

  it('returns validated metadata and counts provider attempts', async () => {
    const prisma = { newsAiQuotaDay: {
      upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    } };
    const provider = { name: 'mock', model: 'test', configured: true, process: jest.fn().mockResolvedValue(output) };
    const service = new NewsAiService(prisma as unknown as PrismaService, provider as NewsAiProvider);
    await expect(service.process('Tennis', 'A long enough excerpt', 240, 10, ['LATEST']))
      .resolves.toMatchObject({ categorySlug: 'LATEST', confidence: 0.95 });
    expect(prisma.newsAiQuotaDay.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ attempts: { lt: 10 } }),
    }));
  });

  it('fails closed on invalid provider output', async () => {
    const prisma = { newsAiQuotaDay: {
      upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    } };
    const provider = { name: 'mock', model: 'test', configured: true, process: jest.fn().mockResolvedValue({ ...output, risk_flags: 'none' }) };
    const service = new NewsAiService(prisma as unknown as PrismaService, provider as NewsAiProvider);
    await expect(service.process('Tennis', 'A long enough excerpt', 240, 10, ['LATEST']))
      .rejects.toMatchObject({ code: 'INVALID_RESULT' } satisfies Partial<NewsAiProviderError>);
  });

  it('rejects extracted entities absent from the permitted source text', async () => {
    const prisma = { newsAiQuotaDay: { upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const provider = { name: 'mock', model: 'test', configured: true, process: jest.fn().mockResolvedValue({ ...output, players: ['Unmentioned Player'] }) };
    const service = new NewsAiService(prisma as unknown as PrismaService, provider as NewsAiProvider);
    await expect(service.process('Tennis', 'A clinic was announced.', 240, 10, ['LATEST']))
      .rejects.toMatchObject({ code: 'INVALID_RESULT' });
  });

  it('rejects a new numeric claim in an AI summary', async () => {
    const prisma = { newsAiQuotaDay: { upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const provider = { name: 'mock', model: 'test', configured: true,
      process: jest.fn().mockResolvedValue({ ...output, summary: 'A tennis player won 12 titles.' }) };
    const service = new NewsAiService(prisma as unknown as PrismaService, provider as NewsAiProvider);
    await expect(service.process('Tennis', 'A clinic was announced.', 240, 10, ['LATEST']))
      .rejects.toMatchObject({ code: 'INVALID_RESULT' });
  });
});

import { createServer } from 'node:http';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { CvServiceClient } from './cv-service.client';

describe('CV service HTTP transport', () => {
  it('waits for analysis headers beyond the default transport limit', async () => {
    const server = createServer((request, response) => {
      request.resume();
      request.on('end', () => {
        setTimeout(() => {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(
            JSON.stringify({
              video: 'clip.mp4',
              summary: { total_shots: 2 },
              pipeline_version: 'test',
            }),
          );
        }, 250);
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No test port');
    const previous = getGlobalDispatcher();
    const shortGlobalTimeout = new Agent({ headersTimeout: 50 });
    setGlobalDispatcher(shortGlobalTimeout);
    const client = new CvServiceClient({
      get: (key: string) =>
        ({
          CV_SERVICE_URL: `http://127.0.0.1:${address.port}`,
          CV_SERVICE_ANALYSIS_TIMEOUT_MS: '2000',
          CV_SERVICE_SESSION_TIMEOUT_MS: '2000',
        })[key],
    } as never);
    try {
      const response = await (
        client as unknown as {
          fetchWithTimeout: (
            url: string,
            init: RequestInit,
            timeoutMs: number,
          ) => Promise<Response>;
        }
      ).fetchWithTimeout(
        `http://127.0.0.1:${address.port}/analyze`,
        { method: 'POST' },
        2000,
      );
      expect(await response.json()).toEqual({
        video: 'clip.mp4',
        summary: { total_shots: 2 },
        pipeline_version: 'test',
      });
    } finally {
      setGlobalDispatcher(previous);
      await client.onModuleDestroy();
      await shortGlobalTimeout.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

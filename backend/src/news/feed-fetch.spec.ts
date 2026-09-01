import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import {
  assertFeedUrlAllowed,
  fetchFeedXml,
  FeedUrlError,
  isBlockedAddress,
} from './feed-fetch';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '93.184.216.34', '2606:4700:4700::1111'])(
    'allows public address %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    },
  );
});

describe('assertFeedUrlAllowed', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects a non-HTTPS URL', () => {
    expect(() => assertFeedUrlAllowed('http://feeds.example.com/rss')).toThrow(
      FeedUrlError,
    );
  });

  it.each([
    'https://127.0.0.1/rss',
    'https://[::1]/rss',
    'https://10.1.2.3/rss',
    'https://169.254.169.254/rss',
    'https://192.168.0.1/rss',
  ])('rejects blocked IP literal %s', (url) => {
    expect(() => assertFeedUrlAllowed(url)).toThrow(FeedUrlError);
  });

  it('accepts a plain public HTTPS URL', () => {
    expect(assertFeedUrlAllowed('https://feeds.example.com/rss').hostname).toBe(
      'feeds.example.com',
    );
  });

  it('enforces NEWS_FEED_ALLOWED_HOSTS when configured', () => {
    process.env.NEWS_FEED_ALLOWED_HOSTS = 'feeds.good.com, other.good.com';
    expect(() => assertFeedUrlAllowed('https://evil.com/rss')).toThrow(
      /not on NEWS_FEED_ALLOWED_HOSTS/,
    );
    expect(assertFeedUrlAllowed('https://feeds.good.com/rss').hostname).toBe(
      'feeds.good.com',
    );
  });
});

describe('fetchFeedXml', () => {
  const XML = '<rss><channel><title>Feed</title></channel></rss>';
  const originalEnv = { ...process.env };
  let server: Server;
  let base: string;
  let handler: (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
  ) => void;

  beforeAll((done) => {
    server = createServer((req, res) => handler(req, res));
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      base = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    process.env.NEWS_FEED_ALLOW_INSECURE = 'true';
    handler = (_req, res) => {
      res.setHeader('content-type', 'application/rss+xml');
      res.end(XML);
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // The blocklist override lets the local 127.0.0.1 server stand in for a
  // public host; every other guard (redirect revalidation, size, timeout,
  // status) is still exercised for real.
  const allowLocal = { blocklist: () => false };

  it('fetches feed XML from an allowed host', async () => {
    await expect(fetchFeedXml(`${base}/rss`, allowLocal)).resolves.toBe(XML);
  });

  it('rejects a host that resolves to a loopback address', async () => {
    // Real DNS + real blocklist: localhost resolves to 127.0.0.1 / ::1.
    await expect(fetchFeedXml('https://localhost/rss')).rejects.toThrow(
      /non-public address/,
    );
  });

  it('follows a redirect to another allowed location', async () => {
    handler = (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { location: `${base}/final` });
        res.end();
        return;
      }
      res.end(XML);
    };
    await expect(fetchFeedXml(`${base}/start`, allowLocal)).resolves.toBe(XML);
  });

  it('re-validates the redirect target and rejects a bad scheme', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { location: 'ftp://example.com/rss' });
      res.end();
    };
    await expect(fetchFeedXml(`${base}/start`, allowLocal)).rejects.toThrow(
      /must use HTTPS/,
    );
  });

  it('rejects a redirect loop past the cap', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { location: `${base}/loop` });
      res.end();
    };
    await expect(
      fetchFeedXml(`${base}/loop`, { ...allowLocal, maxRedirects: 2 }),
    ).rejects.toThrow(/exceeded 2 redirects/);
  });

  it('rejects an oversized response', async () => {
    handler = (_req, res) => {
      res.end('x'.repeat(4096));
    };
    await expect(
      fetchFeedXml(`${base}/big`, { ...allowLocal, maxResponseBytes: 1024 }),
    ).rejects.toThrow(/exceeded 1024 bytes/);
  });

  it('rejects a slow response past the timeout', async () => {
    handler = () => {
      /* never responds */
    };
    await expect(
      fetchFeedXml(`${base}/slow`, { ...allowLocal, timeoutMs: 150 }),
    ).rejects.toThrow(/timed out/);
  });

  it('rejects a non-2xx status', async () => {
    handler = (_req, res) => {
      res.writeHead(500);
      res.end('nope');
    };
    await expect(fetchFeedXml(`${base}/err`, allowLocal)).rejects.toThrow(
      /HTTP 500/,
    );
  });
});

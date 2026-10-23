import { safePublisherUrl } from './news-rights';

describe('safePublisherUrl', () => {
  it.each([
    'https://publisher.example/story',
    'https://www.bbc.co.uk/sport/tennis/articles/123',
  ])('accepts public HTTPS article URLs: %s', (url) => {
    expect(safePublisherUrl(url)).toBe(true);
  });

  it.each([
    'http://publisher.example/story',
    'https://127.0.0.1/private',
    'https://[::1]/private',
    'https://localhost/private',
    'https://inside.local/private',
    'https://user:pass@publisher.example/story',
    'javascript:alert(1)',
    'not a url',
  ])('rejects unsafe article URLs: %s', (url) => {
    expect(safePublisherUrl(url)).toBe(false);
  });
});

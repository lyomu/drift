import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { get as httpGet, type IncomingMessage } from 'node:http';
import { get as httpsGet } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

/**
 * SSRF-hardened feed fetcher for the news ingestion worker.
 *
 * `rss-parser`'s own `parseURL` fetches an admin-supplied URL with no protocol,
 * host, IP, redirect, or size constraints — OWASP A10 in `SECURITY_REVIEW.md`.
 * This module fetches the XML ourselves under a strict policy and hands the raw
 * body to `parser.parseString`:
 *
 *   - HTTPS only (an `http:` escape hatch exists for local development only).
 *   - Optional host allowlist via `NEWS_FEED_ALLOWED_HOSTS`.
 *   - Every DNS result is checked against private/loopback/link-local ranges
 *     (IPv4 and IPv6), and the socket is pinned to the vetted address via the
 *     `lookup` hook so there is no second resolution to rebind.
 *   - Redirects are followed manually, capped, and re-validated at every hop.
 *   - Response size and total time are bounded.
 *
 * Network-egress firewall rules remain a separate infrastructure control.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const USER_AGENT = 'DriftTennisNewsBot/1.0 (+https://drift.tennis)';

export class FeedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedUrlError';
  }
}

type Blocklist = (ip: string) => boolean;

export interface FetchFeedOptions {
  /** Override the address blocklist. Test-only; production uses the default. */
  blocklist?: Blocklist;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
}

// ------------------------------------------------------------- address policy

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // multicast, reserved, and 255.255.255.255
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  const mapped = /^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (mapped) return isBlockedIpv4(mapped[1]);
  if (addr === '::' || addr === '::1') return true; // unspecified, loopback
  const firstHextet = parseInt(addr.split(':')[0] || '0', 16);
  if (!Number.isNaN(firstHextet)) {
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  }
  return false;
}

/**
 * True when `ip` (a bare IPv4 or IPv6 literal) is in a range that must never be
 * reachable from feed ingestion. Anything that is not a recognisable public
 * address is treated as blocked.
 */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

export function allowedFeedHosts(): string[] | null {
  const raw = process.env.NEWS_FEED_ALLOWED_HOSTS;
  if (!raw) return null;
  const hosts = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : null;
}

/**
 * Synchronous, DNS-free policy check on a feed URL's shape. Throws
 * {@link FeedUrlError} when the URL is malformed, non-HTTPS, points at a blocked
 * IP literal, or is off the configured host allowlist. Returns the parsed URL.
 */
export function assertFeedUrlAllowed(
  rawUrl: string,
  blocklist: Blocklist = isBlockedAddress,
): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FeedUrlError(`Invalid feed URL: ${rawUrl}`);
  }

  const insecureOk =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEWS_FEED_ALLOW_INSECURE === 'true';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && insecureOk)) {
    throw new FeedUrlError(`Feed URL must use HTTPS: ${rawUrl}`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (!host) {
    throw new FeedUrlError(`Feed URL has no host: ${rawUrl}`);
  }
  if (isIP(host) !== 0 && blocklist(host)) {
    throw new FeedUrlError(`Feed URL host is not a public address: ${rawUrl}`);
  }

  const allow = allowedFeedHosts();
  if (allow && !allow.includes(host)) {
    throw new FeedUrlError(
      `Feed host "${host}" is not on NEWS_FEED_ALLOWED_HOSTS.`,
    );
  }

  return url;
}

// ------------------------------------------------------------------ fetching

function validatingLookup(blocklist: Blocklist): LookupFunction {
  return (hostname, options, callback) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) {
        callback(err, '', 0);
        return;
      }
      const list = (addresses as LookupAddress[] | undefined) ?? [];
      if (list.length === 0) {
        callback(
          new FeedUrlError(`DNS returned no records for ${hostname}`),
          '',
          0,
        );
        return;
      }
      for (const entry of list) {
        if (blocklist(entry.address)) {
          callback(
            new FeedUrlError(
              `${hostname} resolves to a non-public address (${entry.address})`,
            ),
            '',
            0,
          );
          return;
        }
      }
      const chosen = list[0];
      if (
        options &&
        typeof options === 'object' &&
        (options as { all?: boolean }).all
      ) {
        callback(null, [chosen], chosen.family);
        return;
      }
      callback(null, chosen.address, chosen.family);
    });
  };
}

interface SingleFetchResult {
  status: number;
  location?: string;
  body?: string;
}

function fetchOnce(
  url: URL,
  blocklist: Blocklist,
  timeoutMs: number,
  maxResponseBytes: number,
): Promise<SingleFetchResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const done = (result: SingleFetchResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const requestOptions = {
      lookup: validatingLookup(blocklist),
      timeout: timeoutMs,
      headers: {
        'user-agent': USER_AGENT,
        accept:
          'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8',
        'accept-encoding': 'identity',
      },
    };

    const onResponse = (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        res.resume();
        done({ status, location: res.headers.location });
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        fail(new FeedUrlError(`Feed responded with HTTP ${status}`));
        return;
      }

      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxResponseBytes) {
          res.destroy();
          fail(
            new FeedUrlError(
              `Feed response exceeded ${maxResponseBytes} bytes`,
            ),
          );
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        done({ status, body: Buffer.concat(chunks).toString('utf8') });
      });
      res.on('error', fail);
    };

    const req =
      url.protocol === 'https:'
        ? httpsGet(url, requestOptions, onResponse)
        : httpGet(url, requestOptions, onResponse);

    req.on('timeout', () => {
      req.destroy(
        new FeedUrlError(`Feed request timed out after ${timeoutMs}ms`),
      );
    });
    req.on('error', fail);
  });
}

/**
 * Fetch a feed's raw XML under the SSRF policy. Rejects with
 * {@link FeedUrlError} on any policy violation, redirect overflow, oversized
 * body, timeout, or non-2xx status.
 */
export async function fetchFeedXml(
  rawUrl: string,
  options: FetchFeedOptions = {},
): Promise<string> {
  const blocklist = options.blocklist ?? isBlockedAddress;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes =
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let current = assertFeedUrlAllowed(rawUrl, blocklist);

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const result = await fetchOnce(
      current,
      blocklist,
      timeoutMs,
      maxResponseBytes,
    );
    if (result.body !== undefined) {
      return result.body;
    }
    if (!result.location) {
      throw new FeedUrlError(
        `Feed redirect (HTTP ${result.status}) had no Location header`,
      );
    }
    const next = new URL(result.location, current);
    current = assertFeedUrlAllowed(next.toString(), blocklist);
  }

  throw new FeedUrlError(`Feed exceeded ${maxRedirects} redirects`);
}

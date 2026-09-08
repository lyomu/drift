/**
 * Same-origin proxy for waitlist signups.
 *
 * WHY A PROXY AT ALL: the browser posting straight to the API host would be a
 * cross-origin request, which means widening `connect-src` and `form-action`
 * in `next.config.ts` and adding the website's origin to the API's
 * `CORS_ALLOWED_ORIGINS`. Going through this handler keeps both at 'self' —
 * the page's only network call is to its own origin, and the hop to NestJS
 * happens server-side where neither CSP nor CORS applies.
 *
 * WHY `API_URL` AND NOT `NEXT_PUBLIC_API_URL`: this value is only ever read
 * on the server, so it stays a runtime variable. `NEXT_PUBLIC_*` is inlined
 * at build time (see `release.yml`), which binds an image to one
 * environment — the trap club-admin and platform-admin are already in.
 */

const API_URL = process.env.API_URL ?? "http://localhost:3009";

/** Mirrors the API's DTO. Anything else is rejected before the hop. */
const AUDIENCES = new Set(["PLAYER", "CLUB"]);

/**
 * Per-client rate limiting has to happen HERE, not on the API.
 *
 * Because every submission is proxied, the API sees this server's address for
 * all of them and cannot tell two people apart — its throttle is only a
 * global abuse backstop. This handler is the last layer that still knows who
 * is calling, so it carries the real limit.
 *
 * It matters more than a typical form: a successful signup causes an email to
 * be sent to an address the submitter chose, so an unthrottled endpoint is a
 * mail amplifier pointed at strangers.
 *
 * In-memory and therefore per-instance: the website runs as a single
 * container today, and a shared store is not worth adding for a marketing
 * form. If it is ever scaled horizontally this becomes "N attempts per
 * instance" and should move to a real store.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  // nginx sets X-Forwarded-For in front of this app; the left-most entry is
  // the original client. Falls back to a single shared bucket rather than
  // failing open, so a missing header cannot disable the limit entirely.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(request: Request): boolean {
  const key = clientKey(request);
  const now = Date.now();

  // Opportunistic sweep — without it the map grows for the life of the
  // process, one entry per address ever seen.
  if (attempts.size > 10_000) {
    for (const [entryKey, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(entryKey);
    }
  }

  const existing = attempts.get(key);
  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > MAX_PER_WINDOW;
}

function bad(message: string, status = 400) {
  return Response.json({ message }, { status });
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return bad("That's a few tries in a row. Give it a few minutes.", 429);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bad("Send a JSON body.");
  }

  if (typeof payload !== "object" || payload === null) {
    return bad("Send a JSON body.");
  }

  const { firstName, email, audience, country, city, level } = payload as Record<
    string,
    unknown
  >;

  if (typeof firstName !== "string" || !firstName.trim()) {
    return bad("Tell us your first name so we know what to call you.");
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad("Enter an email address we can reach you at.");
  }
  if (typeof audience !== "string" || !AUDIENCES.has(audience)) {
    return bad("Tell us whether you're a player or a club.");
  }
  if (country !== undefined && typeof country !== "string") {
    return bad("Country must be text.");
  }
  if (city !== undefined && typeof city !== "string") {
    return bad("City must be text.");
  }
  if (level !== undefined && typeof level !== "string") {
    return bad("Level must be text.");
  }

  try {
    const upstream = await fetch(`${API_URL}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        email,
        audience,
        ...(country ? { country } : {}),
        ...(city ? { city } : {}),
        ...(level ? { level } : {}),
        source: "website",
      }),
      // The API is rate-limited and fast; a hung upstream must not hold a
      // request open long enough to tie up the node process.
      signal: AbortSignal.timeout(10_000),
    });

    if (upstream.status === 429) {
      return bad("That's a few tries in a row. Give it a minute.", 429);
    }

    if (!upstream.ok) {
      // Upstream validation messages are not surfaced verbatim: they are
      // written for API consumers, not for someone filling in this form.
      console.error(
        `Waitlist upstream responded ${upstream.status}: ${await upstream
          .text()
          .catch(() => "<unreadable>")}`,
      );
      return bad("We couldn't add you just now. Try again shortly.", 502);
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (caught) {
    console.error("Waitlist upstream unreachable:", caught);
    return bad("We couldn't add you just now. Try again shortly.", 502);
  }
}

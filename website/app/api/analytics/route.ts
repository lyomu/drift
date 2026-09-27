/**
 * Serves the analytics configuration to the browser at request time.
 *
 * WHY THIS EXISTS RATHER THAN PROPS FROM THE LAYOUT: every page on this site is
 * statically prerendered (`●` in the build output). A server component that
 * reads `process.env` is therefore evaluated at BUILD time, which bakes the
 * keys into the HTML and binds the image to one environment — the exact trap
 * `NEXT_PUBLIC_*` sets, and the one documented at the top of
 * `app/api/waitlist/route.ts`. Forcing the layouts dynamic to dodge it would
 * cost the whole site its static rendering, which is a bad trade for a
 * marketing page.
 *
 * A dynamic route handler keeps both: the pages stay static, and the keys are
 * read per request, so the same image runs in staging and production with
 * different keys and a key can be added by restarting the container.
 *
 * These values are public by design — they identify a project to its vendor and
 * ship to every browser either way. Nothing secret goes through here.
 */
import { analyticsConfig } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(analyticsConfig(), {
    // Must not be cached: a key added on the box has to take effect on the
    // next request, not whenever an intermediary decides to revalidate.
    headers: { "Cache-Control": "no-store" },
  });
}

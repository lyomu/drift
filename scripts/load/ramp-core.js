import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL, authHeaders, login } from "./lib/session.js";

/**
 * The always-available ramp: liveness plus one authenticated, database-backed
 * read.
 *
 * `ramp.js` is the profile that matters, because the home feed fans out to
 * several contributors and is the expensive request. It needs an account that
 * has completed onboarding. This one needs only an account that can log in, so
 * it still produces a capacity number on an environment where no fully
 * onboarded player exists — which is exactly the state staging was found in on
 * 2026-09-03.
 *
 * Splitting the two endpoints into their own trends is the point of the file:
 *   /health      → nginx + Node, no database
 *   /players/me  → nginx + Node + JWT verify + a Postgres read
 * The gap between them is the database's contribution, and it is the part that
 * degrades first when Postgres is squeezed into 768 MB alongside everything
 * else on the same host.
 */
const healthDuration = new Trend("drift_health_duration", true);
const profileDuration = new Trend("drift_profile_duration", true);

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "45s", target: 10 },
        { duration: "60s", target: 25 },
        { duration: "60s", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    drift_profile_duration: ["p(95)<1500"],
  },
};

export function setup() {
  // One login for the whole run: the auth throttle is 10/min per IP and would
  // otherwise be the only thing this measures. See lib/session.js.
  return login();
}

export default function (data) {
  const auth = authHeaders(data.token);

  const health = http.get(`${BASE_URL}/health`, { tags: { name: "health" } });
  healthDuration.add(health.timings.duration);
  check(health, { "health ok": (r) => r.status === 200 });

  const profile = http.get(`${BASE_URL}/players/me`, {
    ...auth,
    tags: { name: "players/me" },
  });
  profileDuration.add(profile.timings.duration);
  check(profile, {
    "profile ok": (r) => r.status === 200,
    // Separated from the failure rate so a rate-limited run is legible as a
    // limiter result rather than as the server falling over.
    "not rate limited": (r) => r.status !== 429,
  });

  sleep(1);
}

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL, authHeaders, login } from "./lib/session.js";

/**
 * Where does one 3.7 GB host stop coping?
 *
 * That box runs Postgres, Redis, the API and two Next apps together, with a
 * 1 GB cap on the API container and 768 MB on Postgres. The interesting number
 * is not requests per second in the abstract — it is the concurrency at which
 * p95 latency leaves the acceptable band, because that is the number that says
 * whether the launch cohort fits.
 *
 * The thresholds below are a pass/fail statement, not decoration: a run that
 * breaches them has found the ceiling, and k6 exits non-zero to say so.
 */
const feedDuration = new Trend("drift_home_feed_duration", true);
const searchDuration = new Trend("drift_player_search_duration", true);

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 10 },
        { duration: "2m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    // Under 1% failures. Above that the box is shedding real users, not
    // merely running warm.
    http_req_failed: ["rate<0.01"],
    // p95 under 1.5s end to end. Chosen against the mobile app's own feel:
    // the home feed is the first screen after launch, and past roughly this
    // point it reads as broken rather than slow.
    http_req_duration: ["p(95)<1500"],
    drift_home_feed_duration: ["p(95)<2000"],
    drift_player_search_duration: ["p(95)<1500"],
  },
};

export function setup() {
  // One login for the whole run — see lib/session.js. The auth throttle is
  // 10/min per IP and would otherwise dominate the results.
  return login();
}

export default function (data) {
  const auth = authHeaders(data.token);

  const feed = http.get(`${BASE_URL}/home/feed`, {
    ...auth,
    tags: { name: "home/feed" },
  });
  feedDuration.add(feed.timings.duration);
  check(feed, { "feed ok": (r) => r.status === 200 });

  const search = http.get(`${BASE_URL}/players`, {
    ...auth,
    tags: { name: "players/search" },
  });
  searchDuration.add(search.timings.duration);
  check(search, { "search ok": (r) => r.status === 200 });

  const summary = http.get(`${BASE_URL}/home/summary`, {
    ...auth,
    tags: { name: "home/summary" },
  });
  check(summary, { "summary ok": (r) => r.status === 200 });

  // Real users read a screen before tapping the next one. Without this the
  // test measures how fast k6 can loop, which no user will ever reproduce.
  sleep(1);
}

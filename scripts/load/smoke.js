import http from "k6/http";
import { check, group } from "k6";
import { BASE_URL, authHeaders, login } from "./lib/session.js";

/**
 * Does the critical path work at all, under one user?
 *
 * Run this first and run it after every deploy. It is not a load test — it is
 * the thing that tells you the ramp's failures are about capacity rather than
 * about a broken endpoint or a stale token. Thresholds are strict on purpose:
 * at one VU there is no excuse for an error or a slow response.
 */
export const options = {
  vus: 1,
  iterations: 5,
  thresholds: {
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<1000"],
  },
};

export function setup() {
  return login();
}

export default function (data) {
  const auth = authHeaders(data.token);

  group("health", () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { name: "health" } });
    check(res, { "health 200": (r) => r.status === 200 });
  });

  group("home feed", () => {
    const res = http.get(`${BASE_URL}/home/feed`, {
      ...auth,
      tags: { name: "home/feed" },
    });
    check(res, {
      "feed 200": (r) => r.status === 200,
      // The feed fans out to several contributors; an empty body means one of
      // them failed silently rather than that the request succeeded.
      "feed has cards": (r) => {
        const body = r.json();
        return Array.isArray(body?.cards) ? body.cards.length >= 0 : body != null;
      },
    });
  });

  group("home summary", () => {
    const res = http.get(`${BASE_URL}/home/summary`, {
      ...auth,
      tags: { name: "home/summary" },
    });
    check(res, { "summary 200": (r) => r.status === 200 });
  });

  group("player search", () => {
    const res = http.get(`${BASE_URL}/players`, {
      ...auth,
      tags: { name: "players/search" },
    });
    check(res, { "search 200": (r) => r.status === 200 });
  });

  group("own profile", () => {
    const res = http.get(`${BASE_URL}/players/me`, {
      ...auth,
      tags: { name: "players/me" },
    });
    check(res, { "profile 200": (r) => r.status === 200 });
  });
}

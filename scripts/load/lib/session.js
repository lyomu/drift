import http from "k6/http";
import { fail } from "k6";

export const BASE_URL = (__ENV.DRIFT_BASE_URL || "http://localhost:3009").replace(
  /\/+$/,
  "",
);

/**
 * Log in once and share the token with every VU.
 *
 * This is not an optimisation. `POST /auth/login` carries a per-IP throttle of
 * **10 requests per minute** (`AUTH_SENSITIVE` in auth.controller.ts), so a test
 * where each VU logs in measures the rate limiter and nothing else — the graph
 * looks like a catastrophic failure at 11 VUs and tells you nothing about the
 * API. Run this from k6's `setup()`, which executes exactly once.
 */
export function login() {
  const email = __ENV.DRIFT_LOAD_EMAIL;
  const password = __ENV.DRIFT_LOAD_PASSWORD;
  if (!email || !password) {
    fail(
      "Set DRIFT_LOAD_EMAIL and DRIFT_LOAD_PASSWORD to an account that has completed onboarding.",
    );
  }

  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } },
  );

  if (response.status !== 200) {
    fail(`login failed: ${response.status} ${response.body}`);
  }
  const token = response.json("accessToken");
  if (!token) fail("login returned no accessToken");
  return { token };
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

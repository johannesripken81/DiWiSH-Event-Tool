import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkLoginRateLimit,
  checkLoginRateLimits,
  createLoginRateLimitBuckets,
  recordFailedLogin,
  recordFailedLoginForBuckets,
} from "@/lib/login-rate-limit";

describe("login rate limit", () => {
  it("blocks a repeated failing identity across source addresses", () => {
    const identifier = `person-${Date.now()}@example.org`;

    for (let index = 0; index < 5; index += 1) {
      const buckets = createLoginRateLimitBuckets(
        identifier,
        `192.0.2.${index}`,
      );
      const identityBucket = buckets.find((bucket) =>
        bucket.key.startsWith("identity:"),
      );

      assert.ok(identityBucket);
      recordFailedLogin(identityBucket);
    }

    assert.equal(
      checkLoginRateLimits(
        createLoginRateLimitBuckets(identifier, "198.51.100.1"),
      ).allowed,
      false,
    );
  });

  it("blocks a noisy source address with many different identities", () => {
    const ipAddress = `203.0.113.${Date.now()}`;
    const firstBuckets = createLoginRateLimitBuckets(
      "first@example.org",
      ipAddress,
    );
    const ipBucket = firstBuckets.find((bucket) =>
      bucket.key.startsWith("ip:"),
    );

    assert.ok(ipBucket);

    for (let index = 0; index < 25; index += 1) {
      recordFailedLogin(ipBucket);
    }

    assert.equal(checkLoginRateLimit(ipBucket).allowed, false);
  });

  it("records all buckets for a failed login", () => {
    const buckets = createLoginRateLimitBuckets(
      `all-${Date.now()}@example.org`,
      "192.0.2.200",
    );

    recordFailedLoginForBuckets(buckets);

    for (const bucket of buckets) {
      assert.equal(checkLoginRateLimit(bucket).allowed, true);
    }
  });
});

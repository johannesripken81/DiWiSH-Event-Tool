import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCronRequestAuthorized } from "@/lib/cron-auth";

function requestWithAuthorization(value?: string) {
  return {
    headers: new Headers(value ? { authorization: value } : undefined),
  };
}

describe("cron auth", () => {
  it("requires the bearer secret when CRON_SECRET is configured", () => {
    const env = { CRON_SECRET: "secret-value", NODE_ENV: "production" };

    assert.equal(
      isCronRequestAuthorized(
        requestWithAuthorization("Bearer secret-value"),
        env,
      ),
      true,
    );
    assert.equal(
      isCronRequestAuthorized(requestWithAuthorization("Bearer wrong"), env),
      false,
    );
  });

  it("does not trust the Vercel cron user-agent by itself", () => {
    const request = {
      headers: new Headers({
        "user-agent": "vercel-cron/1.0",
      }),
    };

    assert.equal(
      isCronRequestAuthorized(request, {
        CRON_SECRET: "secret-value",
        NODE_ENV: "production",
      }),
      false,
    );
  });

  it("denies production cron calls without a configured secret", () => {
    assert.equal(
      isCronRequestAuthorized(requestWithAuthorization(), {
        CRON_SECRET: "",
        NODE_ENV: "production",
      }),
      false,
    );
  });

  it("allows local development without a secret", () => {
    assert.equal(
      isCronRequestAuthorized(requestWithAuthorization(), {
        CRON_SECRET: "",
        NODE_ENV: "development",
      }),
      true,
    );
  });
});

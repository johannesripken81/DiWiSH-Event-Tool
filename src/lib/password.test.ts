import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hashPassword,
  isPasswordLongEnough,
  verifyPassword,
} from "@/lib/password";

describe("password hashing", () => {
  it("verifies a matching password", () => {
    const hash = hashPassword("sicheres-passwort-2026");

    assert.equal(verifyPassword("sicheres-passwort-2026", hash), true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("sicheres-passwort-2026");

    assert.equal(verifyPassword("anderes-passwort", hash), false);
  });

  it("requires at least 10 characters", () => {
    assert.equal(isPasswordLongEnough("kurz"), false);
    assert.equal(isPasswordLongEnough("lang-genug"), true);
  });
});

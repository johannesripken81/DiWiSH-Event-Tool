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

  it("rejects malformed or unexpected hashes", () => {
    const hash = hashPassword("sicheres-passwort-2026");
    const tooExpensiveHash = hash.replace(
      "scrypt$16384$8$1$",
      "scrypt$1048576$8$1$",
    );

    assert.equal(verifyPassword("sicheres-passwort-2026", "not-a-hash"), false);
    assert.equal(
      verifyPassword("sicheres-passwort-2026", tooExpensiveHash),
      false,
    );
  });

  it("requires at least 10 characters", () => {
    assert.equal(isPasswordLongEnough("kurz"), false);
    assert.equal(isPasswordLongEnough("lang-genug"), true);
  });
});

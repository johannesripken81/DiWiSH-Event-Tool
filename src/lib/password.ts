import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const algorithm = "scrypt";
const keyLength = 64;
const scryptOptions = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

export const minimumPasswordLength = 10;

export function isPasswordLongEnough(password: string) {
  return password.trim().length >= minimumPasswordLength;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = scryptSync(password, salt, keyLength, scryptOptions);

  return [
    algorithm,
    String(scryptOptions.N),
    String(scryptOptions.r),
    String(scryptOptions.p),
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [storedAlgorithm, n, r, p, salt, hash] = storedHash.split("$");

  if (storedAlgorithm !== algorithm || !n || !r || !p || !salt || !hash) {
    return false;
  }

  const parsedOptions = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  };

  if (
    parsedOptions.N !== scryptOptions.N ||
    parsedOptions.r !== scryptOptions.r ||
    parsedOptions.p !== scryptOptions.p
  ) {
    return false;
  }

  const expectedKey = Buffer.from(hash, "base64url");

  if (expectedKey.length !== keyLength) {
    return false;
  }

  let derivedKey: Buffer;

  try {
    derivedKey = scryptSync(password, salt, keyLength, {
      ...parsedOptions,
      maxmem: scryptOptions.maxmem,
    });
  } catch {
    return false;
  }

  return (
    expectedKey.length === derivedKey.length &&
    timingSafeEqual(expectedKey, derivedKey)
  );
}

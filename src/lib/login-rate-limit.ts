const windowMs = 15 * 60 * 1000;
const maxFailedAttempts = 5;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const globalForLoginRateLimit = globalThis as unknown as {
  loginAttempts?: Map<string, LoginAttempt>;
};

function getAttempts() {
  if (!globalForLoginRateLimit.loginAttempts) {
    globalForLoginRateLimit.loginAttempts = new Map();
  }

  return globalForLoginRateLimit.loginAttempts;
}

function getNow() {
  return Date.now();
}

function pruneExpiredAttempts(now = getNow()) {
  const attempts = getAttempts();

  for (const [key, attempt] of attempts) {
    const expiry = attempt.blockedUntil ?? attempt.firstAttemptAt + windowMs;

    if (expiry <= now) {
      attempts.delete(key);
    }
  }
}

export function createLoginRateLimitKey(identifier: string, ipAddress: string) {
  return `${ipAddress.trim() || "unknown"}:${identifier.trim().toLowerCase()}`;
}

export function checkLoginRateLimit(key: string) {
  const now = getNow();
  pruneExpiredAttempts(now);

  const attempt = getAttempts().get(key);

  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((attempt.blockedUntil - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string) {
  const now = getNow();
  const attempts = getAttempts();
  const existing = attempts.get(key);
  const attempt =
    existing && existing.firstAttemptAt + windowMs > now
      ? existing
      : { count: 0, firstAttemptAt: now, blockedUntil: null };

  attempt.count += 1;

  if (attempt.count >= maxFailedAttempts) {
    attempt.blockedUntil = now + windowMs;
  }

  attempts.set(key, attempt);
}

export function clearLoginRateLimit(key: string) {
  getAttempts().delete(key);
}

const windowMs = 15 * 60 * 1000;
const maxFailedAttemptsPerIdentity = 5;
const maxFailedAttemptsPerIp = 25;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

export type LoginRateLimitBucket = {
  key: string;
  maxFailedAttempts: number;
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

export function createLoginRateLimitBuckets(
  identifier: string,
  ipAddress: string,
): LoginRateLimitBucket[] {
  const normalizedIpAddress = ipAddress.trim() || "unknown";
  const normalizedIdentifier = identifier.trim().toLowerCase() || "unknown";

  return [
    {
      key: `identity:${normalizedIdentifier}`,
      maxFailedAttempts: maxFailedAttemptsPerIdentity,
    },
    {
      key: `ip:${normalizedIpAddress}`,
      maxFailedAttempts: maxFailedAttemptsPerIp,
    },
    {
      key: `pair:${createLoginRateLimitKey(identifier, ipAddress)}`,
      maxFailedAttempts: maxFailedAttemptsPerIdentity,
    },
  ];
}

export function checkLoginRateLimit(bucket: LoginRateLimitBucket) {
  const now = getNow();
  pruneExpiredAttempts(now);

  const attempt = getAttempts().get(bucket.key);

  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((attempt.blockedUntil - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function checkLoginRateLimits(buckets: LoginRateLimitBucket[]) {
  return buckets.reduce(
    (result, bucket) => {
      const bucketResult = checkLoginRateLimit(bucket);

      if (bucketResult.allowed) {
        return result;
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          result.retryAfterSeconds,
          bucketResult.retryAfterSeconds,
        ),
      };
    },
    { allowed: true, retryAfterSeconds: 0 },
  );
}

export function recordFailedLogin(bucket: LoginRateLimitBucket) {
  const now = getNow();
  const attempts = getAttempts();
  const existing = attempts.get(bucket.key);
  const attempt =
    existing && existing.firstAttemptAt + windowMs > now
      ? existing
      : { count: 0, firstAttemptAt: now, blockedUntil: null };

  attempt.count += 1;

  if (attempt.count >= bucket.maxFailedAttempts) {
    attempt.blockedUntil = now + windowMs;
  }

  attempts.set(bucket.key, attempt);
}

export function recordFailedLoginForBuckets(buckets: LoginRateLimitBucket[]) {
  for (const bucket of buckets) {
    recordFailedLogin(bucket);
  }
}

export function clearLoginRateLimit(bucket: LoginRateLimitBucket) {
  getAttempts().delete(bucket.key);
}

export function clearLoginRateLimitBuckets(buckets: LoginRateLimitBucket[]) {
  for (const bucket of buckets) {
    clearLoginRateLimit(bucket);
  }
}

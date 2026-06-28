import { timingSafeEqual } from "node:crypto";

type CronAuthEnv = {
  CRON_SECRET?: string;
  NODE_ENV?: string;
};

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

export function isCronRequestAuthorized(
  request: Pick<Request, "headers">,
  env: CronAuthEnv = process.env,
) {
  const secret = env.CRON_SECRET?.trim();

  if (!secret) {
    return env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerPrefix = "Bearer ";

  if (!authorization.startsWith(bearerPrefix)) {
    return false;
  }

  return safeEqual(authorization.slice(bearerPrefix.length).trim(), secret);
}

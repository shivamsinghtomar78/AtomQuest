const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, AttemptBucket>();

function now() {
  return Date.now();
}

function getBucket(ipAddress: string) {
  const current = now();
  const existing = buckets.get(ipAddress);

  if (!existing || existing.resetAt <= current) {
    const fresh = { count: 0, resetAt: current + WINDOW_MS };
    buckets.set(ipAddress, fresh);
    return fresh;
  }

  return existing;
}

export function getAuthClientInfo(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return {
    ipAddress,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}

export function isRateLimited(ipAddress: string) {
  return getBucket(ipAddress).count >= MAX_ATTEMPTS;
}

export function registerFailedAttempt(ipAddress: string) {
  const bucket = getBucket(ipAddress);
  bucket.count += 1;
}

export function registerSuccessfulAttempt(ipAddress: string) {
  buckets.delete(ipAddress);
}

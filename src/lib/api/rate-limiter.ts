// HumenAI — Rate limiter for channel API quota management
// Prevents channel bans by enforcing per-channel rate limits

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, RateLimitEntry>();

export class RateLimiter {
  private key: string;
  private maxRequests: number;
  private windowMs: number;

  constructor(channelType: string, maxRequestsPerMinute: number) {
    this.key = channelType;
    this.maxRequests = maxRequestsPerMinute;
    this.windowMs = 60_000; // 1 minute window
  }

  /**
   * Check if a request is allowed under the current rate limit.
   * Returns true if allowed, false if rate limited.
   */
  allow(): boolean {
    const now = Date.now();
    const entry = stores.get(this.key);

    if (!entry || now > entry.resetAt) {
      // New window
      stores.set(this.key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false; // Rate limited
    }

    entry.count++;
    return true;
  }

  /**
   * Get current usage stats
   */
  getStats(): { used: number; limit: number; remaining: number; resetsInMs: number } {
    const entry = stores.get(this.key);
    if (!entry) {
      return { used: 0, limit: this.maxRequests, remaining: this.maxRequests, resetsInMs: this.windowMs };
    }
    return {
      used: entry.count,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetsInMs: Math.max(0, entry.resetAt - Date.now()),
    };
  }
}

// Singleton rate limiters per channel type
const limiters = new Map<string, RateLimiter>();

export function getRateLimiter(channelType: string, maxPerMinute = 60): RateLimiter {
  if (!limiters.has(channelType)) {
    limiters.set(channelType, new RateLimiter(channelType, maxPerMinute));
  }
  return limiters.get(channelType)!;
}

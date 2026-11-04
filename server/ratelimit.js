export class RateLimiter {
  constructor(capacity, refillPerSecond) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.buckets = new Map();
  }
  allow(key, now = Date.now(), cost = 1) {
    const b = this.buckets.get(key) || { tokens: this.capacity, at: now };
    b.tokens = Math.min(this.capacity, b.tokens + Math.max(0, now - b.at) / 1000 * this.refillPerSecond);
    b.at = now;
    const allowed = b.tokens >= cost;
    if (allowed) b.tokens -= cost;
    this.buckets.set(key, b);
    return allowed;
  }
  delete(key) { this.buckets.delete(key); }
}

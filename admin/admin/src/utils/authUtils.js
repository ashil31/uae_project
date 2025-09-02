import { RateLimiter } from 'limiter';

export const rateLimiter = {
  limiters: new Map(),
  resetTimers: new Map(), // Stores timeout references

  async check(email, maxAttempts) {
    // Clear existing timer if present
    if (this.resetTimers.has(email)) {
      clearTimeout(this.resetTimers.get(email));
    }

    if (!this.limiters.has(email)) {
      this.limiters.set(email, new RateLimiter({
        tokensPerInterval: maxAttempts,
        interval: 'minute'
      }));
    }

    const limiter = this.limiters.get(email);
    const remaining = await limiter.removeTokens(1);
    
    if (remaining < 0) {
      // Set 60-second cooldown
      this.resetTimers.set(email, setTimeout(() => {
        this.limiters.delete(email);
        this.resetTimers.delete(email);
      }, 60000));
      
      throw { 
        message: 'Too many attempts', 
        retryAfter: 60,
        isRateLimit: true 
      };
    }

    return { remaining };
  }
};
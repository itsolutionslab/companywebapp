type RateLimitStore = {
    [key: string]: {
        count: number;
        resetTime: number;
    };
};

const store: RateLimitStore = {};

/**
 * Simple memory-based rate limiter.
 * Note: In serverless environments (like Vercel), this is per-instance.
 * For global rate limiting, a persistent store like Redis would be needed.
 */
export function rateLimit(ip: string, limit: number = 5, windowMs: number = 60 * 60 * 1000) {
    const now = Date.now();

    if (!store[ip]) {
        store[ip] = {
            count: 1,
            resetTime: now + windowMs,
        };
        return { success: true, remaining: limit - 1 };
    }

    const record = store[ip];

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0 };
    }

    record.count += 1;
    return { success: true, remaining: limit - record.count };
}

// Cleanup expired records periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        Object.keys(store).forEach((ip) => {
            if (now > store[ip].resetTime) {
                delete store[ip];
            }
        });
    }, 5 * 60 * 1000); // Every 5 minutes
}

import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth attempts per window
    message: {
        error: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // Generous ceiling for normal app usage
    message: {
        error: 'Too many requests from this IP, please slow down',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

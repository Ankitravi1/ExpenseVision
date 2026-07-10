import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('Error:', err);

    // Known application error with explicit status
    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }

    // Prisma error (codes start with 'P')
    if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
        return res.status(400).json({ error: 'Database error' });
    }

    // Fallback
    res.status(500).json({ error: 'Internal server error' });
}

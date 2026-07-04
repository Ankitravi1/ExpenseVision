import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('Error:', err);

    const status = err.status || 500;
    const message = err.status ? err.message : 'Internal Server Error';

    // Frontend expects { error: string }
    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

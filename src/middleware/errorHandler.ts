import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom Error Class mapping HTTP Status codes to standardized API error shapes.
 * Use this to trigger graceful intentional failures that don't look like crashes.
 */
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // Operational errors are predicted failures (e.g. invalid password). Programming errors are actual bugs.
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global Express Error Handler.
 * Intercepts all thrown Exceptions or `next(err)` calls.
 */
export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Determine status code (default to 500 if unhandled bug)
    const statusCode = err.statusCode || 500;

    // Default fallback message for unhandled crashes to prevent leaking SQL or framework details
    let message = err.message || 'Internal Server Error';

    if (statusCode === 500) {
        message = 'Internal Server Error - Something went wrong on the backend.';

        // Log the full catastrophic stack trace securely via Winston (NOT to the user)
        logger.error(`🚨 [CRASH] ${req.method} ${req.originalUrl} - ${err.message}`, {
            stack: err.stack,
            body: req.body,
            ip: req.ip
        });
    } else {
        // Log routine operational errors quietly as warnings
        logger.warn(`⚠️ [WARN] ${req.method} ${req.originalUrl} - ${message}`);
    }

    // Send uniform JSON response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Only leak stack in dev mode
        }
    });
};

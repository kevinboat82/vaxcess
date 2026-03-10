import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request object to include the authenticated user payload
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'vaxcess_super_secret_fallback_do_not_use_in_prod_123!';

/**
 * Middleware to protect routes that require authentication.
 * It expects a valid JWT in the Authorization header: `Bearer <token>`
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // Webhooks should bypass regular authentication as they use their own mutual TLS or signature validation (e.g. Africa's Talking signatures)
    // We handle webhook security individually in the webhook route handlers
    if (req.path.startsWith('/api/webhooks')) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token format.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role: string };

        // Attach user payload to request for downstream handlers to use
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Token expired or invalid.' });
    }
};

/**
 * Middleware to protect routes that require Admin privileges.
 * This should be used AFTER the `requireAuth` middleware.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: No user payload.' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Requires ADMIN role.' });
    }

    next();
};

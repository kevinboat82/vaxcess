import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vaxcess_super_secret_fallback_do_not_use_in_prod_123!';

/**
 * @route POST /api/auth/register
 * @desc Utility route to register the first Health Worker (Usually should be an Admin-only route)
 */
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, password, facility_name, role = 'WORKER' } = req.body;

        if (!username || !password || !facility_name) {
            return res.status(400).json({ error: 'Username, password, and facility name are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        const result = await query(
            `INSERT INTO Health_Workers (id, username, password_hash, facility_name, role) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, username, facility_name, role`,
            [id, username, hashedPassword, facility_name, role]
        );

        res.status(201).json({ message: 'Health worker registered', worker: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate health worker and issue JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await query(`SELECT * FROM Health_Workers WHERE username = $1`, [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const worker = result.rows[0];
        const isMatch = await bcrypt.compare(password, worker.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Issue JWT valid for 24 hours
        const token = jwt.sign(
            { id: worker.id, role: worker.role, facility: worker.facility_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        logger.error('Server error during login', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * @route GET /api/auth/workers
 * @desc Get a roster of all registered health workers (For Admin Dashboard)
 * Note: Should ideally be protected by a specific `requireAdmin` guard,
 * but reusing the generic auth for the boilerplate.
 */
router.get('/workers', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, username, facility_name, role, created_at FROM Health_Workers ORDER BY created_at DESC`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error('Error fetching workers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

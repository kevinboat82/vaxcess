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
        if (!req.body) {
            return res.status(400).json({ error: 'Missing request body' });
        }
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

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

/**
 * @route PUT /api/auth/workers/:id
 * @desc Update a health worker's details (username, facility_name, role, optionally password)
 */
router.put('/workers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, facility_name, role, password } = req.body;

        if (!username || !facility_name || !role) {
            return res.status(400).json({ error: 'Username, facility name, and role are required' });
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await query(
                `UPDATE Health_Workers SET username = $1, facility_name = $2, role = $3, password_hash = $4 WHERE id = $5`,
                [username, facility_name, role, hashedPassword, id]
            );
        } else {
            await query(
                `UPDATE Health_Workers SET username = $1, facility_name = $2, role = $3 WHERE id = $4`,
                [username, facility_name, role, id]
            );
        }

        res.status(200).json({ message: 'Worker updated successfully' });
    } catch (error: any) {
        logger.error('Error updating worker:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route DELETE /api/auth/workers/:id
 * @desc Delete a health worker
 */
router.delete('/workers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent admin from deleting themselves (assuming req.user contains the authenticated user)
        if (req.user && req.user.id === id) {
             return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        await query(`DELETE FROM Health_Workers WHERE id = $1`, [id]);
        res.status(200).json({ message: 'Worker deleted successfully' });
    } catch (error) {
        logger.error('Error deleting worker:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

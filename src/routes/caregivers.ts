import { Router } from 'express';
import { query } from '../db';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @route POST /api/caregivers
 * @desc Register a new caregiver
 */
router.post('/', async (req, res) => {
    try {
        const { name, phone_number, language } = req.body;

        if (!name || !phone_number) {
            return res.status(400).json({ error: 'Name and phone number are required' });
        }

        const id = uuidv4();
        const lang = language || 'Twi';

        const result = await query(
            `INSERT INTO Caregivers (id, name, phone_number, language) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, name, phone_number, lang]
        );

        res.status(201).json({
            message: 'Caregiver registered successfully',
            caregiver: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Error creating caregiver:', error);
        if (error.code === '23505') { // Postgres unique constraint violation
            return res.status(409).json({ error: 'Phone number already registered' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/caregivers/:id
 * @desc Fetch a caregiver by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`SELECT * FROM Caregivers WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Caregiver not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching caregiver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

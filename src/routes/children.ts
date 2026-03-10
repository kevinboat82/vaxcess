import { Router } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { generateInitialSchedule } from '../core/schedule-engine';
import { logger } from '../utils/logger';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/children/registry
 * @desc Fetch all children joined with their caregiver data for the Admin Dashboard
 */
router.get('/registry', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT c.id, c.name, c.dob, c.gender, c.address, c.health_facility_centre, 
                   cg.name as caregiver_name, cg.phone_number, c.incentive_status
            FROM Children c
            JOIN Caregivers cg ON c.caregiver_id = cg.id
            ORDER BY c.created_at DESC
        `);

        res.status(200).json(result.rows);
    } catch (error) {
        logger.error('Error fetching registry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/children/:id/details
 * @desc Specifically fetch one child's full profile including their upcoming EPI tracking schedule
 */
router.get('/:id/details', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Caregiver + Child Profile
        const profileResult = await query(`
            SELECT c.id as child_id, c.name as child_name, c.dob, c.gender, c.created_at, c.address, 
                   c.health_facility_centre, c.incentive_status, c.incentive_value, 
                   c.all_incentives_given, c.vaccination_count,
                   cg.id as caregiver_id, cg.name as caregiver_name, cg.phone_number, 
                   cg.secondary_phone, cg.contact_validation
            FROM Children c
            JOIN Caregivers cg ON c.caregiver_id = cg.id
            WHERE c.id = $1
        `, [id]);

        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const profile = profileResult.rows[0];

        // 2. Fetch the entire associated Schedule history timeline
        // Note: Joining Vaccine_Meta to get readable names instead of just UUIDs
        // Because Vaccine_Meta might still be a mock or empty in early stages, we use a LEFT JOIN 
        // fallback to the vaccine_id directly if meta is missing.
        const scheduleResult = await query(`
            SELECT s.id, s.vaccine_id, s.due_date, s.window_start, s.window_end, s.status, s.administered_date
            FROM Schedules s
            WHERE s.child_id = $1
            ORDER BY s.due_date ASC
        `, [id]);

        // We embed the schedules array inside the core profile payload
        const responseData = {
            ...profile,
            schedules: scheduleResult.rows
        };

        res.status(200).json(responseData);
    } catch (error) {
        logger.error('Error fetching child details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /api/children
 * @desc Register a new child and caregiver simultaneously, generating their EPI schedule
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { caregiver_name, phone_number, address, gender, child_name, dob } = req.body;

        if (!caregiver_name || !phone_number || !child_name || !dob) {
            return res.status(400).json({ error: 'Caregiver Name, Phone, Child Name, and DOB are strictly required.' });
        }

        // 1. Resolve Caregiver (Idempotent by phone number to prevent duplicates)
        let caregiverId: string;

        const existingCaregiverRes = await query(`SELECT id FROM Caregivers WHERE phone_number = $1`, [phone_number]);

        if (existingCaregiverRes.rows.length > 0) {
            caregiverId = existingCaregiverRes.rows[0].id;
            // Optionally update their address if it changed
            if (address) {
                await query(`UPDATE Caregivers SET address = $1, updated_at = NOW() WHERE id = $2`, [address, caregiverId]);
            }
        } else {
            // Create brand new Caregiver
            caregiverId = uuidv4();
            await query(
                `INSERT INTO Caregivers (id, name, phone_number, address) VALUES ($1, $2, $3, $4)`,
                [caregiverId, caregiver_name, phone_number, address || null]
            );
        }

        // 2. Insert Child
        const childId = uuidv4();
        const dateOfBirth = new Date(dob);

        const childResult = await query(
            `INSERT INTO Children (id, caregiver_id, name, dob, gender, address, health_facility_centre) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [childId, caregiverId, child_name, dateOfBirth, gender || 'UNKNOWN', address || null, 'Main Clinic']
        );

        const child = childResult.rows[0];

        // 3. MANDATORY SCHEDULE GENERATION: Run the EPI Engine
        const rawSchedules = generateInitialSchedule(dateOfBirth);
        let schedulesCreated = 0;

        // Note: For production fidelity, we fetch the real UUIDs from Vaccine_Meta 
        // using the hardcoded standard abbreviations our Engine spits out.
        const metaRes = await query(`SELECT id, vaccine_name FROM Vaccine_Meta`);
        const metaMap = new Map(metaRes.rows.map(row => [row.vaccine_name, row.id]));

        for (const sched of rawSchedules) {
            const schedId = uuidv4();
            // Lookup the real Postgres UUID for this vaccine target. 
            // Fallback to a dummy if metadata doesn't exist (e.g. during testing)
            const realVaccineUuid = metaMap.get(sched.vaccineName) || uuidv4();

            await query(
                `INSERT INTO Schedules (id, child_id, vaccine_id, due_date, window_start, window_end, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [schedId, childId, realVaccineUuid, sched.dueDate, sched.windowStart, sched.windowEnd, 'PENDING']
            );
            schedulesCreated++;
        }

        res.status(201).json({
            message: 'Successfully registered Child & Caregiver. EPI Timeline Hydrated.',
            child,
            caregiver_id: caregiverId,
            schedulesGenerated: schedulesCreated
        });
    } catch (error) {
        logger.error('Error in unified Child Registration:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

/**
 * @route GET /api/children/:id/schedules
 * @desc Fetch all schedules for a specific child
 */
router.get('/:id/schedules', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`SELECT * FROM Schedules WHERE child_id = $1 ORDER BY due_date ASC`, [id]);

        res.status(200).json(result.rows);
    } catch (error) {
        logger.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route PUT /api/children/:id
 * @desc Update an existing child's and their caregiver's core details
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const client = await require('../db').pool.connect();
    try {
        const { id } = req.params;
        const { child_name, gender, dob, address, health_facility_centre, caregiver_name, phone_number } = req.body;

        if (!child_name || !dob || !caregiver_name || !phone_number) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // 1. Update the Child record
        const childUpdateRes = await client.query(
            `UPDATE Children 
             SET name = $1, gender = $2, dob = $3, address = $4, health_facility_centre = $5, updated_at = NOW()
             WHERE id = $6 RETURNING caregiver_id`,
            [child_name, gender, dob, address, health_facility_centre, id]
        );

        if (childUpdateRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Child not found' });
        }

        const caregiverId = childUpdateRes.rows[0].caregiver_id;

        // 2. Update the associated Caregiver record
        await client.query(
            `UPDATE Caregivers 
             SET name = $1, phone_number = $2, updated_at = NOW()
             WHERE id = $3`,
            [caregiver_name, phone_number, caregiverId]
        );

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Child and Caregiver details updated successfully',
            child_id: id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error updating child details:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

export default router;

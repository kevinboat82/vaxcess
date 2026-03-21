import { Router } from 'express';
import { generateInitialSchedule, recalculateSubsequentDoses } from '../core/schedule-engine';
import { GHANA_EPI_META } from '../core/metadata';
import { logger } from '../utils/logger';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { triggerMoMoIncentive, verifyIncentiveEligibility } from '../services/incentive-service';
import { scheduleVoiceReminder } from '../services/voice-service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @route GET /api/schedule/upcoming
 * @desc Fetch all pending schedules globally, sorted by due date, with calculated days remaining
 */
router.get('/upcoming', requireAuth, async (req, res) => {
    try {
        const { query } = require('../db');

        const upcomingQuery = `
            SELECT 
                s.id as schedule_id,
                s.due_date,
                s.window_start,
                s.window_end,
                s.status,
                v.vaccine_name,
                c.id as child_id,
                c.name as child_name,
                c.dob as child_dob,
                c.gender as child_gender,
                cg.name as caregiver_name,
                cg.phone_number
            FROM Schedules s
            JOIN Children c ON s.child_id = c.id
            JOIN Caregivers cg ON c.caregiver_id = cg.id
            LEFT JOIN Vaccine_Meta v ON s.vaccine_id = v.id
            WHERE s.status = 'PENDING'
            ORDER BY s.due_date ASC
            LIMIT 500
        `;

        const result = await query(upcomingQuery);

        // Calculate days remaining dynamically
        const today = new Date();
        const enrichedSchedules = result.rows.map((row: any) => {
            const dueDate = new Date(row.due_date);
            const diffTime = dueDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                ...row,
                days_remaining: daysRemaining,
                vaccine_display_name: row.vaccine_name || row.vaccine_id // Fallback in case of missing meta
            };
        });

        res.status(200).json(enrichedSchedules);
    } catch (error) {
        logger.error('Error fetching upcoming schedules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /api/schedule/generate/:child_id
 * @desc Generate an initial vaccination schedule for an existing child
 */
router.post('/generate/:child_id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { child_id } = req.params;

        // Verify the child exists
        const { query } = require('../db');
        const childResult = await query(`SELECT * FROM Children WHERE id = $1`, [child_id]);

        if (childResult.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const child = childResult.rows[0];

        // Ensure no schedules already exist for this child to prevent duplicates
        const existingSchedules = await query(`SELECT id FROM Schedules WHERE child_id = $1`, [child_id]);
        if (existingSchedules.rows.length > 0) {
            return res.status(400).json({ error: 'Schedule already exists for this child' });
        }

        // Generate the timeline
        const dateOfBirth = new Date(child.dob);
        const schedule = generateInitialSchedule(dateOfBirth);

        const { v4: uuidv4 } = require('uuid');

        let schedulesCreated = 0;
        // Insert each generated schedule into the database
        for (const sched of schedule) {
            const schedId = uuidv4();

            // Map the programmatic ID to the database Vaccine_Meta.id (mocking the map for this stage)
            const dummyVaccineUuid = uuidv4();

            await query(
                `INSERT INTO Schedules (id, child_id, vaccine_id, due_date, window_start, window_end, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [schedId, child_id, sched.vaccineId, sched.dueDate, sched.windowStart, sched.windowEnd, 'PENDING']
            );
            schedulesCreated++;
        }

        res.status(201).json({
            message: 'Schedule generated and seeded successfully',
            schedulesGenerated: schedulesCreated
        });
    } catch (error) {
        logger.error('Error generating schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /api/schedule/recalculate
 * @desc Recalculate subsequent doses if a dose was missed or delayed
 */
router.post('/recalculate', requireAuth, requireAdmin, (req, res) => {
    try {
        const { administeredDate, subsequentVaccineIds } = req.body;

        if (!administeredDate || !subsequentVaccineIds || !Array.isArray(subsequentVaccineIds)) {
            return res.status(400).json({ error: 'Invalid request payload' });
        }

        const dateAdministered = new Date(administeredDate);

        // Filter the metadata to only include the subsequent vaccines requested
        const vaccinesToRecalculate = GHANA_EPI_META.filter(v => subsequentVaccineIds.includes(v.id));

        const updatedSchedule = recalculateSubsequentDoses(dateAdministered, vaccinesToRecalculate);

        res.status(200).json({
            message: 'Schedule recalculated successfully',
            schedule: updatedSchedule
        });
    } catch (error) {
        logger.error('Error recalculating schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route PATCH /api/schedule/:id/complete
 * @desc Manually mark a pending vaccine schedule as completed
 */
router.patch('/:id/complete', requireAuth, requireAdmin, async (req, res) => {
    const { pool } = require('../db');
    const client = await pool.connect();

    try {
        const id = req.params.id as string;
        await client.query('BEGIN');

        // 1. Lock the row for update to prevent concurrent modifications
        const lockQuery = `
            SELECT status, vaccine_id, child_id 
            FROM Schedules 
            WHERE id = $1 
            FOR UPDATE SKIP LOCKED
        `;
        const checkRes = await client.query(lockQuery, [id]);

        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Schedule not found or already being processed' });
        }

        if (checkRes.rows[0].status === 'COMPLETED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Schedule is already completed' });
        }

        const scheduleDetail = checkRes.rows[0];

        // 2. Fetch caregiver details (still inside transaction)
        const childRes = await client.query(`SELECT caregiver_id FROM Children WHERE id = $1`, [scheduleDetail.child_id]);
        const caregiverId = childRes.rows[0].caregiver_id;

        // 3. Create a Visit record first to satisfy Foreign Key constraints
        const visitId = uuidv4();
        await client.query(
            `INSERT INTO Visits (id, child_id) VALUES ($1, $2)`,
            [visitId, scheduleDetail.child_id]
        );

        // 4. Check Eligibility (passing the transaction client)
        const MILESTONE_VACCINES = ['v-penta3', 'v-measles1', 'v-measles2'];
        let payoutStatus = 'No payout triggered';

        if (MILESTONE_VACCINES.includes(scheduleDetail.vaccine_id)) {
            const isEligible = await verifyIncentiveEligibility(id, new Date(), client);

            if (isEligible) {
                payoutStatus = await triggerMoMoIncentive({
                    visitId: visitId,
                    caregiverId: caregiverId,
                    scheduleId: id,
                    amount: 10.00
                }, client);
                logger.info(`Incentive triggered for schedule ${id}: ${payoutStatus}`);
            } else {
                payoutStatus = 'Not eligible (outside window)';
            }
        }

        // 4. Update the status
        await client.query(
            `UPDATE Schedules 
             SET status = 'COMPLETED', administered_date = NOW(), updated_at = NOW() 
             WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Vaccine marked as completed successfully',
            payout_status: payoutStatus
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        logger.error('Error completing vaccine schedule:', error);
        
        // Handle custom validation errors gracefully
        if (error.message?.includes('Invalid schedule')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * @route POST /api/schedule/:id/remind
 * @desc Manually trigger a voice reminder for a specific schedule
 */
router.post('/:id/remind', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { query } = require('../db');

        const reminderQuery = `
            SELECT 
                s.vaccine_id,
                cg.phone_number,
                cg.language
            FROM Schedules s
            JOIN Children c ON s.child_id = c.id
            JOIN Caregivers cg ON c.caregiver_id = cg.id
            WHERE s.id = $1
        `;
        const result = await query(reminderQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule/Caregiver not found' });
        }

        const { phone_number, language, vaccine_id } = result.rows[0];

        await scheduleVoiceReminder(phone_number, language, vaccine_id);

        res.status(200).json({ message: 'Voice reminder queued successfully' });
    } catch (error) {
        logger.error('Error triggering manual reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

import { Router } from 'express';
import { query } from '../db';
import { ScheduleRecord, resolveSyncConflict } from '../services/sync-service';
import { triggerMoMoIncentive } from '../services/incentive-service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/sync/pull
 * @desc Get all records changed after a specific timestamp (WatermelonDB format)
 */
router.get('/pull', async (req, res) => {
    try {
        const lastPulledAt = req.query.lastPulledAt ? new Date(Number(req.query.lastPulledAt)) : new Date(0);

        // Fetch all relevant modified data
        const caregivers = await query('SELECT * FROM Caregivers WHERE updated_at > $1', [lastPulledAt]);
        const children = await query('SELECT * FROM Children WHERE updated_at > $1', [lastPulledAt]);
        const schedules = await query('SELECT * FROM Schedules WHERE updated_at > $1', [lastPulledAt]);

        res.status(200).json({
            changes: {
                caregivers: { created: [], updated: caregivers.rows, deleted: [] },
                children: { created: [], updated: children.rows, deleted: [] },
                schedules: { created: [], updated: schedules.rows, deleted: [] }
            },
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error("Sync pull error:", error);
        res.status(500).json({ error: 'Failed to pull sync data' });
    }
});

/**
 * @route POST /api/sync/push
 * @desc Push local changes to the server, resolving conflicts
 */
router.post('/push', async (req, res) => {
    try {
        const { schedules } = req.body;

        // We only handle Schedule updates in this boilerplate, as that dictates incentives
        if (schedules && schedules.updated) {
            for (const clientRecord of schedules.updated as ScheduleRecord[]) {

                const serverRecordQuery = await query('SELECT *, EXTRACT(EPOCH FROM updated_at)*1000 as updated_at_ms FROM Schedules WHERE id = $1', [clientRecord.id]);

                if (serverRecordQuery.rows.length === 0) continue;

                const serverRecordOrig = serverRecordQuery.rows[0];
                const serverRecordMapped: ScheduleRecord = {
                    id: serverRecordOrig.id,
                    child_id: serverRecordOrig.child_id,
                    vaccine_id: serverRecordOrig.vaccine_id,
                    status: serverRecordOrig.status,
                    updated_at: serverRecordOrig.updated_at_ms,
                    _changed_at: 0 // Server doesn't have local device change time
                };

                // Execute Deterministic LWW Conflict Resolution
                const resolution = await resolveSyncConflict(clientRecord, serverRecordMapped);

                if (resolution.strategy === 'USE_CLIENT') {
                    // Client won! Apply the update.
                    await query(
                        'UPDATE Schedules SET status = $1, administered_date = $2 WHERE id = $3',
                        [clientRecord.status, new Date(clientRecord._changed_at), clientRecord.id]
                    );

                    // Incentive Cascade: If it was marked COMPLETED offline, trigger the payout!
                    if (clientRecord.status === 'COMPLETED' && serverRecordMapped.status === 'PENDING') {
                        try {
                            // Find the caregiver to pay
                            const caregiverQuery = await query(`
                                SELECT c.caregiver_id 
                                FROM Children c 
                                WHERE c.id = $1`, [clientRecord.child_id]
                            );

                            if (caregiverQuery.rows.length > 0) {
                                // Assume a generic mock visit_id or generate one for the offline sync event
                                await triggerMoMoIncentive({
                                    visitId: `OFFLINE_SYNC_${clientRecord.id}`,
                                    caregiverId: caregiverQuery.rows[0].caregiver_id,
                                    scheduleId: clientRecord.id,
                                    amount: 20.00 // standard incentive
                                });
                            }
                        } catch (incentiveErr) {
                            logger.error(`Failed to trigger offline cascade incentive for ${clientRecord.id}:`, incentiveErr);
                        }
                    }
                }
            }
        }

        res.status(200).json({ success: true, timestamp: Date.now() });
    } catch (error) {
        logger.error("Sync push error:", error);
        res.status(500).json({ error: 'Failed to push sync data' });
    }
});

export default router;

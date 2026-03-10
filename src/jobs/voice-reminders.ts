import cron from 'node-cron';
import { query } from '../db';
import { scheduleVoiceReminder } from '../services/voice-service';
import { logger } from '../utils/logger';

/**
 * Daily Job: Scans for vaccines due in 48 hours and triggers voice reminders
 */
export const initVoiceReminderCron = () => {
    // Run every day at 08:00 AM
    cron.schedule('0 8 * * *', async () => {
        logger.info('Running daily voice reminder cron job...');

        try {
            // Find PENDING schedules due in exactly 2 days
            const reminderQuery = `
                SELECT 
                    s.id as schedule_id,
                    s.vaccine_id,
                    cg.phone_number,
                    cg.language
                FROM Schedules s
                JOIN Children c ON s.child_id = c.id
                JOIN Caregivers cg ON c.caregiver_id = cg.id
                WHERE s.status = 'PENDING'
                AND s.due_date = CURRENT_DATE + INTERVAL '2 days'
            `;

            const result = await query(reminderQuery);

            if (result.rows.length === 0) {
                logger.info('No reminders due for today.');
                return;
            }

            for (const row of result.rows) {
                try {
                    await scheduleVoiceReminder(row.phone_number, row.language, row.vaccine_id);
                    logger.info(`Voice reminder triggered for caregiver ${row.phone_number} (Schedule: ${row.schedule_id})`);
                } catch (err) {
                    logger.error(`Failed to send reminder for schedule ${row.schedule_id}:`, err);
                }
            }

            logger.info(`Cron job finished. Total reminders sent: ${result.rows.length}`);
        } catch (error) {
            logger.error('Error in voice reminder cron job:', error);
        }
    });
};

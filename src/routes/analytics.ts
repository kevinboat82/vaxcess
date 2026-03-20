import { Router } from 'express';
import { query } from '../db';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/analytics/overview
 * @desc Fetch aggregate system metrics for the Global Dashboard
 */
router.get('/overview', async (req, res) => {
    try {
        // Run aggregate queries concurrently for performance
        const [
            childrenResult,
            caregiversResult,
            completedSchedulesResult,
            pendingSchedulesResult
        ] = await Promise.all([
            query(`SELECT COUNT(*) as total FROM Children`),
            query(`SELECT COUNT(*) as total FROM Caregivers`),
            query(`SELECT COUNT(*) as total FROM Schedules WHERE status = 'COMPLETED'`),
            query(`SELECT COUNT(*) as total FROM Schedules WHERE status = 'PENDING'`)
        ]);

        const metrics = {
            total_children: parseInt(childrenResult.rows[0].total, 10),
            total_caregivers: parseInt(caregiversResult.rows[0].total, 10),
            total_vaccines_administered: parseInt(completedSchedulesResult.rows[0].total, 10),
            total_vaccines_pending: parseInt(pendingSchedulesResult.rows[0].total, 10)
        };

        res.status(200).json(metrics);
    } catch (error) {
        logger.error('Error fetching global analytics metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/analytics/charts
 * @desc Fetch time-series and distribution data for dashboard charting
 */
router.get('/charts', async (req, res) => {
    try {
        // 1. Distribution Metrics (Completed vs Pending vs Missed/Overdue)
        // We consider pending schedules in the past as 'OVERDUE' for charting purposes
        const distributionQuery = `
            SELECT 
                CASE 
                    WHEN status = 'COMPLETED' THEN 'Completed'
                    WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 'Overdue'
                    WHEN status = 'PENDING' AND due_date >= CURRENT_DATE THEN 'Pending'
                    ELSE 'Other'
                END as category,
                COUNT(*) as count
            FROM Schedules
            GROUP BY category
        `;
        const distributionRes = await query(distributionQuery);

        // 2. Trailing 6 Months Administered Trend
        // Groups completed vaccines by year-month
        const trendQuery = `
            SELECT 
                TO_CHAR(administered_date, 'Mon YYYY') as month,
                COUNT(*) as count
            FROM Schedules
            WHERE status = 'COMPLETED' 
              AND administered_date IS NOT NULL
            GROUP BY TO_CHAR(administered_date, 'Mon YYYY'), DATE_TRUNC('month', administered_date)
            ORDER BY DATE_TRUNC('month', administered_date) DESC
            LIMIT 12
        `;
        const trendRes = await query(trendQuery);

        // Format for Recharts
        const pieChartData = distributionRes.rows.map(row => ({
            name: row.category,
            value: parseInt(row.count, 10)
        }));

        const barChartData = trendRes.rows.map(row => ({
            month: row.month,
            vaccines: parseInt(row.count, 10)
        })).reverse();

        res.status(200).json({
            distribution: pieChartData,
            trend: barChartData
        });

    } catch (error) {
        logger.error('Error fetching analytics chart data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

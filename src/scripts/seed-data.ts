import { Pool } from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedData() {
    try {
        console.log('🌱 Starting data seeding...');

        // 1. Create a sample caregiver if none exists
        const caregiverId = uuidv4();
        await pool.query(`
            INSERT INTO Caregivers (id, first_name, last_name, phone_number, relationship_to_child)
            VALUES ($1, 'Jane', 'Doe', '+1234567890', 'Mother')
            ON CONFLICT DO NOTHING
        `, [caregiverId]);

        // 2. Create a sample child if none exists
        const childId = uuidv4();
        await pool.query(`
            INSERT INTO Children (id, first_name, last_name, date_of_birth, gender, caregiver_id)
            VALUES ($1, 'John', 'Doe Jr.', '2023-01-15', 'MALE', $2)
            ON CONFLICT DO NOTHING
        `, [childId, caregiverId]);

        // 3. Clear existing sample schedules to avoid duplicates (optional, but good for clean graphs)
        // await pool.query("DELETE FROM Schedules WHERE status = 'COMPLETED'");

        // 4. Create completed schedules (Trend Data)
        const months = [0, 1, 2, 3, 4, 5]; // past 6 months
        for (const m of months) {
            const date = new Date();
            date.setMonth(date.getMonth() - m);
            const dateStr = date.toISOString().split('T')[0];
            
            // Add 5-10 doses per month for a nice graph
            const doses = Math.floor(Math.random() * 5) + 5;
            for (let i = 0; i < doses; i++) {
                await pool.query(`
                    INSERT INTO Schedules (id, child_id, vaccine_name, due_date, administered_date, status)
                    VALUES ($1, $2, $3, $4, $5, 'COMPLETED')
                `, [uuidv4(), childId, 'BCG', dateStr, dateStr]);
            }
        }

        // 5. Create some pending/overdue schedules for the pie chart
        await pool.query(`
            INSERT INTO Schedules (id, child_id, vaccine_name, due_date, status)
            VALUES 
            ($1, $2, 'Polio 1', CURRENT_DATE + INTERVAL '10 days', 'PENDING'),
            ($3, $2, 'Measles', CURRENT_DATE - INTERVAL '5 days', 'PENDING')
        `, [uuidv4(), childId, uuidv4()]);

        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seedData();

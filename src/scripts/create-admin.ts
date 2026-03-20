
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`
});

async function createAdmin() {
    const username = 'admin_vax';
    const password = 'VaxcessAdmin2026!';
    const hash = await bcrypt.hash(password, 10);

    try {
        await pool.query(
            "INSERT INTO Health_Workers (username, password_hash, facility_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET password_hash = $2",
            [username, hash, 'Main Clinic', 'ADMIN']
        );
        console.log('✅ Admin user created/updated successfully!');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
    } catch (err) {
        console.error('❌ Failed to create admin user:', err);
    } finally {
        await pool.end();
    }
}

createAdmin();

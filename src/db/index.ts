import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

/**
 * Configure standard pg Pool using environment variables, or
 * fallback to the local docker-compose default credentials.
 */
const poolConfig: any = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for most managed DBs like Render/Neon
        }
    }
    : {
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    };

export const pool = new Pool(poolConfig);

/**
 * Helper to easily execute queries
 */
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.info('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        logger.error('Error executing query', { text, error });
        throw error;
    }
};

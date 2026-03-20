import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
    try {
        console.log('🚀 Initializing Database Schema...');
        
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute the schema SQL
        // We split by ';' carefully, but pg can handle multiple statements in one query call for simple scripts
        await pool.query(schemaSql);

        console.log('✅ Database Schema initialized successfully!');
    } catch (error) {
        console.error('❌ Database Initialization failed:', error);
    } finally {
        await pool.end();
    }
}

initDb();

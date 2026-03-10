import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
    console.error("❌ ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in .env");
    process.exit(1);
}

const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function discoverSchema() {
    console.log("🔍 Probing Airtable Base for Table Schemas...\n");

    const tableNames = ['Caregivers', 'Children']; // Default guesses, change if needed

    for (const tableName of tableNames) {
        try {
            console.log(`--- Table: ${tableName} ---`);
            const records = await base(tableName).select({ maxRecords: 1 }).firstPage();

            if (records.length === 0) {
                console.log(`⚠️  Table '${tableName}' is empty or does not exist. Could not determine fields.`);
            } else {
                const record = records[0];
                const fields = Object.keys(record.fields);

                console.log("Found Fields:");
                fields.forEach(field => console.log(`  - "${field}"`));
            }
            console.log("\n");
        } catch (error: any) {
            console.log(`⚠️  Failed to read table '${tableName}'. It might not exist or the token lacks permissions.`);
        }
    }

    console.log("💡 TIP: Copy the exact field names above and paste them into the FIELD_MAP in src/scripts/migrate-airtable.ts");
}

discoverSchema();

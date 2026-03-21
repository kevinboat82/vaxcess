import Airtable from 'airtable';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { generateInitialSchedule } from '../core/schedule-engine';
import { GHANA_EPI_META } from '../core/metadata';

// Load environment variables ensuring we have DB access
dotenv.config();

/**
 * AIRTABLE MIGRATION SCRIPT (V2 - HISTORICAL TIMELINES)
 */

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || 'unconfigured_key' }).base(process.env.AIRTABLE_BASE_ID || 'unconfigured_base');

const AIRTABLE_TABS = {
    CHILDREN: 'Children',
};

const FIELD_MAP = {
    CAREGIVER: {
        NAME: "Caregiver's Name",
        PHONE: "Parent Contact",
        SECONDARY_PHONE: "Parent Number",
        ADDRESS: "Address",
        CONTACT_VALIDATION: "Contact Validation"
    },
    CHILD: {
        NAME: "Child Name",
        DOB: "DOB",
        GENDER: "Gender",
        ADDRESS: "Address",
        HEALTH_FACILITY: "Health Facility Centre",
        AIRTABLE_ID: "Child's ID No.",
        VACCINES_TAKEN: "Vaccine Taken",
        INCENTIVE_VALUE: "Incentive Value (₵)",
        INCENTIVE_STATUS: "Incentive Status",
        ALL_INCENTIVES: "All Incentives Given (Status)",
        VACCINATION_COUNT: "Vaccination Count"
    }
};

// Mapping Airtable legacy names to our standardized Vaccine_Meta IDs
const VACCINE_MAPPING: Record<string, string> = {
    'BCG': 'v-bcg',
    'Oral Polio Vaccine': 'v-opv0',
    'OPV0': 'v-opv0',
    'OPV1': 'v-opv1',
    'OPV2': 'v-opv2',
    'OPV3': 'v-opv3',
    'Pneumococcal 1': 'v-pcv1',
    'Pneumococcal 2': 'v-pcv2',
    'Pneumococcal 3': 'v-pcv3',
    'Rotavirus 1': 'v-rota1',
    'Rotavirus 2': 'v-rota2',
    'DPT/Hepb/Hib1': 'v-penta1',
    'DPT/Hepb/Hib2': 'v-penta2',
    'DPT/Hepb/Hib3': 'v-penta3',
    'IPV': 'v-ipv',
    'Measles-Rubella 1': 'v-measles1',
    'Yellow Fever': 'v-yf',
    'Vitamin A (9 months)': 'v-vita9m',
    'Measles-Rubella 2': 'v-measles2',
    'Meningitis A': 'v-mena',
    'Vitamin A (18 months)': 'v-vita18m',
    'Vitamin A': 'v-vita18m', // Fallback
};

async function syncVaccineMeta() {
    logger.info("Elevating Vaccine Metadata to current EPI standards...");
    for (const v of GHANA_EPI_META) {
        await query(
            `INSERT INTO Vaccine_Meta (id, vaccine_name, min_age_days, recommended_age_days, max_age_days)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
                vaccine_name = EXCLUDED.vaccine_name,
                min_age_days = EXCLUDED.min_age_days,
                recommended_age_days = EXCLUDED.recommended_age_days,
                max_age_days = EXCLUDED.max_age_days`,
            [v.id, v.vaccineName, v.minAgeDays, v.recommendedAgeDays, v.maxAgeDays || null]
        );
    }
    logger.info("✅ Vaccine Metadata synchronized.");
}

export async function migrate() {
    logger.info("🚀 Starting Advanced Airtable Migration Vector (V2)...");

    try {
        await syncVaccineMeta();

        logger.info("⚠️ Disarming Foreign Key Constraints & Truncating DB...");
        // Safely wipe the database to prevent duplicate collisions on V2 import
        await query(`TRUNCATE TABLE Payments, Visits, Schedules, Children, Caregivers RESTART IDENTITY CASCADE`);
        logger.info("✅ Database truncated securely.");

        const caregiverPhoneMap: Record<string, string> = {};

        logger.info(`Extracting ${AIRTABLE_TABS.CHILDREN} from Airtable...`);
        const children = await base(AIRTABLE_TABS.CHILDREN).select().all();

        logger.info(`Found ${children.length} Records. Normalizing and Seeding PostgreSQL...`);
        let caregiversInserted = 0;
        let childrenInserted = 0;
        let schedulesInserted = 0;

        for (const record of children) {
            const newChildUuid = uuidv4();

            // Extract Child Fields
            const childName = record.get(FIELD_MAP.CHILD.NAME) as string || 'Unknown Child';
            const dobString = record.get(FIELD_MAP.CHILD.DOB) as string;
            const gender = record.get(FIELD_MAP.CHILD.GENDER) as string || null;
            const airtableId = record.get(FIELD_MAP.CHILD.AIRTABLE_ID) as string || null;
            const vaccinesTaken = (record.get(FIELD_MAP.CHILD.VACCINES_TAKEN) as string[]) || [];

            // Extract Caregiver Fields
            const caregiverName = record.get(FIELD_MAP.CAREGIVER.NAME) as string || 'Unknown Caregiver';
            let caregiverPhone = record.get(FIELD_MAP.CAREGIVER.PHONE) as string;
            const secondaryPhone = record.get(FIELD_MAP.CAREGIVER.SECONDARY_PHONE) as string || null;
            const address = record.get(FIELD_MAP.CAREGIVER.ADDRESS) as string || null;
            const contactValidation = record.get(FIELD_MAP.CAREGIVER.CONTACT_VALIDATION) as string || null;

            // Child Specific Fields
            const healthFacility = record.get(FIELD_MAP.CHILD.HEALTH_FACILITY) as string || null;
            const incentiveValue = record.get(FIELD_MAP.CHILD.INCENTIVE_VALUE) as number || 0;
            const incentiveStatus = record.get(FIELD_MAP.CHILD.INCENTIVE_STATUS) as string || null;
            const allIncentives = record.get(FIELD_MAP.CHILD.ALL_INCENTIVES) as string || null;
            const vaccinationCount = record.get(FIELD_MAP.CHILD.VACCINATION_COUNT) as number || 0;

            if (!caregiverPhone || caregiverPhone.trim() === '') {
                caregiverPhone = secondaryPhone || 'No Phone';
            }
            caregiverPhone = caregiverPhone.trim();

            if (!dobString) {
                logger.warn(`Skipping child ${childName} due to missing exact DOB.`);
                continue;
            }

            // --- 1. UPSERT CAREGIVER ---
            let postgresCaregiverId = caregiverPhoneMap[caregiverPhone];

            if (!postgresCaregiverId) {
                const newCaregiverUuid = uuidv4();
                postgresCaregiverId = newCaregiverUuid;

                try {
                    await query(
                        `INSERT INTO Caregivers (id, name, phone_number, secondary_phone, address, contact_validation, language) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7) 
                         ON CONFLICT (phone_number) DO NOTHING`,
                        [newCaregiverUuid, caregiverName, caregiverPhone, secondaryPhone, address, contactValidation, 'English']
                    );

                    const cgResult = await query(`SELECT id FROM Caregivers WHERE phone_number = $1`, [caregiverPhone]);
                    if (cgResult.rows.length > 0) {
                        postgresCaregiverId = cgResult.rows[0].id;
                        caregiverPhoneMap[caregiverPhone] = postgresCaregiverId;
                        caregiversInserted++;
                    }
                } catch (err: any) {
                    logger.error(`Failed to handle caregiver ${caregiverName}:`, err.message);
                    continue;
                }
            }

            // --- 2. INSERT CHILD ---
            const dateOfBirth = new Date(dobString);
            try {
                await query(
                    `INSERT INTO Children (
                        id, caregiver_id, name, dob, gender, address, 
                        health_facility_centre, airtable_id, 
                        incentive_status, incentive_value, 
                        all_incentives_given, vaccination_count
                    ) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        newChildUuid,
                        postgresCaregiverId,
                        childName,
                        dateOfBirth,
                        gender,
                        address, // Child address
                        healthFacility,
                        airtableId,
                        incentiveStatus,
                        incentiveValue,
                        allIncentives,
                        vaccinationCount
                    ]
                );
                childrenInserted++;
            } catch (err: any) {
                logger.error(`Failed to insert child ${childName}:`, err.message);
                continue;
            }

            // --- 3. AUTO-GENERATE FULL EPI TIMELINE & MATCH COMPLETIONS ---
            try {
                // Generate the standard projected timeline for this child
                const fullTimeline = generateInitialSchedule(dateOfBirth);

                // Set of mapped IDs for the vaccines this specific child has already taken
                const takenIds = new Set(
                    vaccinesTaken
                        .map(name => VACCINE_MAPPING[name.trim()])
                        .filter(id => !!id)
                );

                for (const sched of fullTimeline) {
                    const schedId = uuidv4();
                    const isCompleted = takenIds.has(sched.vaccineId!);
                    const status = isCompleted ? 'COMPLETED' : 'PENDING';

                    // For completed ones, we use DOB as a placeholder administered_date.
                    // For pending ones, administered_date remains null.
                    const administeredDate = isCompleted ? dateOfBirth : null;

                    await query(
                        `INSERT INTO Schedules (id, child_id, vaccine_id, due_date, window_start, window_end, status, administered_date)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            schedId,
                            newChildUuid,
                            sched.vaccineId,
                            sched.dueDate,
                            sched.windowStart,
                            sched.windowEnd,
                            status,
                            administeredDate
                        ]
                    );
                    schedulesInserted++;
                }
            } catch (err: any) {
                logger.error(`Failed to seed timeline for ${childName}:`, err.message);
            }
        }

        logger.info(`✅ Successfully identified/migrated ${caregiversInserted} unique Caregivers.`);
        logger.info(`✅ Successfully migrated ${childrenInserted} Children.`);
        logger.info(`💉 Successfully reconstructed ${schedulesInserted} Historical Vaccination Timelines.`);
        logger.info("🎉 Migration Complete! Patients now possess retroactive EPI histories.");
        return { caregiversInserted, childrenInserted, schedulesInserted };

    } catch (error: any) {
        logger.error("🚨 MIGRATION CATASTROPHE:", error);
        throw error;
    }
}

import { v4 as uuidv4 } from 'uuid';

import { query } from '../db';

// Mock external provider for MoMo (we will keep this as a mock since we don't have real API keys)

const externalMoMoClient = {
    transfer: async (payload: any) => { return { success: true }; }
};

interface PaymentContext {
    visitId: string;
    caregiverId: string;
    scheduleId: string;
    amount: number;
}

/**
 * 1. Verification Step: Ensure dose was given in the allowed window
 */
export async function verifyIncentiveEligibility(scheduleId: string, administeredDate: Date): Promise<boolean> {
    const result = await query(`SELECT * FROM Schedules WHERE id = $1`, [scheduleId]);

    if (result.rows.length === 0) {
        throw new Error("Invalid schedule.");
    }
    const schedule = result.rows[0];

    if (schedule.status === 'COMPLETED') {
        throw new Error("Invalid schedule or already completed.");
    }

    const adminTime = administeredDate.getTime();
    const windowStart = new Date(schedule.window_start).getTime();
    const windowEnd = new Date(schedule.window_end).getTime();

    // The core validation logic
    return adminTime >= windowStart && adminTime <= windowEnd;
}

/**
 * 2. Payment Execution Step: Idempotent MoMo Trigger
 */
export async function triggerMoMoIncentive(context: PaymentContext): Promise<string> {
    // Generate a rigorous Idempotency Key based on exact Visit and Schedule
    // This guarantees that retrying this exact function will NOT trigger a double payment
    const idempotencyKey = `PAY_V1_${context.visitId}_${context.scheduleId}`;

    // Check if payment already exists (or is processing) in the DB
    const existingPayment = await query('SELECT status FROM Payments WHERE idempotency_key = $1', [idempotencyKey]);

    if (existingPayment.rows.length > 0) {
        return `Payment already ${existingPayment.rows[0].status} for key: ${idempotencyKey}`;
    }

    // Register PENDING payment in DB before talking to external API
    const paymentId = uuidv4();
    await query(
        `INSERT INTO Payments (id, caregiver_id, visit_id, idempotency_key, amount, status) 
         VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
        [paymentId, context.caregiverId, context.visitId, idempotencyKey, context.amount]
    );

    try {
        // Call the external MoMo API (e.g., MTN MoMo, Paystack, Hubtel)
        // Pass the idempotencyKey in the HTTP headers to the provider
        const response = await externalMoMoClient.transfer({
            amount: context.amount,
            recipientId: context.caregiverId, // Needs translation to MSISDN/Phone
            reference: idempotencyKey
        });

        if (response.success) {
            await query(`UPDATE Payments SET status = 'SUCCESS' WHERE id = $1`, [paymentId]);
            return "Payment successful.";
        } else {
            throw new Error("Provider rejected transfer.");
        }
    } catch (error) {
        await query(`UPDATE Payments SET status = 'FAILED' WHERE id = $1`, [paymentId]);
        throw error;
    }
}

// Models matching what would come from the client/server
export interface ScheduleRecord {
    id: string;
    child_id: string;
    vaccine_id: string;
    status: 'PENDING' | 'COMPLETED' | 'MISSED';
    updated_at: number; // Server timestamp representing last modification
    _changed_at: number; // Client device timestamp representing physical event
}

export interface ConflictResolutionResult {
    strategy: 'USE_SERVER' | 'USE_CLIENT';
    record: ScheduleRecord;
}

/**
 * Conflict Resolution Strategy: Deterministic Last-Write-Wins (LWW) with Status Protection
 * 
 * Since a worker might sync data 3 days late, you need strict resolution rules on the backend 
 * to avoid overwriting newer data.
 */
export async function resolveSyncConflict(
    clientRecord: ScheduleRecord,
    serverRecord: ScheduleRecord
): Promise<ConflictResolutionResult> {

    // 1. Status Progression Protection
    // If server already has it as COMPLETED, and client says PENDING...
    // Action: Reject client change, push Server state down to client.
    if (serverRecord.status === 'COMPLETED' && clientRecord.status === 'PENDING') {
        return { strategy: 'USE_SERVER', record: serverRecord };
    }

    // 2. Offline fulfillment
    // If Client says COMPLETED, and Server says PENDING...
    // Action: Accept client change! The offline worker administered the dose.
    if (clientRecord.status === 'COMPLETED' && serverRecord.status === 'PENDING') {
        return { strategy: 'USE_CLIENT', record: clientRecord };
    }

    // 3. Fallback: Last-Write-Wins based on physical event time, NOT sync time.
    if (clientRecord._changed_at > serverRecord.updated_at) {
        return { strategy: 'USE_CLIENT', record: clientRecord };
    }

    return { strategy: 'USE_SERVER', record: serverRecord };
}

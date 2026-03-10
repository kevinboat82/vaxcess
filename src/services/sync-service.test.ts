import { resolveSyncConflict, ScheduleRecord } from './sync-service';

describe('Offline Sync Conflict Resolution Engine', () => {

    const generateMockRecord = (
        status: 'PENDING' | 'COMPLETED' | 'MISSED',
        updated_at: number,
        _changed_at: number
    ): ScheduleRecord => ({
        id: 'sch_123',
        child_id: 'child_123',
        vaccine_id: 'vax_123',
        status,
        updated_at,
        _changed_at
    });

    test('LWW Strategy: Client overrides server if physical change occurred later', async () => {
        const clientChangedAt = new Date('2024-05-02T10:00:00Z').getTime(); // Client gave dose on May 2
        const serverUpdatedAt = new Date('2024-05-01T10:00:00Z').getTime(); // Pre-existing server state on May 1

        const clientRecord = generateMockRecord('PENDING', 0, clientChangedAt);
        const serverRecord = generateMockRecord('PENDING', serverUpdatedAt, 0);

        const result = await resolveSyncConflict(clientRecord, serverRecord);
        expect(result.strategy).toBe('USE_CLIENT');
    });

    test('LWW Strategy: Server wins if server update is newer than client physical change', async () => {
        const clientChangedAt = new Date('2024-05-01T10:00:00Z').getTime();
        const serverUpdatedAt = new Date('2024-05-02T10:00:00Z').getTime();

        const clientRecord = generateMockRecord('PENDING', 0, clientChangedAt);
        const serverRecord = generateMockRecord('PENDING', serverUpdatedAt, 0);

        const result = await resolveSyncConflict(clientRecord, serverRecord);
        expect(result.strategy).toBe('USE_SERVER');
    });

    test('Status Progression Protection: Offline COMPLETED wins over Server PENDING', async () => {
        // Even if timestamps are murky, a completion of a dose is a terminal physical action
        const clientRecord = generateMockRecord('COMPLETED', 0, 100);
        const serverRecord = generateMockRecord('PENDING', 200, 0);

        const result = await resolveSyncConflict(clientRecord, serverRecord);
        expect(result.strategy).toBe('USE_CLIENT');
        expect(result.record.status).toBe('COMPLETED');
    });

    test('Status Progression Protection: Protects Server COMPLETED from Offline PENDING wipeout', async () => {
        // Someone hit sync on an old device holding a PENDING state, 
        // whilst the server had an already COMPLETED state.
        // We must prevent data downgrade.
        const clientRecord = generateMockRecord('PENDING', 0, 9999999999999); // Simulating an artificially "newer" client change
        const serverRecord = generateMockRecord('COMPLETED', 100, 0);

        const result = await resolveSyncConflict(clientRecord, serverRecord);
        expect(result.strategy).toBe('USE_SERVER');
        expect(result.record.status).toBe('COMPLETED');
    });
});

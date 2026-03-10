import { generateInitialSchedule, recalculateSubsequentDoses } from './schedule-engine';
import { GHANA_EPI_META } from './metadata';

describe('Schedule Engine Logic', () => {

    test('generateInitialSchedule: correctly maps DOB to BCG and Penta 1 windows', () => {
        const dob = new Date('2024-01-01T00:00:00Z');
        const schedule = generateInitialSchedule(dob, GHANA_EPI_META);

        // Find BCG
        const bcg = schedule.find(s => s.vaccineId === 'v-bcg');
        expect(bcg).toBeDefined();
        // BCG window is at birth (0 days)
        expect(bcg?.windowStart.toISOString()).toBe('2024-01-01T00:00:00.000Z');

        // Find Penta 1
        const penta1 = schedule.find(s => s.vaccineId === 'v-penta1');
        expect(penta1).toBeDefined();

        // Penta 1 window starts at 42 days (6 weeks) after DOB
        const expectedPenta1Start = new Date(dob);
        expectedPenta1Start.setDate(expectedPenta1Start.getDate() + 42);

        expect(penta1?.windowStart.toISOString()).toBe(expectedPenta1Start.toISOString());
    });

    test('recalculateSubsequentDoses: pushes sequential doses out based on late administration', () => {
        // Penta 1 administered very late, at 10 weeks instead of 6 weeks.
        const lateAdminDate = new Date('2024-03-11T00:00:00Z');

        // We want to recalculate Penta 2 and Penta 3
        const subsequentDoses = [
            GHANA_EPI_META.find(v => v.id === 'v-penta2')!,
            GHANA_EPI_META.find(v => v.id === 'v-penta3')!
        ];

        // 28 days = 4 weeks interval
        const recalculated = recalculateSubsequentDoses(lateAdminDate, subsequentDoses, 28);

        expect(recalculated.length).toBe(2);

        const penta2 = recalculated[0];
        const penta3 = recalculated[1];

        // Penta 2 should now natively shift to 28 days after Penta 1
        const expectedPenta2Start = new Date(lateAdminDate);
        expectedPenta2Start.setDate(expectedPenta2Start.getDate() + 28);
        expect(penta2.windowStart.toISOString()).toBe(expectedPenta2Start.toISOString());

        // Penta 3 should now naturally shift to 28 days after Penta 2
        const expectedPenta3Start = new Date(expectedPenta2Start);
        expectedPenta3Start.setDate(expectedPenta3Start.getDate() + 28);
        expect(penta3.windowStart.toISOString()).toBe(expectedPenta3Start.toISOString());
    });
});

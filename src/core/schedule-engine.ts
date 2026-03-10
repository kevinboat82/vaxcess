import { VaccineMeta, ScheduleCreation } from './types';
import { GHANA_EPI_META } from './metadata';

/**
 * Helper: Adds a specific number of days to a given date.
 */
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Initial Generation:
 * Generates the full vaccination schedule for a child based strictly on their DOB.
 */
export function generateInitialSchedule(dob: Date, vaccinesMeta: VaccineMeta[] = GHANA_EPI_META): ScheduleCreation[] {
    return vaccinesMeta.map(vaccine => {
        const windowStart = addDays(dob, vaccine.minAgeDays);
        const dueDate = addDays(dob, vaccine.recommendedAgeDays);

        // If max age is provided, use it. Otherwise, assume a standard 28-day grace period.
        const windowEnd = vaccine.maxAgeDays
            ? addDays(dob, vaccine.maxAgeDays)
            : addDays(dueDate, 28);

        return {
            vaccineId: vaccine.id,
            vaccineName: vaccine.vaccineName,
            dueDate,
            windowStart,
            windowEnd
        };
    });
}

/**
 * Recalculation Engine:
 * Use this if a child receives a dose LATE. E.g., Penta 1 is given at 8 weeks instead of 6.
 * It enforces minimum intervals (typically 4 weeks/28 days) for subsequent doses in that series.
 */
export function recalculateSubsequentDoses(
    administeredDate: Date,
    subsequentVaccinesInSeries: VaccineMeta[],
    minimumIntervalDays: number = 28
): ScheduleCreation[] {
    const updatedSchedules: ScheduleCreation[] = [];

    // The next dose baseline starts from the actual administration date
    let currentBaselineDate = administeredDate;

    for (const vaccine of subsequentVaccinesInSeries) {
        // Shift the window based on the actual administration date of the prerequisite
        const windowStart = addDays(currentBaselineDate, minimumIntervalDays);

        // We set the new due date aggressively to the earliest safe window
        const dueDate = windowStart;
        const windowEnd = addDays(dueDate, minimumIntervalDays); // Another 4-week window to get it

        updatedSchedules.push({
            vaccineId: vaccine.id,
            vaccineName: vaccine.vaccineName,
            dueDate,
            windowStart,
            windowEnd
        });

        // Update baseline for the next dose in the series
        currentBaselineDate = windowStart;
    }

    return updatedSchedules;
}

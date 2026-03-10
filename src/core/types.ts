export interface VaccineMeta {
    id: string;
    vaccineName: string;
    minAgeDays: number;
    recommendedAgeDays: number;
    maxAgeDays?: number;
}

export interface ScheduleCreation {
    vaccineId?: string; // Kept for backwards compat during migration if needed
    vaccineName: string;
    dueDate: Date;
    windowStart: Date;
    windowEnd: Date;
}

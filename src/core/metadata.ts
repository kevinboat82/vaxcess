import { VaccineMeta } from './types';

// Configuration based on Ghana's EPI schedule.
export const GHANA_EPI_META: VaccineMeta[] = [
    { id: 'v-bcg', vaccineName: 'BCG', minAgeDays: 0, recommendedAgeDays: 0, maxAgeDays: 365 },
    { id: 'v-opv0', vaccineName: 'OPV 0', minAgeDays: 0, recommendedAgeDays: 0, maxAgeDays: 13 },

    // 6 Weeks
    { id: 'v-penta1', vaccineName: 'Pentavalent 1', minAgeDays: 42, recommendedAgeDays: 42, maxAgeDays: 365 },
    { id: 'v-opv1', vaccineName: 'OPV 1', minAgeDays: 42, recommendedAgeDays: 42, maxAgeDays: 365 },
    { id: 'v-pcv1', vaccineName: 'PCV 1', minAgeDays: 42, recommendedAgeDays: 42, maxAgeDays: 365 },
    { id: 'v-rota1', vaccineName: 'Rotavirus 1', minAgeDays: 42, recommendedAgeDays: 42, maxAgeDays: 365 },

    // 10 Weeks
    { id: 'v-penta2', vaccineName: 'Pentavalent 2', minAgeDays: 70, recommendedAgeDays: 70, maxAgeDays: 365 },
    { id: 'v-opv2', vaccineName: 'OPV 2', minAgeDays: 70, recommendedAgeDays: 70, maxAgeDays: 365 },
    { id: 'v-pcv2', vaccineName: 'PCV 2', minAgeDays: 70, recommendedAgeDays: 70, maxAgeDays: 365 },
    { id: 'v-rota2', vaccineName: 'Rotavirus 2', minAgeDays: 70, recommendedAgeDays: 70, maxAgeDays: 365 },

    // 14 Weeks
    { id: 'v-penta3', vaccineName: 'Pentavalent 3', minAgeDays: 98, recommendedAgeDays: 98, maxAgeDays: 365 },
    { id: 'v-opv3', vaccineName: 'OPV 3', minAgeDays: 98, recommendedAgeDays: 98, maxAgeDays: 365 },
    { id: 'v-pcv3', vaccineName: 'PCV 3', minAgeDays: 98, recommendedAgeDays: 98, maxAgeDays: 365 },
    { id: 'v-ipv', vaccineName: 'IPV', minAgeDays: 98, recommendedAgeDays: 98, maxAgeDays: 365 },

    // 9 Months
    { id: 'v-measles1', vaccineName: 'Measles-Rubella 1', minAgeDays: 270, recommendedAgeDays: 270, maxAgeDays: 730 },
    { id: 'v-yf', vaccineName: 'Yellow Fever', minAgeDays: 270, recommendedAgeDays: 270, maxAgeDays: 730 },
    { id: 'v-vita9m', vaccineName: 'Vitamin A (9m)', minAgeDays: 270, recommendedAgeDays: 270 },

    // 18 Months
    { id: 'v-measles2', vaccineName: 'Measles-Rubella 2', minAgeDays: 548, recommendedAgeDays: 548 }, // 18m = ~548 days
    { id: 'v-mena', vaccineName: 'Meningitis A', minAgeDays: 548, recommendedAgeDays: 548 },
    { id: 'v-opv-booster', vaccineName: 'OPV Booster', minAgeDays: 548, recommendedAgeDays: 548 },
    { id: 'v-vita18m', vaccineName: 'Vitamin A (18m)', minAgeDays: 548, recommendedAgeDays: 548 },
];

/**
 * Smart Scheduling System Types & Constants
 */

export type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface TimeSlot {
    id: number; // 0 to (Days * SlotsPerDay - 1)
    day: Day;
    start: string; // HH:mm
    end: string;
}

export const DAYS: Day[] = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
export const SLOTS_PER_DAY = 6;
export const SLOT_DURATION = 90; // minutes
export const BREAK_DURATION = 10; // minutes

export const TIME_CONFIGS = [
    { start: "08:00", end: "09:30" },
    { start: "09:40", end: "11:10" },
    { start: "11:20", end: "12:50" },
    { start: "13:10", end: "14:40" },
    { start: "14:50", end: "16:20" },
    { start: "16:30", end: "18:00" },
];

export interface Gene {
    subjectId: string;
    professorId: string;
    roomId: string;
    slotId: number; // Index in the total timeline
    groups?: string[];
    level?: string;
    specialty?: string;
    type: "Cours" | "TD" | "TP";
}

export interface Chromosome {
    genes: Gene[];
    fitness: number;
    conflicts: string[];
}

export interface SchedulerInput {
    subjects: any[];
    rooms: any[];
    professors: any[];
    existingSchedules?: any[]; // For Warm Start
}

export const CONSTRAINT_WEIGHTS = {
    HARD_OVERLAP_PROF: 10000,
    HARD_OVERLAP_ROOM: 10000,
    HARD_OVERLAP_GROUP: 10000,
    SOFT_PROF_DAYS: 500, // Penalty for each day used beyond 2
    SOFT_GROUP_GAPS: 200, // Penalty for each empty slot between group classes
    SOFT_DISTRIBUTION: 5,
};

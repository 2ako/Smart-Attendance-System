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
export const BREAK_DURATION = 0; // minutes

export const TIME_CONFIGS = [
    { start: "08:00", end: "09:30" },
    { start: "09:30", end: "11:00" },
    { start: "11:00", end: "12:30" },
    { start: "12:30", end: "14:00" },
    { start: "14:00", end: "15:30" },
    { start: "15:30", end: "17:00" },
];

export interface Gene {
    subjectId: string;
    subjectName?: string;
    professorId: string;
    professorName?: string;
    roomId: string;
    slotId: number; // Index in the total timeline
    groups?: string[];
    level?: string;        // Sanity _id
    levelName?: string;    // Human-readable
    specialty?: string;    // Sanity _id
    specialtyName?: string; // Human-readable
    specialtyGroupCount?: number;
    type: "Cours" | "TD" | "TP";
    studyField?: string;
    roomStudyField?: string;
    blockId?: string; 
    
    // Performance optimization: Integer indices and masks
    profIdx: number;
    roomIdx: number;
    levelIdx: number;
    specIdx: number;
    subjectIdx: number;
    groupMask: number; // Pre-calculated bitmask for groups 1-32
}

export interface Chromosome {
    genes: Gene[];
    fitness: number;
    conflicts: string[];
    stats?: {
        fitness: number;
        hardConflicts: number;
        softConflicts: number;
        saturdaySlots: number;
        lateSlots: number;
    };
}

export interface SchedulerInput {
    subjects: any[];
    rooms: any[];
    professors: any[];
    existingSchedules?: any[]; 
}

export const CONSTRAINT_WEIGHTS = {
    HARD_OVERLAP_PROF: 1000000,
    HARD_OVERLAP_ROOM: 1000000,
    HARD_OVERLAP_GROUP: 1000000,
    HARD_ROOM_TYPE_MISMATCH: 1000000,
    HARD_FORBIDDEN_AFTERNOON: 1000000,
    HARD_AFTERNOON_PENALTY: 1000000,   // Alias for HARD_FORBIDDEN_AFTERNOON
    SOFT_SATURDAY_SESSION: 100000,    // Strong penalty to minimize, but not a hard limit
    SOFT_PROF_DAYS: 30,
    SOFT_GROUP_GAPS: 20,
    SOFT_DISTRIBUTION: 10,
    SOFT_AFTERNOON_SLOT3: 100,
    SOFT_LATE_SESSION_SLOT4: 1500,
    SOFT_LATE_SESSION_SLOT5: 2500,
    SOFT_SUBJECT_CLUSTERING: 100,
    SOFT_SAME_DAY_SUBJECT: 5000,
    SOFT_GROUP_ALTERNATION: 3000,
};

/**
 * Infer room type from its name.
 */
export function getRoomType(roomName: string): "TP" | "AMPHI" | "SALLE" {
    const n = roomName?.toLowerCase().trim() || "";
    if (n.includes("tp") || n.includes("lab")) return "TP";
    if (n.startsWith("amphi")) return "AMPHI";
    return "SALLE";
}

/**
 * Check if a session type can use a room type.
 */
export function isRoomTypeCompatible(sessionType: string, roomType: "TP" | "AMPHI" | "SALLE", groups: string[] = [], specialtyGroupCount?: number, strict = true): boolean {
    const st = sessionType || "Cours";
    // Rule: Cours for small cohorts (1 or 2 groups) -> SALLE
    // Rule: Cours for large cohorts (> 2 groups) -> AMPHI
    let isLarge = false;
    const normalizedGroups = (groups || []).map(g => g?.trim().toLowerCase());
    
    if (typeof specialtyGroupCount === 'number' && specialtyGroupCount > 0) {
        isLarge = specialtyGroupCount > 2;
    } else {
        // Fallback to group list check
        isLarge = normalizedGroups.includes("all") || normalizedGroups.length > 2;
    }

    if (st === "Cours" || st === "Amphi") {
        return isLarge ? roomType === "AMPHI" : roomType === "SALLE";
    }
    
    if (st === "TD") return roomType === "SALLE";
    if (st === "TP") return roomType === "TP";

    return roomType === "SALLE"; // Default fallback
}

/**
 * Rule: Only L1 and L2 are allowed in the afternoon.
 */
export function isAfternoonAllowed(level?: string): boolean {
    const l = level?.toUpperCase().trim() || "";
    if (l.includes("L3") || l.includes("M1") || l.includes("M2") || l.includes("MASTER")) return false;
    return true;
}

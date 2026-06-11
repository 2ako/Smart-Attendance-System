import { Chromosome, Gene, CONSTRAINT_WEIGHTS, SLOTS_PER_DAY, DAYS, getRoomType, isRoomTypeCompatible, isAfternoonAllowed } from "./types";

const normalizeField = (field: string): string => {
    const f = field?.toLowerCase().trim() || "";
    if (f === "info" || f === "informatique") return "informatique";
    return f;
};

const isRoomFieldSuitable = (subjectField: string, roomField: string): boolean => {
    const sf = normalizeField(subjectField);
    const rf = normalizeField(roomField);
    return rf === "" || rf === "all" || rf === "common" || rf === sf;
};

/**
 * Pre-allocated buffers provided by the engine to avoid GC pressure.
 */
export interface EvaluationBuffers {
    profOccupancy: BigUint64Array;
    roomOccupancy: BigUint64Array;
    levelMasks: Uint32Array;
    specMasks: Uint32Array;
}

/**
 * High-Performance fitness evaluation using bitwise operations and pre-allocated buffers.
 */
export function evaluateFitness(
    chromosome: Chromosome,
    includeDetails: boolean = false,
    buffers?: EvaluationBuffers
): Chromosome {
    if (!chromosome || !chromosome.genes) {
        return { genes: [], fitness: 1000000, conflicts: ["Invalid Chromosome"] };
    }
    let fitness = 0;
    let hardConflicts = 0;
    let saturdaySlots = 0;
    let lateSlots = 0;

    const conflicts: string[] = [];
    const genes = chromosome.genes;

    // Fast Bitwise Occupancy Tracking (one 64-bit integer per entity, 36 bits used)
    const profOccupancy = buffers?.profOccupancy || new BigUint64Array(1000);
    const roomOccupancy = buffers?.roomOccupancy || new BigUint64Array(1000);

    // Level & Specialty Masks
    // levelMasks: tracks the UNION of all activity in a level (to detect lecture vs lab conflicts)
    // specMasks: tracks activity SPECIFIC to a specialty
    const levelMasks = buffers?.levelMasks || new Uint32Array(200 * 36);
    const specMasks = buffers?.specMasks || new Uint32Array(500 * 36);

    // ALWAYS RESET
    profOccupancy.fill(0n);
    roomOccupancy.fill(0n);
    levelMasks.fill(0);
    specMasks.fill(0);

    const profDayMasks = new Uint8Array(1000);
    const subjectDayMasks = new Uint8Array(2000);

    for (let i = 0; i < genes.length; i++) {
        const g = genes[i];
        const slotId = g.slotId;
        const bit = 1n << BigInt(slotId);
        const dayIdx = (slotId / SLOTS_PER_DAY) | 0;
        const sIdxAtDay = slotId % 6;

        // Penalize Saturday (Slot 0-5)
        if (slotId < 6) {
            saturdaySlots++;
            fitness += 300000; // CRITICAL: Forced Saturday suppression
        }

        // Penalize Late Slots (Slot 4-5) for specific levels
        if (sIdxAtDay >= 4) {
            if (!isAfternoonAllowed(g.level)) {
                lateSlots++;
                fitness += CONSTRAINT_WEIGHTS.HARD_AFTERNOON_PENALTY;
            }
        }

        // 1. Professor Overlap
        if (g.profIdx >= 0) {
            if (profOccupancy[g.profIdx] & bit) {
                fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_PROF;
                hardConflicts++;
                if (includeDetails) conflicts.push(`Prof overlap: ${g.professorName}`);
            }
            profOccupancy[g.profIdx] |= bit;
        }

        // 2. Room Overlap
        if (g.roomIdx >= 0) {
            if (roomOccupancy[g.roomIdx] & bit) {
                fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_ROOM;
                hardConflicts++;
                if (includeDetails) conflicts.push(`Room overlap: ${g.roomId}`);
            }
            roomOccupancy[g.roomIdx] |= bit;
        }

        // 3. Hierarchical Group Overlap (Refined Specialty Isolation)
        const groupMask = g.groupMask;

        if (g.levelIdx >= 0) {
            const lIdx = g.levelIdx * 36 + slotId;
            const sIdx = g.specIdx >= 0 ? (g.specIdx * 36 + slotId) : -1;

            const isCours = (groupMask === 0xFFFF);
            const levelUnion = levelMasks[lIdx];
            const specValue = sIdx >= 0 ? specMasks[sIdx] : 0;

            if (isCours) {
                // Lecture conflicts with ANY activity already in this level
                if (levelUnion !== 0) {
                    hardConflicts++;
                    if (includeDetails) conflicts.push(`Lecture overlap in level ${g.levelName}`);
                    fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_GROUP;
                }
            } else {
                // TD/TP conflicts if:
                // a) Same specialty and group overlap
                // b) A Level-wide lecture is already scheduled (detected by 0xFFFF mask)
                if ((specValue & groupMask) || (levelUnion === 0xFFFF)) {
                    hardConflicts++;
                    if (includeDetails) conflicts.push(`Lab overlap in specialty ${g.specialtyName}`);
                    fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_GROUP;
                }
            }

            // Always update level union and specialty specific masks
            levelMasks[lIdx] |= groupMask;
            if (sIdx >= 0) specMasks[sIdx] |= groupMask;
        }

        // 4. Room Type Match
        const roomType = getRoomType(g.roomId);
        if (!isRoomTypeCompatible(g.type, roomType, g.groups, g.specialtyGroupCount)) {
            fitness += CONSTRAINT_WEIGHTS.HARD_ROOM_TYPE_MISMATCH;
            hardConflicts++;
        }

        // 6. Afternoon Check
        if (sIdxAtDay >= 4) {
            if (!isAfternoonAllowed(g.levelName || g.level)) {
                // Already handled in hard check above, but keeping for logic consistency
            } else {
                lateSlots++;
                fitness += (sIdxAtDay === 4) ? CONSTRAINT_WEIGHTS.SOFT_LATE_SESSION_SLOT4 : CONSTRAINT_WEIGHTS.SOFT_LATE_SESSION_SLOT5;
            }
        }

        if (g.subjectIdx >= 0) {
            subjectDayMasks[g.subjectIdx] |= (1 << dayIdx);
        }
        if (g.profIdx >= 0) {
            profDayMasks[g.profIdx] |= (1 << dayIdx);
        }
    }

    let softConflicts = 0;
    // 7. & 8. Soft Constraints (Day counts)
    for (let j = 0; j < profDayMasks.length; j++) {
        const mask = profDayMasks[j];
        if (mask === 0) continue;
        let count = 0; let m = mask; while (m) { m &= (m - 1); count++; }
        if (count > 2) { // Target: 2 days max
            softConflicts += (count - 2);
            fitness += (count - 2) * CONSTRAINT_WEIGHTS.SOFT_PROF_DAYS;
        }
    }

    for (let k = 0; k < subjectDayMasks.length; k++) {
        const mask = subjectDayMasks[k];
        if (mask === 0) continue;
        let count = 0; let m = mask; while (m) { m &= (m - 1); count++; }
        if (count > 1) {
            softConflicts += (count - 1);
            fitness += (count - 1) * CONSTRAINT_WEIGHTS.SOFT_SUBJECT_CLUSTERING * 5;
        }
    }

    return {
        ...chromosome,
        fitness,
        conflicts,
        stats: { fitness, hardConflicts, softConflicts, saturdaySlots, lateSlots }
    };
}


/**
 * Repairs a chromosome by resolving overlaps and satisfying room requirements.
 */
export function repairChromosome(chromosome: Chromosome, rooms: any[]): Chromosome {
    const genes = [...chromosome.genes];

    // Cache room types
    const roomTypeMap = new Map<string, "TP" | "AMPHI" | "SALLE">();
    rooms.forEach(r => roomTypeMap.set(r.name, getRoomType(r.name)));

    const getCompatibleRooms = (sessionType: string, studyField: string, groups: string[], specialtyGroupCount?: number, strict = true) => {
        let result = rooms.filter(r => {
            const rt = roomTypeMap.get(r.name) || getRoomType(r.name);
            if (!isRoomTypeCompatible(sessionType, rt, groups, specialtyGroupCount, strict)) return false;
            const rf = r.studyField?.code || r.studyField?.name || "";
            return isRoomFieldSuitable(studyField, rf);
        });
        if (result.length === 0) {
            result = rooms.filter(r => isRoomTypeCompatible(sessionType, roomTypeMap.get(r.name) || getRoomType(r.name), groups, specialtyGroupCount, strict));
        }
        if (result.length === 0 && strict) {
            return getCompatibleRooms(sessionType, studyField, groups, specialtyGroupCount, false);
        }
        return result.length > 0 ? result : rooms;
    };

    const isSafe = (gene: Gene, slotId: number, roomId: string, skipIndices: number[], currentGenes: Gene[]) => {
        const geneProfIdx = gene.profIdx;
        const geneRoomIdx = gene.roomIdx;
        const geneLevelIdx = gene.levelIdx;
        const geneSpecIdx = gene.specIdx;
        const geneMask = gene.groupMask;

        for (let k = 0; k < currentGenes.length; k++) {
            if (skipIndices.includes(k)) continue;
            const g = currentGenes[k];
            if (g.slotId !== slotId) continue;
            if (g.profIdx === geneProfIdx && geneProfIdx >= 0) return false;
            if (g.roomId === roomId) return false;

            if (g.levelIdx === geneLevelIdx && geneLevelIdx >= 0) {
                const isEitherCommon = g.specIdx < 0 || geneSpecIdx < 0 || g.specialtyName === "Common" || gene.specialtyName === "Common";
                const isSameSpecialty = g.specIdx === geneSpecIdx;

                if (isEitherCommon || isSameSpecialty) {
                    if ((g.groupMask & geneMask) !== 0) return false;
                }
            }
        }
        return true;
    };

    // Main repair loop
    for (let i = 0; i < genes.length; i++) {
        const gene = genes[i];
        const rt = roomTypeMap.get(gene.roomId) || getRoomType(gene.roomId);

        // Removed unnecessary "|| gene.slotId < SLOTS_PER_DAY" which caused massive unneeded changes
        if (!isRoomTypeCompatible(gene.type, rt, gene.groups, gene.specialtyGroupCount) || !isSafe(gene, gene.slotId, gene.roomId, [i], genes)) {
            const roomsForType = getCompatibleRooms(gene.type, gene.studyField || "", gene.groups || [], gene.specialtyGroupCount);
            const canAfternoon = isAfternoonAllowed(gene.level);

            let found = false;
            // Ordered Trial: Sun-Thu Day -> Sun-Thu Afternoon -> Sat
            const trialDays = [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]];
            const trialSlots = [[0, 1, 2, 3], [4, 5], [0, 1, 2, 3, 4, 5]];

            for (let tIdx = 0; tIdx < trialDays.length; tIdx++) {
                if (tIdx === 1 && !canAfternoon) continue;
                // Add some randomness so repair doesn't stack everything monotonically
                const randStartDay = Math.floor(Math.random() * trialDays[tIdx].length);
                const randStartSlot = Math.floor(Math.random() * trialSlots[tIdx].length);

                for (let d = 0; d < trialDays[tIdx].length; d++) {
                    const day = trialDays[tIdx][(d + randStartDay) % trialDays[tIdx].length];
                    for (let sl = 0; sl < trialSlots[tIdx].length; sl++) {
                        const slot = trialSlots[tIdx][(sl + randStartSlot) % trialSlots[tIdx].length];
                        const s = day * SLOTS_PER_DAY + slot;

                        // Try a random room first
                        const startRoom = Math.floor(Math.random() * roomsForType.length);
                        for (let ri = 0; ri < roomsForType.length; ri++) {
                            const r = roomsForType[(ri + startRoom) % roomsForType.length];
                            if (isSafe(gene, s, r.name, [i], genes)) {
                                genes[i] = {
                                    ...gene,
                                    slotId: s,
                                    roomId: r.name,
                                    roomIdx: rooms.findIndex(rm => rm.name === r.name), // Update index!
                                    roomStudyField: r.studyField?.code || r.studyField?.name || ""
                                };
                                found = true; break;
                            }
                        }
                        if (found) break;
                    }
                    if (found) break;
                }
                if (found) break;
            }
        }
    }

    return evaluateFitness({ ...chromosome, genes });
}

import { Chromosome, Gene, CONSTRAINT_WEIGHTS, SLOTS_PER_DAY, DAYS } from "./types";

/**
 * Evaluates the fitness of a chromosome and returns conflicts.
 */
export function evaluateFitness(chromosome: Chromosome): Chromosome {
    let fitness = 0;
    const conflicts: string[] = [];
    const genes = chromosome.genes;

    // 1. Hard Constraints (Overlaps)
    for (let i = 0; i < genes.length; i++) {
        for (let j = i + 1; j < genes.length; j++) {
            const g1 = genes[i];
            const g2 = genes[j];

            if (g1.slotId === g2.slotId) {
                // Professor Overlap
                if (g1.professorId === g2.professorId) {
                    fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_PROF;
                    conflicts.push(`Prof conflict: Professor teaches both ${g1.level} ${g1.specialty || ""} and ${g2.level} ${g2.specialty || ""} at the same time.`);
                }

                // Room Overlap
                if (g1.roomId === g2.roomId) {
                    fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_ROOM;
                    conflicts.push(`Room conflict: Room ${g1.roomId} is occupied by both ${g1.level} and ${g2.level} at the same time.`);
                }

                // Group Overlap (Same students)
                const groups1 = g1.groups || [];
                const groups2 = g2.groups || [];
                const hasSharedGroup = groups1.some(g => groups2.includes(g)) || 
                                     (groups1.includes("All") && groups2.length > 0) ||
                                     (groups2.includes("All") && groups1.length > 0);

                if (hasSharedGroup && g1.level === g2.level && g1.specialty === g2.specialty) {
                    fitness += CONSTRAINT_WEIGHTS.HARD_OVERLAP_GROUP;
                    conflicts.push(`Group conflict: Group ${groups1.join(", ")} has two sessions at once in ${g1.level} ${g1.specialty || ""}.`);
                }
            }
        }
    }

    // 2. Professor Clustering (Minimize Days)
    const profDays = new Map<string, Set<number>>();
    genes.forEach(g => {
        if (!profDays.has(g.professorId)) profDays.set(g.professorId, new Set());
        profDays.get(g.professorId)?.add(Math.floor(g.slotId / SLOTS_PER_DAY));
    });

    profDays.forEach((days, profId) => {
        if (days.size > 2) {
            fitness += (days.size - 2) * CONSTRAINT_WEIGHTS.SOFT_PROF_DAYS;
        }
    });

    // 3. Group Compactness (Minimize Gaps)
    const groupSlots = new Map<string, Map<number, number[]>>();
    genes.forEach(g => {
        const targetGroups = g.groups || [];
        targetGroups.forEach(group => {
            const groupKey = `${g.level}-${g.specialty || ""}-${group}`;
            if (!groupSlots.has(groupKey)) groupSlots.set(groupKey, new Map());
            const dayIdx = Math.floor(g.slotId / SLOTS_PER_DAY);
            const daySlots = groupSlots.get(groupKey)?.get(dayIdx) || [];
            daySlots.push(g.slotId % SLOTS_PER_DAY);
            groupSlots.get(groupKey)?.set(dayIdx, daySlots);
        });
    });

    groupSlots.forEach((days, groupKey) => {
        days.forEach((slots, dayIdx) => {
            if (slots.length > 1) {
                slots.sort((a, b) => a - b);
                const min = slots[0];
                const max = slots[slots.length - 1];
                const totalSpan = max - min + 1;
                const gaps = totalSpan - slots.length;
                if (gaps > 0) {
                    fitness += gaps * CONSTRAINT_WEIGHTS.SOFT_GROUP_GAPS;
                }
            }
        });
    });

    return { ...chromosome, fitness, conflicts };
}

/**
 * Heuristically repairs a chromosome by moving conflicting genes to empty slots.
 */
export function repairChromosome(chromosome: Chromosome, rooms: any[]): Chromosome {
    const genes = [...chromosome.genes];
    const totalSlots = DAYS.length * SLOTS_PER_DAY;

    const isSafe = (gene: Gene, slotId: number, currentGenes: Gene[]) => {
        return !currentGenes.some(g => {
            if (g === gene || g.slotId !== slotId) return false;
            
            const profConflict = g.professorId === gene.professorId;
            const roomConflict = g.roomId === gene.roomId;
            
            const groups1 = gene.groups || [];
            const groups2 = g.groups || [];
            const groupMatch = groups1.some(gr => groups2.includes(gr)) || 
                             (groups1.includes("All") && groups2.length > 0) ||
                             (groups2.includes("All") && groups1.length > 0);
            
            const groupConflict = groupMatch && g.level === gene.level && g.specialty === gene.specialty;
            
            return profConflict || roomConflict || groupConflict;
        });
    };

    for (let i = 0; i < genes.length; i++) {
        const gene = genes[i];
        if (!isSafe(gene, gene.slotId, genes)) {
            for (let s = 0; s < totalSlots; s++) {
                if (isSafe(gene, s, genes)) {
                    genes[i] = { ...gene, slotId: s };
                    break;
                }
            }
        }
    }

    return evaluateFitness({ ...chromosome, genes });
}

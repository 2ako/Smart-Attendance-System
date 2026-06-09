import { Gene, CONSTRAINT_WEIGHTS, SLOTS_PER_DAY, getRoomType, isRoomTypeCompatible, isAfternoonAllowed } from "./types";

/**
 * Validates a manual move of a session.
 * Checks for hard conflicts: Professor overlap, Room overlap, Group overlap, 
 * Room type compatibility, and Forbidden time slots.
 */
export function validateMove(
    allGenes: Gene[], 
    geneIndex: number, 
    newSlot: number, 
    newRoomId: string,
    rooms: any[]
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const targetGene = allGenes[geneIndex];
    
    // 1. Professor Overlap
    const profConflict = allGenes.some((g, idx) => 
        idx !== geneIndex && 
        g.slotId === newSlot && 
        g.professorId === targetGene.professorId
    );
    if (profConflict) {
        errors.push(`Professor ${targetGene.professorName} is already assigned to another class at this time.`);
    }

    // 2. Room Overlap
    const roomConflict = allGenes.some((g, idx) => 
        idx !== geneIndex && 
        g.slotId === newSlot && 
        g.roomId === newRoomId
    );
    if (roomConflict) {
        errors.push(`Room ${newRoomId} is already occupied at this time.`);
    }

    // 3. Group Overlap
    const targetGroups = targetGene.groups || [];
    const groupConflict = allGenes.some((g, idx) => {
        if (idx === geneIndex || g.slotId !== newSlot) return false;
        
        // Same level and specialty? Check groups
        if (g.level === targetGene.level && String(g.specialty) === String(targetGene.specialty)) {
            const gGroups = g.groups || [];
            return targetGroups.some(tg => gGroups.includes(tg)) || 
                   targetGroups.includes("All") || 
                   gGroups.includes("All");
        }
        return false;
    });
    if (groupConflict) {
        errors.push(`One or more student groups are already in another class at this time.`);
    }

    // 4. Room Type Compatibility
    const targetRoom = rooms.find((r: any) => r.name === newRoomId);
    const roomType = targetRoom ? getRoomType(targetRoom.name) : getRoomType(newRoomId);
    if (!isRoomTypeCompatible(targetGene.type, roomType, targetGroups, targetGene.specialtyGroupCount)) {
        errors.push(`Room ${newRoomId} (${roomType}) is not compatible with a ${targetGene.type} session.`);
    }

    // 5. Afternoon Restrictions
    const slotIdx = newSlot % SLOTS_PER_DAY;
    if ((slotIdx === 4 || slotIdx === 5) && !isAfternoonAllowed(targetGene.level)) {
        errors.push(`Afternoon sessions are forbidden for level ${targetGene.level}.`);
    }

    // 6. Saturday Logic (Optional: Warn or Block)
    // We allow it but it counts as a semi-conflict in the original engine.
    // For manual move, we'll just allow it unless requested otherwise.

    return {
        isValid: errors.length === 0,
        errors
    };
}

export type SlotStatus = { isAvailable: boolean; reason?: string };

/**
 * Calculates availability metadata for all slots and rooms relative to a target gene.
 */
export function getAvailableOptions(
    allGenes: Gene[],
    geneIndex: number,
    rooms: any[]
): { slots: Record<number, SlotStatus>, roomsBySlot: Record<number, Record<string, SlotStatus>> } {
    const targetGene = allGenes[geneIndex];
    if (!targetGene) return { slots: {}, roomsBySlot: {} };
    
    const totalSlots = 36;
    const slotResults: Record<number, SlotStatus> = {};
    const roomsBySlot: Record<number, Record<string, SlotStatus>> = {};

    for (let sId = 0; sId < totalSlots; sId++) {
        const isCurrentSlot = sId === targetGene.slotId;
        roomsBySlot[sId] = {};

        // 1. Professor & Group Checks
        if (!isCurrentSlot) {
            const profConflict = allGenes.find((g, idx) => 
                idx !== geneIndex && g.slotId === sId && g.professorId === targetGene.professorId
            );
            if (profConflict) {
                slotResults[sId] = { isAvailable: false, reason: `Professor ${targetGene.professorName} busy` };
                continue;
            }

            const targetGroups = targetGene.groups || [];
            const groupConflict = allGenes.find((g, idx) => {
                if (idx === geneIndex || g.slotId !== sId) return false;
                const gSpec = String(g.specialty || "");
                const tSpec = String(targetGene.specialty || "");
                if (g.level === targetGene.level && gSpec === tSpec) {
                    const gGroups = g.groups || [];
                    return targetGroups.some(tg => gGroups.includes(tg)) || 
                           targetGroups.includes("All") || gGroups.includes("All");
                }
                return false;
            });
            if (groupConflict) {
                slotResults[sId] = { isAvailable: false, reason: `Groups already in ${groupConflict.subjectName}` };
                continue;
            }

            const slotIdx = sId % SLOTS_PER_DAY;
            if ((slotIdx === 4 || slotIdx === 5) && !isAfternoonAllowed(targetGene.level)) {
                slotResults[sId] = { isAvailable: false, reason: "Afternoon restricted for this level" };
                continue;
            }
        }

        // 2. Room Checks for this slot
        let hasAnyValidRoom = false;
        for (const room of rooms) {
            const isCurrentRoom = isCurrentSlot && room.name === targetGene.roomId;
            const roomType = getRoomType(room.name);
            
            if (!isCurrentRoom && !isRoomTypeCompatible(targetGene.type, roomType, targetGene.groups || [], targetGene.specialtyGroupCount, false)) {
                roomsBySlot[sId][room.name] = { isAvailable: false, reason: `Room type (${roomType}) incompatible with ${targetGene.type}` };
                continue;
            }

            if (!isCurrentRoom) {
                const roomOccupied = allGenes.find((g, idx) => 
                    idx !== geneIndex && g.slotId === sId && g.roomId === room.name
                );
                if (roomOccupied) {
                    roomsBySlot[sId][room.name] = { isAvailable: false, reason: `Occupied by ${roomOccupied.subjectName}` };
                    continue;
                }
            }

            roomsBySlot[sId][room.name] = { isAvailable: true };
            hasAnyValidRoom = true;
        }

        if (!hasAnyValidRoom) {
            slotResults[sId] = { isAvailable: false, reason: "No compatible rooms available at this time" };
        } else {
            slotResults[sId] = { isAvailable: true };
        }
    }

    return { slots: slotResults, roomsBySlot };
}

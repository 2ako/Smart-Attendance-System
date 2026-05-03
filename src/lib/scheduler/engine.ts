import { 
    Chromosome, 
    Gene, 
    SchedulerInput, 
    DAYS, 
    SLOTS_PER_DAY, 
    SLOT_DURATION 
} from "./types";
import { evaluateFitness, repairChromosome } from "./constraints";

export class SchedulerEngine {
    private input: SchedulerInput;
    private population: Chromosome[] = [];
    private populationSize = 40;
    private generations = 100;
    private tabuList: string[] = [];
    private tabuSize = 10;

    constructor(input: SchedulerInput) {
        this.input = input;
    }

    /**
     * Entry point: Hybrid Generation
     */
    public async generate(): Promise<Chromosome> {
        this.initializePopulation();
        
        for (let g = 0; g < this.generations; g++) {
            this.evolve();
            // Early exit if perfect fitness found
            if (this.population[0].fitness === 0) break;
        }

        let best = this.population[0];
        
        // Final optimization with Tabu Search
        if (best.fitness > 0) {
            best = this.performTabuSearch(best);
        }

        // Final Repair
        best = repairChromosome(best, this.input.rooms);
        
        return best;
    }

    private initializePopulation() {
        const totalSlots = DAYS.length * SLOTS_PER_DAY;

        // Warm Start: If existing schedules provided, use them as seeds
        if (this.input.existingSchedules && this.input.existingSchedules.length > 0) {
            const seedGenes: Gene[] = this.input.existingSchedules.map(s => ({
                subjectId: s.subject?._id,
                professorId: s.professor?._id,
                roomId: s.room, // Note: Schema uses string for room
                slotId: this.getSlotId(s.day, s.startTime),
                groups: s.groups || [s.group].filter(Boolean),
                type: s.subject?.type
            }));
            this.population.push(evaluateFitness({ genes: seedGenes, fitness: 0, conflicts: [] }));
        }

        // Smart Initialization: Greedy-ish
        while (this.population.length < this.populationSize) {
            const genes: Gene[] = this.input.subjects.flatMap(sub => {
                const dayIdx = Math.floor(Math.random() * DAYS.length);
                const slotIdx = Math.floor(Math.random() * SLOTS_PER_DAY);
                const room = this.input.rooms[Math.floor(Math.random() * this.input.rooms.length)];
                
                const baseGene = {
                    subjectId: sub._id,
                    professorId: sub.professor?._ref || sub.professor?._id,
                    roomId: room.name,
                    slotId: dayIdx * SLOTS_PER_DAY + slotIdx,
                    level: sub.level,
                    specialty: sub.specialty,
                    type: sub.type
                };

                // Split TD/TP into separate genes for each group
                if ((sub.type === "TD" || sub.type === "TP") && sub.groups && sub.groups.length > 1) {
                    return sub.groups.map(group => ({
                        ...baseGene,
                        groups: [group],
                        // Randomize slot slightly for each group to avoid starting with immediate horizontal conflicts
                        slotId: Math.min(totalSlots - 1, baseGene.slotId + Math.floor(Math.random() * 5))
                    }));
                }

                // Lectures (Cours) or single-group TD/TP stay as one gene
                return [{
                    ...baseGene,
                    groups: sub.groups || [sub.group].filter(Boolean)
                }];
            });
            this.population.push(evaluateFitness({ genes, fitness: 0, conflicts: [] }));
        }
        
        this.sortPopulation();
    }

    private evolve() {
        const newPopulation: Chromosome[] = [this.population[0]]; // Elitism

        while (newPopulation.length < this.populationSize) {
            const p1 = this.tournamentSelect();
            const p2 = this.tournamentSelect();
            let child = this.crossover(p1, p2);
            child = this.mutate(child);
            newPopulation.push(evaluateFitness(child));
        }

        this.population = newPopulation;
        this.sortPopulation();
    }

    private tournamentSelect(): Chromosome {
        const tSize = 3;
        let best = this.population[Math.floor(Math.random() * this.populationSize)];
        for (let i = 1; i < tSize; i++) {
            const next = this.population[Math.floor(Math.random() * this.populationSize)];
            if (next.fitness < best.fitness) best = next;
        }
        return best;
    }

    private crossover(p1: Chromosome, p2: Chromosome): Chromosome {
        const midpoint = Math.floor(p1.genes.length / 2);
        const genes = [...p1.genes.slice(0, midpoint), ...p2.genes.slice(midpoint)];
        return { genes, fitness: 0, conflicts: [] };
    }

    private mutate(chromosome: Chromosome): Chromosome {
        const genes = [...chromosome.genes];
        const mutationRate = 0.08; // Increased mutation rate
        const totalSlots = DAYS.length * SLOTS_PER_DAY;

        for (let i = 0; i < genes.length; i++) {
            if (Math.random() < mutationRate) {
                if (Math.random() < 0.3) {
                    // Smart Mutation: Try to move to a day where the professor already has classes
                    const profDays = new Set(genes.filter(g => g.professorId === genes[i].professorId).map(g => Math.floor(g.slotId / SLOTS_PER_DAY)));
                    if (profDays.size > 0) {
                        const targetDay = Array.from(profDays)[Math.floor(Math.random() * profDays.size)];
                        const targetSlot = targetDay * SLOTS_PER_DAY + Math.floor(Math.random() * SLOTS_PER_DAY);
                        genes[i] = { ...genes[i], slotId: targetSlot };
                        continue;
                    }
                }
                // Random move
                genes[i] = { ...genes[i], slotId: Math.floor(Math.random() * totalSlots) };
            }
        }
        return { ...chromosome, genes };
    }

    private performTabuSearch(chromosome: Chromosome): Chromosome {
        let best = { ...chromosome };
        const maxIterations = 50;

        for (let i = 0; i < maxIterations; i++) {
            // Find a conflict and try to resolve it
            const neighbors = this.generateNeighbors(best);
            const filteredNeighbors = neighbors.filter(n => !this.tabuList.includes(this.getHash(n)));
            
            if (filteredNeighbors.length === 0) break;
            
            const nextBest = filteredNeighbors.sort((a, b) => a.fitness - b.fitness)[0];
            
            if (nextBest.fitness < best.fitness) {
                best = nextBest;
                this.updateTabuList(this.getHash(best));
            }
        }
        return best;
    }

    private generateNeighbors(chromosome: Chromosome): Chromosome[] {
        const neighbors: Chromosome[] = [];
        const totalSlots = DAYS.length * SLOTS_PER_DAY;

        // Try 5 random swaps or moves
        for (let i = 0; i < 5; i++) {
            const genes = [...chromosome.genes];
            const idx = Math.floor(Math.random() * genes.length);
            genes[idx] = { ...genes[idx], slotId: Math.floor(Math.random() * totalSlots) };
            neighbors.push(evaluateFitness({ genes, fitness: 0, conflicts: [] }));
        }
        return neighbors;
    }

    private sortPopulation() {
        this.population.sort((a, b) => a.fitness - b.fitness);
    }

    private getSlotId(day: string, time: string): number {
        const dayIdx = DAYS.indexOf(day as any);
        const slotIdx = Math.floor((parseInt(time.split(":")[0]) - 8) / 1.5);
        return dayIdx * SLOTS_PER_DAY + Math.max(0, slotIdx);
    }

    private getHash(c: Chromosome): string {
        return c.genes.map(g => `${g.subjectId}-${g.slotId}`).join("|");
    }

    private updateTabuList(hash: string) {
        this.tabuList.push(hash);
        if (this.tabuList.length > this.tabuSize) this.tabuList.shift();
    }
}

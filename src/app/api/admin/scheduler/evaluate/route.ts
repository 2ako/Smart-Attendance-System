import { NextResponse } from "next/server";
import { evaluateFitness } from "@/lib/scheduler/constraints";
import { Chromosome } from "@/lib/scheduler/types";

export async function POST(req: Request) {
    try {
        const { genes } = await req.json();
        
        if (!genes || !Array.isArray(genes)) {
            return NextResponse.json({ error: "Invalid genes data" }, { status: 400 });
        }

        // Evaluate the proposed schedule
        const mockChromosome: Chromosome = {
            genes,
            fitness: 0,
            conflicts: [],
        };

        const result = evaluateFitness(mockChromosome, true);

        return NextResponse.json({
            success: true,
            stats: result.stats,
            conflicts: result.conflicts
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

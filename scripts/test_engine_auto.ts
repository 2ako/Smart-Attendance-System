import { SchedulerEngine } from "../src/lib/scheduler/engine.js";

async function testAutoAssignment() {
    console.log("--- Testing Auto-Assignment Logic ---");

    const mockInput = {
        subjects: [
            { _id: "sub_1", name: "Mathematics", type: "Cours", level: { _id: "l1", name: "L1" }, specialty: { _id: "s1", name: "CS" } },
            { _id: "sub_2", name: "Physics", type: "Cours", professor: { _id: "p1", firstName: "Albert" }, level: { _id: "l1", name: "L1" }, specialty: { _id: "s1", name: "CS" } }
        ],
        professors: [
            { _id: "p1", firstName: "Albert", lastName: "Einstein" },
            { _id: "p2", firstName: "Isaac", lastName: "Newton" }
        ],
        rooms: [
            { name: "Room A", type: "SALLE" }
        ]
    };

    const engine = new SchedulerEngine(mockInput as any);
    
    // We expect sub_1 to be assigned to Isaac Newton (p2) because p1 already has sub_2
    const result = await engine.generate();

    const gene1 = result.genes.find(g => g.subjectId === "sub_1");
    const gene2 = result.genes.find(g => g.subjectId === "sub_2");

    console.log(`Subject 1 (Math) assigned to: ${gene1?.professorName} (${gene1?.professorId})`);
    console.log(`Subject 2 (Physics) assigned to: ${gene2?.professorName} (${gene2?.professorId})`);

    if (gene1?.professorId === "p2") {
        console.log("SUCCESS: Auto-assignment worked!");
    } else {
        console.log("FAILURE: Auto-assignment did not pick p2.");
    }
}

testAutoAssignment().catch(console.error);

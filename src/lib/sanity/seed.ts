/**
 * Seed Script to create initial users in Sanity
 * Run this with: npx tsx src/lib/sanity/seed.ts
 */

import { createClient } from "@sanity/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    apiVersion: "2023-05-03",
});

async function seed() {
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        {
            _type: "user",
            name: "Admin User",
            email: "admin@university.edu",
            password: hashedPassword,
            role: "admin",
        },
        {
            _type: "user",
            name: "Professor Smith",
            email: "smith@university.edu",
            password: hashedPassword,
            role: "professor",
        },
        {
            _type: "user",
            name: "Ammar Student",
            email: "ammar@university.edu",
            password: hashedPassword,
            role: "student",
        },
    ];

    console.log("🚀 Seeding users...");

    for (const user of users) {
        try {
            const existing = await client.fetch(`*[_type == "user" && email == $email][0]`, {
                email: user.email,
            });

            if (existing) {
                console.log(`ℹ️ User ${user.email} already exists. Skipping.`);
                continue;
            }

            const doc = await client.create(user);
            console.log(`✅ Created user: ${user.email} (${doc._id})`);

            // If student, create student profile
            if (user.role === "student") {
                await client.create({
                    _type: "student",
                    user: { _type: "reference", _ref: doc._id },
                    studentId: "STU-" + Math.floor(Math.random() * 1000000),
                    group: "G1",
                });
            }

            // If professor, create professor profile
            if (user.role === "professor") {
                await client.create({
                    _type: "professor",
                    user: { _type: "reference", _ref: doc._id },
                    employeeId: "EMP-" + Math.floor(Math.random() * 100000),
                    department: "Computer Science",
                });
            }
        } catch (err) {
            console.error(`❌ Error creating ${user.email}:`, err);
        }
    }

    console.log("\n✨ Seeding complete!");
    console.log("\nDefault credentials for all users:");
    console.log("Password: password123");
}

seed();

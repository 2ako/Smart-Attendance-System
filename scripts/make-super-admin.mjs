import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
});

async function promote() {
    console.log("Looking for admin accounts...");
    const admins = await sanityClient.fetch(`*[_type == "user" && role == "admin" && defined(studyField)]`);
    
    if (admins.length > 0) {
        const tx = sanityClient.transaction();
        admins.forEach((u) => {
            tx.patch(u._id, { unset: ["studyField"] });
            console.log(`Promoting ${u.name} (removing studyField)...`);
        });
        await tx.commit();
        console.log("All scoped admins have been promoted to Super Admin.");
    } else {
        console.log("No scoped admins found. You may already be a Super Admin.");
    }
}

promote().catch(console.error);

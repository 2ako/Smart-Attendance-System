import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs"; // Assuming they use bcrypt for passwords

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

async function setupAdmins() {
    console.log("Setting up the required admin accounts...");
    
    // Hash a default password for any new users
    const defaultPassword = await bcrypt.hash("admin123", 10);
    
    const admins = await sanityClient.fetch(`*[_type == "user" && role == "admin"]`);
    console.log(`Found ${admins.length} admin accounts in the database.`);

    const tx = sanityClient.transaction();

    // 1. Super Admin: admin@university.edu
    const superAdmin = admins.find(a => a.email === "admin@university.edu") || admins[0];
    if (superAdmin) {
        tx.patch(superAdmin._id, { 
            set: { email: "admin@university.edu", name: "University Director" },
            unset: ["studyField"] 
        });
        console.log(`Configured Super Admin: ${superAdmin._id} -> admin@university.edu`);
    } else {
        // If NO admins exist (shouldn't happen), create one
        const newSuperAdmin = {
            _type: "user",
            name: "University Director",
            username: "admin_super",
            email: "admin@university.edu",
            password: defaultPassword,
            role: "admin"
        };
        tx.create(newSuperAdmin);
        console.log("Created new Super Admin: admin@university.edu");
    }

    // 2. Scoped Admin: admin-info@university.edu
    let infoAdmin = admins.find(a => a.email === "admin-info@university.edu" || (a.studyField === "INFORMATIQUE" && a._id !== superAdmin?._id));
    if (infoAdmin) {
        tx.patch(infoAdmin._id, { 
            set: { email: "admin-info@university.edu", name: "Informatique Director", studyField: "INFORMATIQUE" } 
        });
        console.log(`Configured Info Admin: ${infoAdmin._id} -> admin-info@university.edu`);
    } else {
        const newInfoAdmin = {
            _type: "user",
            name: "Informatique Director",
            username: "admin_info",
            email: "admin-info@university.edu",
            password: defaultPassword,
            role: "admin",
            studyField: "INFORMATIQUE"
        };
        tx.create(newInfoAdmin);
        console.log("Created new Info Admin: admin-info@university.edu (password: admin123)");
    }

    await tx.commit();
    console.log("Admin accounts configured successfully!");
    
    // Print current admins
    const updatedAdmins = await sanityClient.fetch(`*[_type == "user" && role == "admin"]{ name, email, studyField, username }`);
    console.log(JSON.stringify(updatedAdmins, null, 2));
}

setupAdmins().catch(console.error);

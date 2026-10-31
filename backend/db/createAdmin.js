
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("./pool");

async function createAdmin() {
    try {
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error("Missing admin environment variables");
        }

        if (ADMIN_PASSWORD.length <= 8 ||
            !/[A-Z]/.test(ADMIN_PASSWORD) ||
            !/[a-z]/.test(ADMIN_PASSWORD) ||
            !/[^A-Za-z0-9]/.test(ADMIN_PASSWORD)) {
            throw new Error("Admin password does not meet requirements");
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [ADMIN_EMAIL]
        );

        if (existing.rows.length > 0) {
            console.log("Admin account already exists.");
            return;
        }

        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

        await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'admin')`,
            [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
        );

        console.log("Initial admin account created successfully!");

    } catch (error) {
        console.error("Admin creation failed:", error.message);
    } finally {
        await pool.end();
    }
}

createAdmin();

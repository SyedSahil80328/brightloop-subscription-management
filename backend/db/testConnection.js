const pool = require("./pool");

async function testConnection() {
    try {
        const result = await pool.query(
            "SELECT NOW(), current_database()"
        );

        console.log("Database connected successfully!");
        console.log(result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await pool.end();
    }
}

testConnection();
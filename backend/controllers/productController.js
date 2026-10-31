const pool = require("../db/pool");

// Create product
exports.createProduct = async (req, res) => {
    try {
        const { name, type, sales_price, cost_price, notes } = req.body;

        if (!name || !type || sales_price == null || cost_price == null) {
            return res.status(400).json({
                message: "Name, type, sales price and cost price are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO products (name, type, sales_price, cost_price, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, type, sales_price, cost_price, notes || null]
        );

        res.status(201).json({
            message: "Product created successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at DESC`
        );

        res.status(200).json({ products: result.rows });

    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, sales_price, cost_price, notes } = req.body;

        const result = await pool.query(
            `UPDATE products
             SET name = COALESCE($1, name),
                 type = COALESCE($2, type),
                 sales_price = COALESCE($3, sales_price),
                 cost_price = COALESCE($4, cost_price),
                 notes = COALESCE($5, notes)
             WHERE id = $6
             RETURNING *`,
            [name, type, sales_price, cost_price, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product updated successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product deleted successfully" });

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
const pool = require("../db/pool");

// Create variant
exports.createVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variant_name, price_adjustment } = req.body;

        if (!variant_name || price_adjustment == null) {
            return res.status(400).json({
                message: "Variant name and price adjustment are required"
            });
        }

        const product = await pool.query(
            "SELECT id FROM products WHERE id = $1 AND is_active = TRUE",
            [productId]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        const result = await pool.query(
            `INSERT INTO product_variants
             (product_id, variant_name, price_adjustment)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [productId, variant_name.trim(), price_adjustment]
        );

        res.status(201).json({
            message: "Variant created successfully",
            variant: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Variant already exists for this product"
            });
        }
        console.error("Create variant error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get variants of a product
exports.getVariants = async (req, res) => {
    try {
        const { productId } = req.params;

        const result = await pool.query(
            `SELECT pv.* FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             WHERE pv.product_id = $1 AND p.is_active = TRUE
             ORDER BY pv.id`,
            [productId]
        );

        res.status(200).json({ variants: result.rows });

    } catch (error) {
        console.error("Get variants error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update variant
exports.updateVariant = async (req, res) => {
    try {
        const { id } = req.params;
        const { variant_name, price_adjustment } = req.body;

        if (variant_name === undefined && price_adjustment === undefined) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const result = await pool.query(
            `UPDATE product_variants
             SET variant_name = COALESCE($1, variant_name),
                 price_adjustment = COALESCE($2, price_adjustment)
             WHERE id = $3
             RETURNING *`,
            [variant_name?.trim() ?? null, price_adjustment ?? null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Variant not found" });
        }

        res.status(200).json({
            message: "Variant updated successfully",
            variant: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Variant name already exists for this product"
            });
        }
        console.error("Update variant error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete variant
exports.deleteVariant = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM product_variants WHERE id = $1 RETURNING id",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Variant not found" });
        }

        res.status(200).json({ message: "Variant deleted successfully" });

    } catch (error) {
        if (error.code === "23503") {
            return res.status(409).json({
                message: "Cannot delete a variant already used in records"
            });
        }
        console.error("Delete variant error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
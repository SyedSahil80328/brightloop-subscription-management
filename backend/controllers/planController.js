const pool = require("../db/pool");

// Create plan
exports.createPlan = async (req, res) => {
    try {
        const {
            product_id,
            name,
            price,
            billing_interval,
            minimum_quantity,
            available_from,
            available_until,
            auto_close_on_expiry,
            allow_early_close,
            allow_pause,
            allow_renewal
        } = req.body;

        // Validate required fields
        if (!product_id || !name || price == null ||
            !billing_interval || !available_from) {
            return res.status(400).json({
                message: "Required fields are missing"
            });
        }

        // Check whether product exists and is active
        const product = await pool.query(
            `SELECT id FROM products
             WHERE id = $1 AND is_active = TRUE`,
            [product_id]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({
                message: "Product not found or inactive"
            });
        }

        // Create plan
        const result = await pool.query(
            `INSERT INTO plans (
                product_id, name, price, billing_interval,
                minimum_quantity, available_from, available_until,
                auto_close_on_expiry, allow_early_close,
                allow_pause, allow_renewal
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                product_id, name.trim(), price, billing_interval,
                minimum_quantity || 1, available_from, available_until || null,
                auto_close_on_expiry ?? false,
                allow_early_close ?? true,
                allow_pause ?? true,
                allow_renewal ?? true
            ]
        );

        res.status(201).json({
            message: "Plan created successfully",
            plan: result.rows[0]
        });

    } catch (error) {
        console.error("Create plan error:", error);
        res.status(500).json({
            message: "Could not create plan"
        });
    }
};

// List active plans
exports.getPlans = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, pr.name AS product_name
             FROM plans p
             JOIN products pr ON p.product_id = pr.id
             WHERE p.is_active = TRUE AND pr.is_active = TRUE
             ORDER BY p.id DESC`
        );

        res.status(200).json({ plans: result.rows });

    } catch (error) {
        console.error("Get plans error:", error);
        res.status(500).json({ message: "Could not fetch plans" });
    }
};
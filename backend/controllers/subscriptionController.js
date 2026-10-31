const pool = require("../db/pool");

// GET /api/subscriptions/customers
// Admin and staff can retrieve customers for subscription creation.
exports.getCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, email
            FROM users
            WHERE role = 'customer' AND is_active = TRUE
            ORDER BY name ASC
        `);

        res.json({ customers: result.rows });
    } catch (error) {
        console.error("Get customers error:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
};


// POST /api/subscriptions
// Admin and staff can create draft subscriptions.
exports.createSubscription = async (req, res) => {
    const {
        customer_id: requestedCustomerId,
        plan_id,
        start_date,
        expiry_date,
        payment_terms_days = 0,
        quantity
    } = req.body;

    // Customers can only create subscriptions for themselves.
    const customer_id = req.user.role === "customer"
        ? req.user.id
        : requestedCustomerId;

    if (!customer_id || !plan_id || !start_date || !quantity) {
        return res.status(400).json({
            message: "Customer, plan, start date and quantity are required"
        });
    }

    if (
        !Number.isInteger(Number(customer_id)) ||
        !Number.isInteger(Number(plan_id)) ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0 ||
        !Number.isInteger(Number(payment_terms_days)) ||
        Number(payment_terms_days) < 0
    ) {
        return res.status(400).json({ message: "Invalid subscription details" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Validate customer.
        const customer = await client.query(
            `SELECT id FROM users
             WHERE id = $1 AND role = 'customer' AND is_active = TRUE`,
            [customer_id]
        );

        if (customer.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Customer not found or inactive" });
        }

        // Validate plan and associated product.
        const planResult = await client.query(
            `SELECT p.*, pr.id AS associated_product_id
             FROM plans p
             JOIN products pr ON pr.id = p.product_id
             WHERE p.id = $1
               AND p.is_active = TRUE
               AND pr.is_active = TRUE`,
            [plan_id]
        );

        if (planResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Plan not found or inactive" });
        }

        const plan = planResult.rows[0];

        if (Number(quantity) < plan.minimum_quantity) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: `Minimum quantity for this plan is ${plan.minimum_quantity}`
            });
        }

        const availableFrom = plan.available_from instanceof Date
            ? plan.available_from.toISOString().slice(0, 10)
            : String(plan.available_from).slice(0, 10);

        const availableUntil = plan.available_until
            ? (plan.available_until instanceof Date
                ? plan.available_until.toISOString().slice(0, 10)
                : String(plan.available_until).slice(0, 10))
            : null;

        if (
            start_date < availableFrom ||
            (availableUntil && start_date > availableUntil)
        ) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Plan is not available on the selected start date"
            });
        }

        if (expiry_date && expiry_date < start_date) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Expiry date cannot be earlier than start date"
            });
        }

        // Generate a readable unique subscription number.
        const sequenceResult = await client.query(
            `SELECT nextval(
                pg_get_serial_sequence('public.subscriptions', 'id')
            ) AS id`
        );

        const subscriptionId = Number(sequenceResult.rows[0].id);
        const subscriptionNumber =
            `SUB-${String(subscriptionId).padStart(6, "0")}`;

        // Create draft subscription.
        const subscriptionResult = await client.query(
            `INSERT INTO subscriptions (
                id, subscription_number, customer_id, plan_id,
                status, start_date, expiry_date,
                next_billing_date, payment_terms_days
            )
            VALUES ($1, $2, $3, $4, 'draft', $5, $6, $5, $7)
            RETURNING *`,
            [
                subscriptionId,
                subscriptionNumber,
                customer_id,
                plan_id,
                start_date,
                expiry_date || null,
                payment_terms_days
            ]
        );

        // Automatically add the plan's product as a subscription line.
        const lineResult = await client.query(
            `INSERT INTO subscription_lines (
                subscription_id, product_id, quantity,
                unit_price, is_plan_item
            )
            VALUES ($1, $2, $3, $4, TRUE)
            RETURNING *`,
            [
                subscriptionId,
                plan.associated_product_id,
                quantity,
                plan.price
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Draft subscription created successfully",
            subscription: subscriptionResult.rows[0],
            lines: lineResult.rows
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create subscription error:", error);
        res.status(500).json({ message: "Failed to create subscription" });
    } finally {
        client.release();
    }
};


// GET /api/subscriptions
// Customers see only their subscriptions; admin/staff see all.
exports.getSubscriptions = async (req, res) => {
    try {
        let query = `
            SELECT
                s.*,
                u.name AS customer_name,
                u.email AS customer_email,
                p.name AS plan_name,
                p.billing_interval,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', sl.id,
                            'product_id', sl.product_id,
                            'quantity', sl.quantity,
                            'unit_price', sl.unit_price,
                            'is_plan_item', sl.is_plan_item
                        )
                    ) FILTER (WHERE sl.id IS NOT NULL),
                    '[]'
                ) AS lines
            FROM subscriptions s
            JOIN users u ON u.id = s.customer_id
            JOIN plans p ON p.id = s.plan_id
            LEFT JOIN subscription_lines sl
                ON sl.subscription_id = s.id
        `;

        const values = [];

        if (req.user.role === "customer") {
            query += ` WHERE s.customer_id = $1`;
            values.push(req.user.id);
        }

        query += `
            GROUP BY s.id, u.name, u.email, p.name, p.billing_interval
            ORDER BY s.created_at DESC
        `;

        const result = await pool.query(query, values);

        res.json({ subscriptions: result.rows });

    } catch (error) {
        console.error("Get subscriptions error:", error);
        res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
};

// PATCH /api/subscriptions/:id/status
exports.updateSubscriptionStatus = async (req, res) => {
    const { status: newStatus } = req.body;
    const subscriptionId = req.params.id;

    const allowedTransitions = {
        draft: ["quotation"],
        quotation: ["confirmed"],
        confirmed: ["active"],
        active: ["paused", "closed"],
        paused: ["active", "closed"]
    };

    if (!allowedTransitions[newStatus] &&
        !["draft", "quotation", "confirmed", "active", "paused", "closed"].includes(newStatus)) {
        return res.status(400).json({ message: "Invalid subscription status" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT s.*, p.allow_pause, p.allow_early_close
             FROM subscriptions s
             JOIN plans p ON p.id = s.plan_id
             WHERE s.id = $1
             FOR UPDATE OF s`,
            [subscriptionId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Subscription not found" });
        }

        const subscription = result.rows[0];
        const currentStatus = subscription.status;

        if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: `Cannot change status from ${currentStatus} to ${newStatus}`
            });
        }

        if (newStatus === "paused" && !subscription.allow_pause) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Pausing is not allowed for this plan"
            });
        }

        if (
            newStatus === "closed" &&
            !subscription.allow_early_close &&
            subscription.expiry_date &&
            new Date(subscription.expiry_date) > new Date()
        ) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Early closure is not allowed for this plan"
            });
        }

        const updated = await client.query(
            `UPDATE subscriptions
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [newStatus, subscriptionId]
        );

        await client.query("COMMIT");

        res.json({
            message: `Subscription ${newStatus} successfully`,
            subscription: updated.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Update subscription status error:", error);
        res.status(500).json({ message: "Failed to update subscription status" });
    } finally {
        client.release();
    }
};
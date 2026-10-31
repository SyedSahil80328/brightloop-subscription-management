
const pool = require("../db/pool");

exports.getDashboardStats = async (req, res) => {
    try {
        const customerId = req.user.role === "customer"
            ? req.user.id
            : null;

        const result = await pool.query(
            `SELECT
                (
                    SELECT COUNT(*)
                    FROM subscriptions
                    WHERE status = 'active'
                    AND ($1::int IS NULL OR customer_id = $1)
                ) AS active_subscriptions,

                (
                    SELECT COALESCE(SUM(p.amount), 0)
                    FROM payments p
                    JOIN invoices i ON i.id = p.invoice_id
                    WHERE ($1::int IS NULL OR i.customer_id = $1)
                ) AS total_revenue,

                (
                    SELECT COALESCE(SUM(total_amount - amount_paid), 0)
                    FROM invoices
                    WHERE status = 'confirmed'
                    AND ($1::int IS NULL OR customer_id = $1)
                ) AS outstanding_invoices,

                (
                    SELECT COUNT(*)
                    FROM payments p
                    JOIN invoices i ON i.id = p.invoice_id
                    WHERE ($1::int IS NULL OR i.customer_id = $1)
                ) AS total_payments`,
            [customerId]
        );

        res.json({ stats: result.rows[0] });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: "Failed to load dashboard statistics" });
    }
};

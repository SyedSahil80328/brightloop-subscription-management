
const pool = require("../db/pool");

exports.recordPayment = async (req, res) => {
    const { invoice_id, payment_method, amount, note } = req.body;

    if (!invoice_id || !payment_method || !amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Valid invoice, payment method and amount are required" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            "SELECT * FROM invoices WHERE id = $1 FOR UPDATE",
            [invoice_id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Invoice not found" });
        }

        const invoice = result.rows[0];

        if (invoice.status !== "confirmed") {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Only confirmed invoices can receive payments" });
        }

        const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid);
        const paymentAmount = Number(amount);

        if (paymentAmount > outstanding) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: `Payment exceeds outstanding balance of ${outstanding}`
            });
        }

        await client.query(
            `INSERT INTO payments (invoice_id, payment_method, amount, note)
             VALUES ($1, $2, $3, $4)`,
            [invoice_id, payment_method, paymentAmount, note || null]
        );

        const newAmountPaid = Number(invoice.amount_paid) + paymentAmount;
        const newStatus = newAmountPaid >= Number(invoice.total_amount) ? "paid" : "confirmed";

        await client.query(
            `UPDATE invoices
             SET amount_paid = $1, status = $2
             WHERE id = $3`,
            [newAmountPaid, newStatus, invoice_id]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Payment recorded successfully",
            amount_paid: newAmountPaid,
            outstanding: Number(invoice.total_amount) - newAmountPaid,
            invoice_status: newStatus
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Record payment error:", error);
        res.status(500).json({ message: "Failed to record payment" });
    } finally {
        client.release();
    }
};

exports.getPayments = async (req, res) => {
    try {
        let query = `
            SELECT
                p.id,
                p.invoice_id,
                p.payment_method,
                p.amount,
                p.payment_date,
                p.note,
                i.invoice_number,
                u.name AS customer_name
            FROM payments p
            JOIN invoices i ON i.id = p.invoice_id
            JOIN users u ON u.id = i.customer_id
        `;

        const values = [];

        if (req.user.role === "customer") {
            query += " WHERE i.customer_id = $1";
            values.push(req.user.id);
        }

        query += " ORDER BY p.payment_date DESC";

        const result = await pool.query(query, values);

        res.json({ payments: result.rows });
    } catch (error) {
        console.error("Get payments error:", error);
        res.status(500).json({ message: "Failed to fetch payments" });
    }
};

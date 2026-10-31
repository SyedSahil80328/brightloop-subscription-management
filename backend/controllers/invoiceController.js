const pool = require("../db/pool");
const crypto = require("crypto");

// Calculate the end of a billing period.
function getBillingPeriodEnd(startDate, interval) {
    // PostgreSQL DATE values may arrive as Date objects.
    const dateString = startDate instanceof Date
        ? startDate.toISOString().slice(0, 10)
        : String(startDate).slice(0, 10);

    const [year, month, day] = dateString.split("-").map(Number);

    if (!year || !month || !day) {
        throw new Error("Invalid billing start date");
    }

    const end = new Date(Date.UTC(year, month - 1, day));

    switch (interval) {
        case "daily":
            end.setUTCDate(end.getUTCDate() + 1);
            break;
        case "weekly":
            end.setUTCDate(end.getUTCDate() + 7);
            break;
        case "monthly":
            end.setUTCMonth(end.getUTCMonth() + 1);
            break;
        case "yearly":
            end.setUTCFullYear(end.getUTCFullYear() + 1);
            break;
        default:
            throw new Error("Invalid billing interval");
    }

    end.setUTCDate(end.getUTCDate() - 1);

    return end.toISOString().slice(0, 10);
}


// POST /api/invoices/generate/:subscriptionId
exports.generateInvoice = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the subscription to prevent concurrent invoice generation.
        const subscriptionResult = await client.query(
            `SELECT
                s.*,
                p.name AS plan_name,
                p.billing_interval,
                u.name AS customer_name
             FROM subscriptions s
             JOIN plans p ON p.id = s.plan_id
             JOIN users u ON u.id = s.customer_id
             WHERE s.id = $1
             FOR UPDATE OF s`,
            [req.params.subscriptionId]
        );

        if (subscriptionResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Subscription not found"
            });
        }

        const subscription = subscriptionResult.rows[0];

        if (subscription.status !== "active") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Invoices can only be generated for active subscriptions"
            });
        }

        const rawBillingStart =
            subscription.next_billing_date || subscription.start_date;

        const billingStart = rawBillingStart instanceof Date
            ? rawBillingStart.toISOString().slice(0, 10)
            : String(rawBillingStart).slice(0, 10);

        if (subscription.expiry_date &&
            billingStart > String(subscription.expiry_date).slice(0, 10)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Subscription has expired"
            });
        }

        const billingEnd = getBillingPeriodEnd(
            billingStart,
            subscription.billing_interval
        );

        const linesResult = await client.query(
            `SELECT
                sl.product_id,
                sl.variant_id,
                sl.quantity,
                sl.unit_price,
                pr.name AS product_name,
                pv.variant_name,
                COALESCE(t.rate, 0) AS tax_rate
             FROM subscription_lines sl
             JOIN products pr ON pr.id = sl.product_id
             LEFT JOIN product_variants pv ON pv.id = sl.variant_id
             LEFT JOIN taxes t ON t.id = sl.tax_id AND t.is_active = TRUE
             WHERE sl.subscription_id = $1`,
            [subscription.id]
        );

        if (linesResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Subscription has no invoiceable items"
            });
        }

        let subtotal = 0;
        let taxTotal = 0;

        const invoiceLines = linesResult.rows.map(line => {
            const quantity = Number(line.quantity);
            const unitPrice = Number(line.unit_price);
            const taxRate = Number(line.tax_rate);

            const lineSubtotal = quantity * unitPrice;
            const taxAmount = lineSubtotal * taxRate / 100;
            const lineTotal = lineSubtotal + taxAmount;

            subtotal += lineSubtotal;
            taxTotal += taxAmount;

            return {
                ...line,
                taxRate,
                lineTotal
            };
        });

        // Round monetary totals to two decimal places.
        subtotal = Number(subtotal.toFixed(2));
        taxTotal = Number(taxTotal.toFixed(2));
        const totalAmount = Number((subtotal + taxTotal).toFixed(2));

        const invoiceNumber =
            `INV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        const invoiceResult = await client.query(
            `INSERT INTO invoices (
                invoice_number,
                subscription_id,
                customer_id,
                billing_period_start,
                billing_period_end,
                invoice_date,
                due_date,
                subtotal,
                discount_total,
                tax_total,
                total_amount
             )
             VALUES (
                $1, $2, $3, $4, $5,
                CURRENT_DATE,
                CURRENT_DATE + $6::integer,
                $7, 0, $8, $9
             )
             RETURNING *`,
            [
                invoiceNumber,
                subscription.id,
                subscription.customer_id,
                billingStart,
                billingEnd,
                subscription.payment_terms_days,
                subtotal,
                taxTotal,
                totalAmount
            ]
        );

        const invoice = invoiceResult.rows[0];

        for (const line of invoiceLines) {
            const description = line.variant_name
                ? `${line.product_name} - ${line.variant_name}`
                : line.product_name;

            const lineSubtotal = Number(line.quantity) * Number(line.unit_price);
            const taxAmount = lineSubtotal * line.taxRate / 100;
            const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

            await client.query(
                `INSERT INTO invoice_lines (
                    invoice_id,
                    product_id,
                    variant_id,
                    description,
                    quantity,
                    unit_price,
                    tax_rate,
                    discount_amount,
                    line_total
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)`,
                [
                    invoice.id,
                    line.product_id,
                    line.variant_id,
                    description,
                    line.quantity,
                    line.unit_price,
                    line.taxRate,
                    lineTotal
                ]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Invoice generated successfully",
            invoice
        });

    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === "23505") {
            return res.status(409).json({
                message: "An invoice already exists for this billing period"
            });
        }

        console.error("Generate invoice error:", error);

        return res.status(500).json({
            message: "Unable to generate invoice"
        });

    } finally {
        client.release();
    }
};


// GET /api/invoices
exports.getInvoices = async (req, res) => {
    try {
        const isCustomer = req.user.role === "customer";

        const result = await pool.query(
            `SELECT
                i.*,
                s.subscription_number,
                u.name AS customer_name,
                u.email AS customer_email,
                COUNT(il.id)::integer AS line_count
             FROM invoices i
             JOIN subscriptions s ON s.id = i.subscription_id
             JOIN users u ON u.id = i.customer_id
             LEFT JOIN invoice_lines il ON il.invoice_id = i.id
             ${isCustomer ? "WHERE i.customer_id = $1" : ""}
             GROUP BY i.id, s.subscription_number, u.name, u.email
             ORDER BY i.created_at DESC`,
            isCustomer ? [req.user.id] : []
        );

        return res.json({ invoices: result.rows });

    } catch (error) {
        console.error("Get invoices error:", error);
        return res.status(500).json({
            message: "Unable to retrieve invoices"
        });
    }
};


// GET /api/invoices/:id
exports.getInvoiceById = async (req, res) => {
    try {
        const isCustomer = req.user.role === "customer";

        const result = await pool.query(
            `SELECT
                i.*,
                s.subscription_number,
                u.name AS customer_name,
                u.email AS customer_email
             FROM invoices i
             JOIN subscriptions s ON s.id = i.subscription_id
             JOIN users u ON u.id = i.customer_id
             WHERE i.id = $1
             ${isCustomer ? "AND i.customer_id = $2" : ""}`,
            isCustomer
                ? [req.params.id, req.user.id]
                : [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Invoice not found"
            });
        }

        const lines = await pool.query(
            `SELECT * FROM invoice_lines
             WHERE invoice_id = $1
             ORDER BY id`,
            [req.params.id]
        );

        return res.json({
            invoice: result.rows[0],
            lines: lines.rows
        });

    } catch (error) {
        console.error("Get invoice error:", error);
        return res.status(500).json({
            message: "Unable to retrieve invoice"
        });
    }
};


// PATCH /api/invoices/:id/status
exports.updateInvoiceStatus = async (req, res) => {
    const { status } = req.body;

    if (!["confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({
            message: "Only confirmed or cancelled status is allowed"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT * FROM invoices
             WHERE id = $1
             FOR UPDATE`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Invoice not found"
            });
        }

        const invoice = result.rows[0];

        if (invoice.status !== "draft") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Only draft invoices can be confirmed or cancelled"
            });
        }

        await client.query(
            `UPDATE invoices SET status = $1 WHERE id = $2`,
            [status, invoice.id]
        );

        // Advance the billing date only after invoice confirmation.
        if (status === "confirmed") {
            const rawEndDate = invoice.billing_period_end;

            const endDateString = rawEndDate instanceof Date
                ? rawEndDate.toISOString().slice(0, 10)
                : String(rawEndDate).slice(0, 10);

            const [year, month, day] = endDateString.split("-").map(Number);

            const nextDate = new Date(Date.UTC(year, month - 1, day));
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);

            const nextBillingDate = nextDate.toISOString().slice(0, 10);

            await client.query(
                `UPDATE subscriptions
                SET next_billing_date = $1
                WHERE id = $2`,
                [nextBillingDate, invoice.subscription_id]
            );
        }

        await client.query("COMMIT");

        return res.json({
            message: `Invoice ${status} successfully`
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Update invoice error:", error);

        return res.status(500).json({
            message: "Unable to update invoice"
        });

    } finally {
        client.release();
    }
};
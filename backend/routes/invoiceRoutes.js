const express = require("express");
const router = express.Router();

const {
    generateInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus
} = require("../controllers/invoiceController");

const {
    authenticate,
    authorize
} = require("../middleware/authMiddleware");

router.use(authenticate);

// Admin and staff can generate invoices.
router.post(
    "/generate/:subscriptionId",
    authorize("admin", "staff"),
    generateInvoice
);

// Customers see only their own invoices.
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);

// Only admin and staff can confirm or cancel invoices.
router.patch(
    "/:id/status",
    authorize("admin", "staff"),
    updateInvoiceStatus
);

module.exports = router;
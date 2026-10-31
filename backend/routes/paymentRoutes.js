const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/authMiddleware");
const { recordPayment, getPayments } =
    require("../controllers/paymentController");

router.get("/", authenticate, getPayments);
router.post("/", authenticate, authorize("admin", "staff", "customer"), recordPayment);

module.exports = router;
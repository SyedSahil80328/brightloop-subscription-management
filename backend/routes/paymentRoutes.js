
const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/authMiddleware");
const { recordPayment } = require("../controllers/paymentController");

router.post("/", authenticate, authorize("admin", "staff"), recordPayment);

module.exports = router;

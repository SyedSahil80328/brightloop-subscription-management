const express = require("express");
const router = express.Router();

const {
    getCustomers,
    createSubscription,
    getSubscriptions,
    updateSubscriptionStatus
} = require("../controllers/subscriptionController");

const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate);

router.get("/", getSubscriptions);

router.get(
    "/customers",
    authorize("admin", "staff"),
    getCustomers
);

router.post(
    "/",
    authorize("admin", "staff", "customer"),
    createSubscription
);

router.patch(
    "/:id/status",
    authorize("admin", "staff"),
    updateSubscriptionStatus
);

module.exports = router;
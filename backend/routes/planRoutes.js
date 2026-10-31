const express = require("express");
const router = express.Router();

const { createPlan, getPlans } =
    require("../controllers/planController");

const { authenticate, authorize } =
    require("../middleware/authMiddleware");

router.use(authenticate);

router.get("/", getPlans);
router.post("/", authorize("admin"), createPlan);

module.exports = router;
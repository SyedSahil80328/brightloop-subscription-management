const express = require("express");
const router = express.Router();

const {
    createVariant,
    getVariants,
    updateVariant,
    deleteVariant
} = require("../controllers/variantController");

const { authenticate, authorize } = require("../middleware/authMiddleware");

router.use(authenticate);

router.post("/products/:productId/variants", authorize("admin"), createVariant);
router.get("/products/:productId/variants", getVariants);
router.put("/variants/:id", authorize("admin"), updateVariant);
router.delete("/variants/:id", authorize("admin"), deleteVariant);

module.exports = router;
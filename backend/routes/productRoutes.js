const express = require("express");
const router = express.Router();

const {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const { authenticate, authorize } = require("../middleware/authMiddleware");

// All product routes require authentication
router.use(authenticate);

// View products: Admin, Staff, Customer
router.get("/", getProducts);

// Modifications: Admin only
router.post("/", authorize("admin"), createProduct);
router.put("/:id", authorize("admin"), updateProduct);
router.delete("/:id", authorize("admin"), deleteProduct);

module.exports = router;
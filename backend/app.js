require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Brightloop Subscription Management API is running!"
    });
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);
const variantRoutes = require("./routes/variantRoutes");
app.use("/api", variantRoutes);
const planRoutes = require("./routes/planRoutes");
app.use("/api/plans", planRoutes);
module.exports = app;
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
module.exports = app;
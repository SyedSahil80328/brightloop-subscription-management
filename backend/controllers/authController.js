
const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

// Password validation
const passwordSchema = z.string()
    .min(9)
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Must contain special character");

// CUSTOMER REGISTRATION
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const validation = passwordSchema.safeParse(password);

        if (!validation.success) {
            return res.status(400).json({
                message: "Password must be longer than 8 characters and contain uppercase, lowercase and special characters."
            });
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'customer')
             RETURNING id, name, email, role`,
            [name.trim(), email.trim().toLowerCase(), passwordHash]
        );

        return res.status(201).json({
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error.message);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// USER LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash, role, is_active
             FROM users WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (!user || !user.is_active) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


// GET CURRENT USER
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users WHERE id = $1 AND is_active = TRUE`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({ user: result.rows[0] });

    } catch (error) {
        console.error("Get user error:", error.message);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

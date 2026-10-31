const crypto = require("crypto");
const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const { sendPasswordResetEmail } = require("../utils/emailService");
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

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    const genericMessage = {
        message: "If an account exists for this email, a password reset link has been sent."
    };

    try {
        const result = await pool.query(
            `SELECT id, email FROM users
             WHERE email = $1 AND is_active = TRUE`,
            [email]
        );

        // Return the same response whether the account exists or not.
        if (result.rows.length === 0) {
            return res.json(genericMessage);
        }

        const user = result.rows[0];

        // Invalidate previous unused reset tokens.
        await pool.query(
            `UPDATE password_reset_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND used_at IS NULL`,
            [user.id]
        );

        // Generate a secure, random token.
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await pool.query(
            `INSERT INTO password_reset_tokens
             (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '20 minutes')`,
            [user.id, tokenHash]
        );

        const resetLink =
            `${process.env.FRONTEND_URL}/reset-password/${token}`;

        await sendPasswordResetEmail(user.email, resetLink);

        return res.json(genericMessage);

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            message: "Unable to process the request. Please try again later."
        });
    }
};


// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            message: "Reset token and new password are required"
        });
    }

    const passwordValidation =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

    if (!passwordValidation.test(password)) {
        return res.status(400).json({
            message: "Password must contain at least 9 characters, uppercase, lowercase and a special character"
        });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT id, user_id
             FROM password_reset_tokens
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()
             FOR UPDATE`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Reset link is invalid or has expired"
            });
        }

        const resetRecord = result.rows[0];
        const passwordHash = await bcrypt.hash(password, 12);

        await client.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [passwordHash, resetRecord.user_id]
        );

        await client.query(
            `UPDATE password_reset_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [resetRecord.id]
        );

        // Invalidate all other reset links for this user.
        await client.query(
            `UPDATE password_reset_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND used_at IS NULL`,
            [resetRecord.user_id]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Password reset successfully. Please sign in."
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Reset password error:", error);
        return res.status(500).json({
            message: "Unable to reset password"
        });
    } finally {
        client.release();
    }
};
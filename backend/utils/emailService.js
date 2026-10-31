const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendPasswordResetEmail = async (email, resetLink) => {
    await transporter.sendMail({
        from: `"Brightloop Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Reset your Brightloop password",
        text: `You requested a password reset.

Open this link to reset your password:
${resetLink}

This link expires in 20 minutes. If you did not request this, ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
                <h2>Reset your password</h2>
                <p>We received a request to reset your Brightloop password.</p>
                <p>
                    <a href="${resetLink}"
                       style="background:#5145cd;color:white;padding:12px 20px;
                              text-decoration:none;border-radius:6px;">
                        Reset Password
                    </a>
                </p>
                <p>This link expires in 20 minutes.</p>
                <p>If you did not request this, you can safely ignore this email.</p>
            </div>
        `
    });
};
import { useState } from "react";
import { apiRequest } from "../services/api";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPassword({ onBack }) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const data = await apiRequest("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email })
            });

            setSuccess(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleSubmit}>
                <div className="auth-icon">
                    <Mail size={26} />
                </div>

                <h2>Forgot Password?</h2>
                <p className="muted">
                    Enter your registered email address. We'll send you a
                    password reset link.
                </p>

                {error && <p className="error">{error}</p>}

                {success && (
                    <div className="reset-success">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}

                <label>Email Address</label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                />

                <button
                    type="submit"
                    className="primary-button auth-submit"
                    disabled={loading}
                >
                    {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <button
                    type="button"
                    className="auth-back"
                    onClick={onBack}
                >
                    <ArrowLeft size={15} /> Back to Sign In
                </button>
            </form>
        </div>
    );
}
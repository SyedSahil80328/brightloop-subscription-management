import { useState } from "react";
import { apiRequest } from "../services/api";
import { LockKeyhole, ArrowLeft, CheckCircle } from "lucide-react";

export default function ResetPassword({ token, onBack }) {
    const [form, setForm] = useState({
        password: "",
        confirmPassword: ""
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const data = await apiRequest("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                    token,
                    password: form.password
                })
            });

            setSuccess(data.message);
            setForm({ password: "", confirmPassword: "" });
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
                    <LockKeyhole size={26} />
                </div>

                <h2>Reset Password</h2>
                <p className="muted">
                    Create a new password for your Brightloop account.
                </p>

                {error && <p className="error">{error}</p>}

                {success ? (
                    <>
                        <div className="reset-success">
                            <CheckCircle size={18} />
                            <span>{success}</span>
                        </div>

                        <button
                            type="button"
                            className="primary-button auth-submit"
                            onClick={onBack}
                        >
                            Go to Sign In
                        </button>
                    </>
                ) : (
                    <>
                        <label>New Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Enter new password"
                            minLength={9}
                            required
                        />

                        <p className="password-hint">
                            At least 9 characters, including uppercase,
                            lowercase and a special character.
                        </p>

                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter new password"
                            required
                        />

                        <button
                            type="submit"
                            className="primary-button auth-submit"
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </>
                )}

                {!success && (
                    <button
                        type="button"
                        className="auth-back"
                        onClick={onBack}
                    >
                        <ArrowLeft size={15} /> Back to Sign In
                    </button>
                )}
            </form>
        </div>
    );
}
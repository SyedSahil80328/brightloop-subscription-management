import { useState } from "react";
import { apiRequest } from "../services/api";
import { UserPlus, ArrowLeft } from "lucide-react";

export default function Register({ onLogin, onBack }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password
                })
            });

            // Sign in automatically after successful registration.
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: form.email,
                    password: form.password
                })
            });

            localStorage.setItem("token", data.token);
            onLogin(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleRegister}>
                <div className="auth-icon">
                    <UserPlus size={26} />
                </div>

                <h2>Create your account</h2>
                <p className="muted">
                    Join Brightloop and manage your subscriptions.
                </p>

                {error && <p className="error">{error}</p>}

                <label>Full Name</label>
                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                />

                <label>Email Address</label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                />

                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    minLength={9}
                />

                <p className="password-hint">
                    At least 9 characters, including uppercase, lowercase
                    and a special character.
                </p>

                <label>Confirm Password</label>
                <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    required
                />

                <button
                    type="submit"
                    className="primary-button auth-submit"
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Account"}
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
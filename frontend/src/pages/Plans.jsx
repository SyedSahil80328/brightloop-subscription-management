import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, RefreshCw, CalendarClock } from "lucide-react";

export default function Plans({ user }) {
    const [plans, setPlans] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(false);

    const isAdmin = user?.role === "admin";

    const [form, setForm] = useState({
        product_id: "",
        name: "",
        price: "",
        billing_interval: "monthly",
        minimum_quantity: 1,
        available_from: new Date().toISOString().split("T")[0],
        available_until: "",
        auto_close_on_expiry: true,
        allow_early_close: true,
        allow_pause: true,
        allow_renewal: true
    });

    async function loadData() {
        setLoading(true);
        setError("");

        try {
            const [planData, productData] = await Promise.all([
                apiRequest("/plans"),
                apiRequest("/products")
            ]);

            setPlans(planData.plans);
            setProducts(productData.products);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setForm(previous => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            await apiRequest("/plans", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    product_id: Number(form.product_id),
                    price: Number(form.price),
                    minimum_quantity: Number(form.minimum_quantity),
                    available_until: form.available_until || null
                })
            });

            setMessage("Subscription plan created successfully!");
            setShowForm(false);

            setForm(previous => ({
                ...previous,
                product_id: "",
                name: "",
                price: "",
                available_until: ""
            }));

            loadData();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="page-heading">
                <div>
                    <h3>Subscription Plans</h3>
                    <p className="muted">Configure recurring plans and billing terms.</p>
                </div>

                <div className="page-actions">
                    <button className="secondary-button" onClick={loadData}>
                        <RefreshCw size={16} /> Refresh
                    </button>

                    {isAdmin && (
                        <button
                            className="primary-button"
                            onClick={() => setShowForm(!showForm)}
                        >
                            <Plus size={17} /> Create Plan
                        </button>
                    )}
                </div>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            {showForm && isAdmin && (
                <form className="form-card" onSubmit={handleCreate}>
                    <h3>New Subscription Plan</h3>

                    <div className="form-grid">
                        <div>
                            <label>Product</label>
                            <select
                                name="product_id"
                                value={form.product_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a product</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Plan Name</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Premium Monthly"
                                required
                            />
                        </div>

                        <div>
                            <label>Plan Price (₹)</label>
                            <input
                                type="number"
                                name="price"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Billing Interval</label>
                            <select
                                name="billing_interval"
                                value={form.billing_interval}
                                onChange={handleChange}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>

                        <div>
                            <label>Minimum Quantity</label>
                            <input
                                type="number"
                                name="minimum_quantity"
                                min="1"
                                value={form.minimum_quantity}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Available From</label>
                            <input
                                type="date"
                                name="available_from"
                                value={form.available_from}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Available Until (Optional)</label>
                            <input
                                type="date"
                                name="available_until"
                                min={form.available_from}
                                value={form.available_until}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="plan-options">
                        <label>
                            <input
                                type="checkbox"
                                name="auto_close_on_expiry"
                                checked={form.auto_close_on_expiry}
                                onChange={handleChange}
                            />
                            Auto-close on expiry
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="allow_early_close"
                                checked={form.allow_early_close}
                                onChange={handleChange}
                            />
                            Allow early closure
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="allow_pause"
                                checked={form.allow_pause}
                                onChange={handleChange}
                            />
                            Allow pause
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="allow_renewal"
                                checked={form.allow_renewal}
                                onChange={handleChange}
                            />
                            Allow renewal
                        </label>
                    </div>

                    <div className="page-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="primary-button">
                            Save Plan
                        </button>
                    </div>
                </form>
            )}

            <div className="plans-grid">
                {loading ? (
                    <p className="empty-state">Loading plans...</p>
                ) : plans.length === 0 ? (
                    <p className="empty-state">No active plans found.</p>
                ) : (
                    plans.map(plan => (
                        <div className="plan-card" key={plan.id}>
                            <div className="plan-icon">
                                <CalendarClock size={22} />
                            </div>

                            <span className="plan-interval">
                                {plan.billing_interval}
                            </span>

                            <h3>{plan.name}</h3>
                            <p className="muted">{plan.product_name}</p>

                            <h2>
                                ₹{Number(plan.price).toFixed(2)}
                                <small> / {plan.billing_interval}</small>
                            </h2>

                            <div className="plan-details">
                                <p>Minimum quantity: {plan.minimum_quantity}</p>
                                <p>Available from: {String(plan.available_from).slice(0, 10)}</p>
                                <p>
                                    Available until:{" "}
                                    {plan.available_until
                                        ? String(plan.available_until).slice(0, 10)
                                        : "No expiry"}
                                </p>
                            </div>

                            <div className="plan-status">
                                {plan.allow_pause && <span>Pause enabled</span>}
                                {plan.allow_renewal && <span>Renewal enabled</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
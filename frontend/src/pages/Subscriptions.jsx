import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, RefreshCw, Repeat } from "lucide-react";

export default function Subscriptions({ user }) {
    const [subscriptions, setSubscriptions] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(false);

    const canCreate = ["admin", "staff", "customer"].includes(user?.role);
    const isCustomer = user?.role === "customer";
    const canManage = user?.role === "admin" || user?.role === "staff";

    const [form, setForm] = useState({
        customer_id: "",
        plan_id: "",
        start_date: new Date().toISOString().slice(0, 10),
        expiry_date: "",
        payment_terms_days: 0,
        quantity: 1
    });

    async function loadSubscriptions() {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest("/subscriptions");
            setSubscriptions(data.subscriptions);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadFormData() {
        try {
            const planData = await apiRequest("/plans");
            setPlans(planData.plans);

            if (!isCustomer) {
                const customerData = await apiRequest("/subscriptions/customers");
                setCustomers(customerData.customers);
            }
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => {
        loadSubscriptions();
        loadFormData();
    }, []);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            await apiRequest("/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    ...(isCustomer ? {} : {
                        customer_id: Number(form.customer_id)
                    }),
                    plan_id: Number(form.plan_id),
                    quantity: Number(form.quantity),
                    payment_terms_days: Number(form.payment_terms_days),
                    expiry_date: form.expiry_date || null
                })
            });

            setMessage("Draft subscription created successfully!");
            setShowForm(false);

            setForm({
                customer_id: "",
                plan_id: "",
                start_date: new Date().toISOString().slice(0, 10),
                expiry_date: "",
                payment_terms_days: 0,
                quantity: 1
            });

            loadSubscriptions();
        } catch (err) {
            setError(err.message);
        }
    }

    function formatDate(value) {
        if (!value) return "—";
        return String(value).slice(0, 10);
    }

    function formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    async function changeStatus(id, status) {
        setError("");
        setMessage("");

        try {
            await apiRequest(`/subscriptions/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });

            setMessage(`Subscription moved to ${status}.`);
            await loadSubscriptions();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="page-heading">
                <div>
                    <h3>Subscriptions</h3>
                    <p className="muted">
                        Manage customer subscription agreements and lifecycle.
                    </p>
                </div>

                <div className="page-actions">
                    <button className="secondary-button" onClick={loadSubscriptions}>
                        <RefreshCw size={16} /> Refresh
                    </button>

                    {canCreate && (
                        <button
                            className="primary-button"
                            onClick={() => setShowForm(!showForm)}
                        >
                            <Plus size={17} /> New Subscription
                        </button>
                    )}
                </div>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            {showForm && canCreate && (
                <form className="form-card" onSubmit={handleCreate}>
                    <h3>Create Draft Subscription</h3>

                    <div className="form-grid">
                        {!isCustomer && (
                            <div>
                                <label>Customer</label>
                                <select
                                    name="customer_id"
                                    value={form.customer_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select customer</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name} ({customer.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label>Subscription Plan</label>
                            <select
                                name="plan_id"
                                value={form.plan_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select plan</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} — ₹{Number(plan.price).toFixed(2)}
                                        / {plan.billing_interval}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Expiry Date (Optional)</label>
                            <input
                                type="date"
                                name="expiry_date"
                                min={form.start_date}
                                value={form.expiry_date}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label>Quantity</label>
                            <input
                                type="number"
                                name="quantity"
                                min="1"
                                value={form.quantity}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Payment Terms (Days)</label>
                            <input
                                type="number"
                                name="payment_terms_days"
                                min="0"
                                value={form.payment_terms_days}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="page-actions" style={{ marginTop: 20 }}>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="primary-button">
                            Create Subscription
                        </button>
                    </div>
                </form>
            )}

            <div className="table-card">
                <div className="table-heading">
                    <div>
                        <h3>Subscription Records</h3>
                        <p className="muted">
                            {subscriptions.length} subscriptions found
                        </p>
                    </div>
                    <Repeat size={22} color="#5145cd" />
                </div>

                {loading ? (
                    <p className="empty-state">Loading subscriptions...</p>
                ) : subscriptions.length === 0 ? (
                    <p className="empty-state">No subscriptions found.</p>
                ) : (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Subscription</th>
                                    {!isCustomer && <th>Customer</th>}
                                    <th>Plan</th>
                                    <th>Start Date</th>
                                    <th>Expiry Date</th>
                                    <th>Status</th>
                                    <th>Quantity</th>
                                    {canManage && <th>Actions</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {subscriptions.map(subscription => (
                                    <tr key={subscription.id}>
                                        <td>
                                            <strong>
                                                {subscription.subscription_number}
                                            </strong>
                                            <small>ID: {subscription.id}</small>
                                        </td>

                                        {!isCustomer && (
                                            <td>
                                                <strong>{subscription.customer_name}</strong>
                                                <small>{subscription.customer_email}</small>
                                            </td>
                                        )}

                                        <td>
                                            {subscription.plan_name}
                                            <small>{subscription.billing_interval}</small>
                                        </td>

                                        <td>{formatDate(subscription.start_date)}</td>
                                        <td>{formatDate(subscription.expiry_date)}</td>

                                        <td>
                                            <span className={`subscription-status ${subscription.status}`}>
                                                {formatStatus(subscription.status)}
                                            </span>
                                        </td>

                                        <td>
                                            {subscription.lines.reduce(
                                                (total, line) => total + Number(line.quantity),
                                                0
                                            )}
                                        </td>

                                        {canManage && (
                                            <td>
                                                <div className="page-actions">
                                                    {subscription.status === "draft" && (
                                                        <button
                                                            className="secondary-button"
                                                            onClick={() => changeStatus(subscription.id, "quotation")}
                                                        >
                                                            Prepare Quote
                                                        </button>
                                                    )}

                                                    {subscription.status === "quotation" && (
                                                        <button
                                                            className="secondary-button"
                                                            onClick={() => changeStatus(subscription.id, "confirmed")}
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}

                                                    {subscription.status === "confirmed" && (
                                                        <button
                                                            className="primary-button"
                                                            onClick={() => changeStatus(subscription.id, "active")}
                                                        >
                                                            Activate
                                                        </button>
                                                    )}

                                                    {subscription.status === "active" && (
                                                        <>
                                                            <button
                                                                className="secondary-button"
                                                                onClick={() => changeStatus(subscription.id, "paused")}
                                                            >
                                                                Pause
                                                            </button>
                                                            <button
                                                                className="secondary-button"
                                                                onClick={() => {
                                                                    if (window.confirm("Are you sure you want to close this subscription?")) {
                                                                        changeStatus(subscription.id, "closed");
                                                                    }
                                                                }}                                                            
                                                            >
                                                                Close
                                                            </button>
                                                        </>
                                                    )}

                                                    {subscription.status === "paused" && (
                                                        <>
                                                            <button
                                                                className="primary-button"
                                                                onClick={() => changeStatus(subscription.id, "active")}
                                                            >
                                                                Resume
                                                            </button>
                                                            <button
                                                                className="secondary-button"
                                                                onClick={() => {
                                                                    if (window.confirm("Are you sure you want to close this subscription?")) {
                                                                        changeStatus(subscription.id, "closed");
                                                                    }
                                                                }}
                                                            >
                                                                Close
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { RefreshCw, FileText } from "lucide-react";

export default function Invoices({ user }) {
    const [invoices, setInvoices] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [selectedSubscription, setSelectedSubscription] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const canManage = ["admin", "staff"].includes(user?.role);

    async function loadData() {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest("/invoices");
            setInvoices(data.invoices || []);

            if (canManage) {
                const subData = await apiRequest("/subscriptions");
                setSubscriptions(
                    (subData.subscriptions || []).filter(s => s.status === "active")
                );
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function generateInvoice() {
        if (!selectedSubscription) return;

        setError("");
        setMessage("");

        try {
            await apiRequest(`/invoices/generate/${selectedSubscription}`, {
                method: "POST"
            });

            setMessage("Invoice generated successfully.");
            setSelectedSubscription("");
            await loadData();
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmInvoice(id) {
        setError("");
        setMessage("");

        try {
            await apiRequest(`/invoices/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "confirmed" })
            });

            setMessage("Invoice confirmed successfully.");
            await loadData();
        } catch (err) {
            setError(err.message);
        }
    }

    const money = value =>
        `₹${Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const date = value => value ? String(value).slice(0, 10) : "—";

    return (
        <div>
            <div className="page-heading">
                <div>
                    <h3>Invoices</h3>
                    <p className="muted">Manage billing and customer invoices.</p>
                </div>
                <button className="secondary-button" onClick={loadData}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            {canManage && (
                <div className="form-card">
                    <h3>Generate Invoice</h3>
                    <div className="form-grid">
                        <div>
                            <label>Active Subscription</label>
                            <select
                                value={selectedSubscription}
                                onChange={e => setSelectedSubscription(e.target.value)}
                            >
                                <option value="">Select subscription</option>
                                {subscriptions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.subscription_number} — {s.customer_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "end" }}>
                            <button
                                className="primary-button"
                                disabled={!selectedSubscription}
                                onClick={generateInvoice}
                            >
                                Generate Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-card">
                <div className="table-heading">
                    <div>
                        <h3>Invoice Records</h3>
                        <p className="muted">{invoices.length} invoices found</p>
                    </div>
                    <FileText size={22} color="#5145cd" />
                </div>

                {loading ? (
                    <p className="empty-state">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                    <p className="empty-state">No invoices found.</p>
                ) : (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    {!user?.role || user.role !== "customer"
                                        ? <th>Customer</th> : null}
                                    <th>Billing Period</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Outstanding</th>
                                    <th>Status</th>
                                    {canManage && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td><strong>{invoice.invoice_number}</strong></td>
                                        {user?.role !== "customer" && (
                                            <td>{invoice.customer_name || "—"}</td>
                                        )}
                                        <td>
                                            {date(invoice.billing_period_start)}
                                            <small>to {date(invoice.billing_period_end)}</small>
                                        </td>
                                        <td>{money(invoice.total_amount)}</td>
                                        <td>{money(invoice.amount_paid)}</td>
                                        <td>
                                            {money(
                                                Number(invoice.total_amount) -
                                                Number(invoice.amount_paid)
                                            )}
                                        </td>
                                        <td>
                                            <span className={`subscription-status ${invoice.status}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td>
                                                {invoice.status === "draft" && (
                                                    <button
                                                        className="primary-button"
                                                        onClick={() => confirmInvoice(invoice.id)}
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
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

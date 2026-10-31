
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { RefreshCw, CreditCard } from "lucide-react";

export default function Payments({ user }) {
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("UPI");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const canManage = ["admin", "staff"].includes(user?.role);

    async function loadInvoices() {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest("/invoices");
            setInvoices(data.invoices || []);

            const paymentData = await apiRequest("/payments");
            setPayments(paymentData.payments || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadInvoices();
    }, []);

    const selected = invoices.find(
        invoice => String(invoice.id) === String(selectedInvoice)
    );

    const outstanding = selected
        ? Number(selected.total_amount) - Number(selected.amount_paid)
        : 0;

    async function recordPayment(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            await apiRequest("/payments", {
                method: "POST",
                body: JSON.stringify({
                    invoice_id: Number(selectedInvoice),
                    payment_method: method,
                    amount: Number(amount),
                    note
                })
            });

            setMessage("Payment recorded successfully.");
            setAmount("");
            setNote("");
            setSelectedInvoice("");

            await loadInvoices();
        } catch (err) {
            setError(err.message);
        }
    }

    const money = value =>
        `₹${Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    return (
        <div>
            <div className="page-heading">
                <div>
                    <h3>Payments</h3>
                    <p className="muted">
                        Record and manage invoice payments.
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={loadInvoices}
                    disabled={loading}
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            {canManage && (
                <form className="form-card" onSubmit={recordPayment}>
                    <h3>Record Payment</h3>

                    <div className="form-grid">
                        <div>
                            <label>Confirmed Invoice</label>
                            <select
                                value={selectedInvoice}
                                onChange={e => {
                                    setSelectedInvoice(e.target.value);
                                    setAmount("");
                                }}
                                required
                            >
                                <option value="">Select invoice</option>

                                {invoices
                                    .filter(i => i.status === "confirmed")
                                    .map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.invoice_number} — {
                                                money(
                                                    Number(i.total_amount) -
                                                    Number(i.amount_paid)
                                                )
                                            } due
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label>Payment Method</label>
                            <select
                                value={method}
                                onChange={e => setMethod(e.target.value)}
                            >
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>

                        <div>
                            <label>Payment Amount (₹)</label>
                            <input
                                type="number"
                                min="0.01"
                                max={outstanding || undefined}
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label>Note (Optional)</label>
                            <input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Transaction reference..."
                            />
                        </div>
                    </div>

                    {selected && (
                        <p className="muted" style={{ marginTop: 12 }}>
                            Outstanding balance:{" "}
                            <strong>{money(outstanding)}</strong>
                        </p>
                    )}

                    <div style={{ marginTop: 18 }}>
                        <button
                            className="primary-button"
                            type="submit"
                            disabled={
                                !selected ||
                                Number(amount) <= 0 ||
                                Number(amount) > outstanding
                            }
                        >
                            <CreditCard size={16} /> Record Payment
                        </button>
                    </div>
                </form>
            )}

            <div className="table-card">
                <div className="table-heading">
                    <div>
                        <h3>Transaction History</h3>
                        <p className="muted">
                            {payments.length} payments recorded
                        </p>
                    </div>

                    <CreditCard size={22} color="#5145cd" />
                </div>

                {loading ? (
                    <p className="empty-state">
                        Loading payments...
                    </p>
                ) : payments.length === 0 ? (
                    <p className="empty-state">
                        No payments recorded yet.
                    </p>
                ) : (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    {user?.role !== "customer" && (
                                        <th>Customer</th>
                                    )}
                                    <th>Payment Method</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Note</th>
                                </tr>
                            </thead>

                            <tbody>
                                {payments.map(payment => (
                                    <tr key={payment.id}>
                                        <td>
                                            <strong>
                                                {payment.invoice_number}
                                            </strong>
                                        </td>

                                        {user?.role !== "customer" && (
                                            <td>{payment.customer_name}</td>
                                        )}

                                        <td>{payment.payment_method}</td>
                                        <td>{money(payment.amount)}</td>
                                        <td>
                                            {new Date(
                                                payment.payment_date
                                            ).toLocaleDateString("en-IN")}
                                        </td>
                                        <td>{payment.note || "—"}</td>
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

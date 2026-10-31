
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import Sidebar from "../components/Sidebar";
import Products from "./Products";
import Plans from "./Plans";
import Subscriptions from "./Subscriptions";
import Invoices from "./Invoices";
import Payments from "./Payments";
import { RefreshCw } from "lucide-react";

export default function Dashboard({ user, onLogout }) {
    const [active, setActive] = useState("Dashboard");
    const [stats, setStats] = useState({
        active_subscriptions: 0,
        total_revenue: 0,
        outstanding_invoices: 0,
        total_payments: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState("");

    async function loadStats() {
        setLoadingStats(true);
        setStatsError("");

        try {
            const data = await apiRequest("/dashboard/stats");
            setStats(data.stats);
        } catch (err) {
            setStatsError(err.message);
        } finally {
            setLoadingStats(false);
        }
    }

    useEffect(() => {
        loadStats();
    }, []);

    const money = value =>
        `₹${Number(value || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })}`;

    const cards = user?.role === "customer"
        ? [
            ["My Subscriptions", stats.active_subscriptions],
            ["Total Amount Paid", money(stats.total_revenue)],
            ["Outstanding Balance", money(stats.outstanding_invoices)],
            ["Payments Made", stats.total_payments]
        ]
        : [
            ["Active Subscriptions", stats.active_subscriptions],
            ["Total Revenue", money(stats.total_revenue)],
            ["Outstanding Invoices", money(stats.outstanding_invoices)],
            ["Total Payments", stats.total_payments]
        ];

    return (
        <div className="app-layout">
            <Sidebar
                active={active}
                setActive={setActive}
                onLogout={onLogout}
            />

            <main className="main-content">
                <header className="topbar">
                    <div>
                        <h2>{active}</h2>
                        <p className="muted">
                            Manage your subscription business
                        </p>
                    </div>

                    <div className="user-info">
                        <div className="avatar">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>{user?.name}</strong>
                            <p>{user?.role}</p>
                        </div>
                    </div>
                </header>

                {active === "Dashboard" ? (
                    <>
                        <div className="page-heading">
                            <div>
                                <h3 className="section-title">Overview</h3>
                                <p className="muted">
                                    Your subscription business at a glance.
                                </p>
                            </div>

                            <button
                                className="secondary-button"
                                onClick={loadStats}
                                disabled={loadingStats}
                            >
                                <RefreshCw size={16} /> Refresh
                            </button>
                        </div>

                        {statsError && (
                            <p className="error">{statsError}</p>
                        )}

                        <div className="stats-grid">
                            {cards.map(([label, value]) => (
                                <div className="stat-card" key={label}>
                                    <p>{label}</p>
                                    <h2>
                                        {loadingStats ? "..." : value}
                                    </h2>
                                </div>
                            ))}
                        </div>

                        <div className="welcome-card">
                            <h3>Welcome to Brightloop!</h3>
                            <p>
                                Your subscription management workspace is ready.
                            </p>
                        </div>
                    </>
                ) : active === "Products" ? (
                    <Products user={user} />
                ) : active === "Plans" ? (
                    <Plans user={user} />
                ) : active === "Subscriptions" ? (
                    <Subscriptions user={user} />
                ) : active === "Invoices" ? (
                    <Invoices user={user} />
                ) : active === "Payments" ? (
                    <Payments user={user} />
                ) : (
                    <div className="welcome-card">
                        <h3>{active}</h3>
                        <p>Under Implementation — Stay Tuned!</p>
                    </div>
                )}
            </main>
        </div>
    );
}

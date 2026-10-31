import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Products from "./Products";
import Plans from "./Plans";
import Subscriptions from "./Subscriptions";
import Invoices from "./Invoices";
import Payments from "./Payments";

export default function Dashboard({ user, onLogout }) {
    const [active, setActive] = useState("Dashboard");

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
                        <p className="muted">Manage your subscription business</p>
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
                        <h3 className="section-title">Overview</h3>
                        <div className="stats-grid">
                            {[
                                ["Active Subscriptions", "—"],
                                ["Total Revenue", "—"],
                                ["Outstanding Invoices", "—"],
                                ["Total Payments", "—"]
                            ].map(([label, value]) => (
                                <div className="stat-card" key={label}>
                                    <p>{label}</p>
                                    <h2>{value}</h2>
                                </div>
                            ))}
                        </div>

                        <div className="welcome-card">
                            <h3>Welcome to Brightloop!</h3>
                            <p>Your subscription management workspace is ready.</p>
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
import {
    LayoutDashboard, Package, CalendarClock,
    Repeat, FileText, CreditCard, LogOut
} from "lucide-react";

const navigation = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Products", icon: Package },
    { name: "Plans", icon: CalendarClock },
    { name: "Subscriptions", icon: Repeat },
    { name: "Invoices", icon: FileText },
    { name: "Payments", icon: CreditCard }
];

export default function Sidebar({ active, setActive, onLogout }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="brand-mark small">B</span>
                <span>Brightloop</span>
            </div>

            <p className="nav-label">WORKSPACE</p>

            <nav>
                {navigation.map(item => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.name}
                            className={`nav-item ${active === item.name ? "active" : ""}`}
                            onClick={() => setActive(item.name)}
                        >
                            <Icon size={19} />
                            {item.name}
                        </button>
                    );
                })}
            </nav>

            <button className="logout-button" onClick={onLogout}>
                <LogOut size={18} />
                Sign out
            </button>
        </aside>
    );
}
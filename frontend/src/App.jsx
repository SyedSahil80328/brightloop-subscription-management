import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    const [showRegister, setShowRegister] = useState(false);

    function handleLogin(userData) {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setShowRegister(false);
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setShowRegister(false);
    }

    if (user) {
        return <Dashboard user={user} onLogout={handleLogout} />;
    }

    if (showRegister) {
        return (
            <Register
                onLogin={handleLogin}
                onBack={() => setShowRegister(false)}
            />
        );
    }

    return (
        <Login
            onLogin={handleLogin}
            onRegister={() => setShowRegister(true)}
        />
    );
}
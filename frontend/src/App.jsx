import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";

export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    const [page, setPage] = useState(() => {
        const path = window.location.pathname;

        if (path.startsWith("/reset-password/")) {
            return "reset";
        }

        return "login";
    });

    const resetToken = window.location.pathname.startsWith("/reset-password/")
        ? window.location.pathname.split("/")[2]
        : "";

    function handleLogin(userData) {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setPage("login");
        window.history.replaceState({}, "", "/");
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setPage("login");
        window.history.replaceState({}, "", "/");
    }

    function goToPage(nextPage, path = "/") {
        setPage(nextPage);
        window.history.pushState({}, "", path);
    }

    if (user) {
        return <Dashboard user={user} onLogout={handleLogout} />;
    }

    if (page === "register") {
        return (
            <Register
                onLogin={handleLogin}
                onBack={() => goToPage("login")}
            />
        );
    }

    if (page === "forgot") {
        return (
            <ForgotPassword
                onBack={() => goToPage("login")}
            />
        );
    }

    if (page === "reset") {
        return (
            <ResetPassword
                token={resetToken}
                onBack={() => goToPage("login")}
            />
        );
    }

    return (
        <Login
            onLogin={handleLogin}
            onRegister={() => goToPage("register")}
            onForgotPassword={() => goToPage("forgot")}
        />
    );
}
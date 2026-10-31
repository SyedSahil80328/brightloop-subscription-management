import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, RefreshCw, Trash2, Package } from "lucide-react";

export default function Products({ user }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        name: "",
        type: "service",
        sales_price: "",
        cost_price: "",
        notes: ""
    });

    const isAdmin = user?.role === "admin";

    async function loadProducts() {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest("/products");
            setProducts(data.products);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProducts();
    }, []);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            await apiRequest("/products", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    sales_price: Number(form.sales_price),
                    cost_price: Number(form.cost_price)
                })
            });

            setMessage("Product created successfully!");
            setForm({
                name: "",
                type: "service",
                sales_price: "",
                cost_price: "",
                notes: ""
            });
            setShowForm(false);
            loadProducts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Deactivate this product?")) return;

        try {
            await apiRequest(`/products/${id}`, { method: "DELETE" });
            setMessage("Product deactivated successfully.");
            loadProducts();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="page-heading">
                <div>
                    <h3>Product Catalogue</h3>
                    <p className="muted">Manage your products and services.</p>
                </div>

                <div className="page-actions">
                    <button className="secondary-button" onClick={loadProducts}>
                        <RefreshCw size={16} /> Refresh
                    </button>

                    {isAdmin && (
                        <button
                            className="primary-button"
                            onClick={() => setShowForm(!showForm)}
                        >
                            <Plus size={17} /> Add Product
                        </button>
                    )}
                </div>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            {showForm && (
                <form className="form-card" onSubmit={handleCreate}>
                    <h3>New Product</h3>

                    <div className="form-grid">
                        <div>
                            <label>Product Name</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Product Type</label>
                            <select name="type" value={form.type} onChange={handleChange}>
                                <option value="service">Service</option>
                                <option value="goods">Goods</option>
                            </select>
                        </div>

                        <div>
                            <label>Sales Price (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="sales_price"
                                value={form.sales_price}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label>Cost Price (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="cost_price"
                                value={form.cost_price}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <label>Notes</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows="3"
                    />

                    <div className="page-actions">
                        <button type="button" className="secondary-button"
                            onClick={() => setShowForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-button">
                            Save Product
                        </button>
                    </div>
                </form>
            )}

            <div className="table-card">
                <div className="table-heading">
                    <div>
                        <h3>All Products</h3>
                        <p className="muted">{products.length} active products</p>
                    </div>
                    <Package size={22} color="#5145cd" />
                </div>

                {loading ? (
                    <p className="empty-state">Loading products...</p>
                ) : products.length === 0 ? (
                    <p className="empty-state">No active products found.</p>
                ) : (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Type</th>
                                    <th>Sales Price</th>
                                    <th>Cost Price</th>
                                    {isAdmin && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <strong>{product.name}</strong>
                                            <small>ID: {product.id}</small>
                                        </td>
                                        <td>
                                            <span className="type-tag">{product.type}</span>
                                        </td>
                                        <td>₹{Number(product.sales_price).toFixed(2)}</td>
                                        <td>₹{Number(product.cost_price).toFixed(2)}</td>
                                        {isAdmin && (
                                            <td>
                                                <button
                                                    className="icon-button danger-button"
                                                    title="Deactivate product"
                                                    onClick={() => handleDelete(product.id)}
                                                >
                                                    <Trash2 size={17} />
                                                </button>
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
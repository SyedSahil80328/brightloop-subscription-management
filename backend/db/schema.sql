
-- =====================================================
-- BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- =====================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('admin', 'staff', 'customer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    sales_price NUMERIC(12,2) NOT NULL CHECK (sales_price >= 0),
    cost_price NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_name VARCHAR(100) NOT NULL,
    price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE (product_id, variant_name)
);

-- 4. TAXES
CREATE TABLE IF NOT EXISTS taxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate NUMERIC(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    billing_interval VARCHAR(20) NOT NULL
        CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    minimum_quantity INTEGER NOT NULL DEFAULT 1
        CHECK (minimum_quantity > 0),
    available_from DATE NOT NULL,
    available_until DATE,
    auto_close_on_expiry BOOLEAN NOT NULL DEFAULT FALSE,
    allow_early_close BOOLEAN NOT NULL DEFAULT TRUE,
    allow_pause BOOLEAN NOT NULL DEFAULT TRUE,
    allow_renewal BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (available_until IS NULL OR available_until >= available_from)
);

-- 6. QUOTATION TEMPLATES
CREATE TABLE IF NOT EXISTS quotation_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    plan_id INTEGER REFERENCES plans(id),
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. QUOTATION TEMPLATE LINES
CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    tax_id INTEGER REFERENCES taxes(id)
);

-- 8. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    template_id INTEGER REFERENCES quotation_templates(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'quotation', 'confirmed',
            'active', 'paused', 'closed'
        )),
    start_date DATE NOT NULL,
    expiry_date DATE,
    next_billing_date DATE,
    payment_terms_days INTEGER NOT NULL DEFAULT 0
        CHECK (payment_terms_days >= 0),
    renewed_from_id INTEGER REFERENCES subscriptions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (expiry_date IS NULL OR expiry_date >= start_date)
);

-- 9. SUBSCRIPTION LINES
CREATE TABLE IF NOT EXISTS subscription_lines (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    tax_id INTEGER REFERENCES taxes(id),
    is_plan_item BOOLEAN NOT NULL DEFAULT FALSE
);

-- 10. DISCOUNT RULES
CREATE TABLE IF NOT EXISTS discount_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    discount_type VARCHAR(20) NOT NULL
        CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
    minimum_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_quantity INTEGER NOT NULL DEFAULT 1,
    scope VARCHAR(20) NOT NULL
        CHECK (scope IN ('products', 'subscription')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (discount_type <> 'percentage' OR discount_value <= 100),
    CHECK (minimum_purchase >= 0),
    CHECK (minimum_quantity > 0),
    CHECK (usage_limit IS NULL OR usage_limit > 0),
    CHECK (usage_count >= 0),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

-- 11. DISCOUNT PRODUCTS
CREATE TABLE IF NOT EXISTS discount_products (
    id SERIAL PRIMARY KEY,
    discount_id INTEGER NOT NULL REFERENCES discount_rules(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    UNIQUE (discount_id, product_id)
);

-- 12. SUBSCRIPTION DISCOUNTS
CREATE TABLE IF NOT EXISTS subscription_discounts (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    discount_id INTEGER NOT NULL REFERENCES discount_rules(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subscription_id, discount_id)
);

-- 13. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    customer_id INTEGER NOT NULL REFERENCES users(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (billing_period_end >= billing_period_start),
    CHECK (due_date >= invoice_date),
    CHECK (subtotal >= 0),
    CHECK (discount_total >= 0),
    CHECK (tax_total >= 0),
    CHECK (total_amount >= 0),
    CHECK (amount_paid >= 0 AND amount_paid <= total_amount),

    -- Prevent duplicate invoices for the same billing period.
    UNIQUE (
        subscription_id,
        billing_period_start,
        billing_period_end
    )
);

-- 14. INVOICE LINES
CREATE TABLE IF NOT EXISTS invoice_lines (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER REFERENCES product_variants(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

-- 15. INVOICE DISCOUNTS
-- Snapshot of the discount applied to an invoice.
CREATE TABLE IF NOT EXISTS invoice_discounts (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    discount_id INTEGER REFERENCES discount_rules(id),
    discount_name VARCHAR(150) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0)
);

-- 16. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR FREQUENTLY ACCESSED DATA
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_status
    ON subscriptions(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
    ON subscriptions(next_billing_date, status);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_status
    ON invoices(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
    ON invoices(due_date, status);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
    ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_subscription_lines_subscription
    ON subscription_lines(subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice
    ON invoice_lines(invoice_id);

CREATE INDEX IF NOT EXISTS idx_variants_product
    ON product_variants(product_id);

-- =====================================================
-- END OF SCHEMA
-- =====================================================

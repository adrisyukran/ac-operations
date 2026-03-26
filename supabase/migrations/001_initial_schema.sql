-- AC Operations System (Sejuk Sejuk) - Initial Schema
-- Phase 1: 3 Simple Tables

-- ============================================
-- TABLE: technicians
-- ============================================
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    branch_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: users (mock users for role switcher)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'technician', 'manager')),
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: orders
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    problem_description TEXT,
    service_type TEXT,
    quoted_price NUMERIC(10, 2),
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'job_done', 'reviewed', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_technicians_branch ON technicians(branch_id);
CREATE INDEX idx_technicians_active ON technicians(is_active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_technician ON users(technician_id);
CREATE INDEX idx_orders_technician ON orders(technician_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_no ON orders(order_no);

-- ============================================
-- SEED DATA: Technicians (4 technicians)
-- ============================================
INSERT INTO technicians (id, name, phone, branch_id, is_active) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ali', '+6012-3456789', 'branch-1', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'John', '+6012-3456790', 'branch-2', true),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Bala', '+6012-3456791', 'branch-3', true),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Yusoff', '+6012-3456792', 'branch-4', true);

-- ============================================
-- SEED DATA: Users (mock users for each role)
-- ============================================
INSERT INTO users (id, name, role, technician_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin', NULL),
    ('22222222-2222-2222-2222-222222222222', 'Manager User', 'manager', NULL),
    ('33333333-3333-3333-3333-333333333333', 'Ali (Tech)', 'technician', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('44444444-4444-4444-4444-444444444444', 'John (Tech)', 'technician', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
    ('55555555-5555-5555-5555-555555555555', 'Bala (Tech)', 'technician', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
    ('66666666-6666-6666-6666-666666666666', 'Yusoff (Tech)', 'technician', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44');

-- ============================================
-- SEED DATA: Sample Orders
-- ============================================
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, technician_id, status) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'ORD-001', 'Ahmad bin Abu', '+6011-12345678', 'No. 12, Jalan Masjid, Kuala Lumpur', 'AC tidak sejuk', 'repair', 150.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'new'),
    ('aaaa2222-2222-2222-2222-222222222222', 'ORD-002', 'Siti Nurhaliza', '+6011-23456789', 'No. 5, Jalan Bukit, Petaling Jaya', 'AC bocor air', 'repair', 200.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'assigned'),
    ('aaaa3333-3333-3333-3333-333333333333', 'ORD-003', 'Mohd Razif', '+6011-34567890', 'No. 8, Jalan Selangor, Shah Alam', 'Servis tahunan', 'service', 120.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'in_progress'),
    ('aaaa4444-4444-4444-4444-444444444444', 'ORD-004', 'Lee Cheng', '+6011-45678901', 'No. 20, Jalan Klang, Klang', 'Installation unit baru', 'installation', 350.00, 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'job_done');
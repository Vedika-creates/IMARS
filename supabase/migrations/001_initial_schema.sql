-- IMRAS Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Create custom types
CREATE TYPE user_role AS ENUM ('warehouse_staff', 'inventory_manager', 'admin');
CREATE TYPE location_type_enum AS ENUM ('storage', 'receiving', 'shipping', 'quarantine', 'picking');
CREATE TYPE batch_status AS ENUM ('active', 'quarantined', 'expired', 'consumed');
CREATE TYPE movement_type_enum AS ENUM ('in', 'out', 'transfer', 'adjustment', 'return');
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE pr_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'converted_to_po');
CREATE TYPE po_status AS ENUM ('draft', 'sent', 'confirmed', 'partially_received', 'completed', 'cancelled');
CREATE TYPE grn_status AS ENUM ('draft', 'confirmed', 'rejected');
CREATE TYPE transfer_status AS ENUM ('draft', 'approved', 'in_transit', 'partially_received', 'completed', 'cancelled');
CREATE TYPE rule_type_enum AS ENUM ('min_max', 'reorder_point', 'dynamic');
CREATE TYPE alert_type_enum AS ENUM ('low_stock', 'out_of_stock', 'expiry_warning', 'expired', 'reorder_required', 'quality_issue');
CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE setting_type_enum AS ENUM ('string', 'number', 'boolean', 'json');
CREATE TYPE operation_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item Management
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    unit_of_measure VARCHAR(20) NOT NULL,
    weight DECIMAL(10,3),
    dimensions VARCHAR(50),
    barcode VARCHAR(100),
    qr_code VARCHAR(100),
    requires_batch_tracking BOOLEAN DEFAULT false,
    requires_serial_tracking BOOLEAN DEFAULT false,
    has_expiry BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    standard_cost DECIMAL(15,2),
    selling_price DECIMAL(15,2),
    lead_time_days INTEGER DEFAULT 0,
    safety_stock DECIMAL(15,2) DEFAULT 0,
    reorder_point DECIMAL(15,2) DEFAULT 0,
    max_stock DECIMAL(15,2),
    min_stock DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse & Location Management
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    total_area DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone VARCHAR(50),
    aisle VARCHAR(20),
    rack VARCHAR(20),
    bin VARCHAR(20),
    location_type location_type_enum DEFAULT 'storage',
    capacity DECIMAL(15,2),
    current_capacity DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(warehouse_id, zone, aisle, rack, bin)
);

-- Stock Management
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    location_id UUID REFERENCES locations(id),
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    manufacture_date DATE,
    expiry_date DATE,
    quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,2) DEFAULT 0,
    available_quantity DECIMAL(15,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    unit_cost DECIMAL(15,2),
    status batch_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, batch_number),
    UNIQUE(item_id, serial_number)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    batch_id UUID REFERENCES stock_batches(id),
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    movement_type movement_type_enum NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES users(id),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Management
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    lead_time_days INTEGER DEFAULT 0,
    quality_rating DECIMAL(3,2) DEFAULT 0,
    delivery_rating DECIMAL(3,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE supplier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100),
    unit_price DECIMAL(15,2),
    min_order_quantity DECIMAL(15,2),
    packaging_unit VARCHAR(50),
    lead_time_days INTEGER,
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, item_id)
);

-- Purchase Management
CREATE TABLE purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number VARCHAR(50) UNIQUE NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    department VARCHAR(100),
    priority priority_enum DEFAULT 'medium',
    status pr_status DEFAULT 'draft',
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    required_date DATE,
    justification TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    status po_status DEFAULT 'draft',
    priority priority_enum DEFAULT 'medium',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity_ordered DECIMAL(15,2) NOT NULL,
    quantity_received DECIMAL(15,2) DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity_ordered * unit_price * (1 - discount_rate/100) * (1 + tax_rate/100)) STORED,
    expected_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    received_by UUID NOT NULL REFERENCES users(id),
    received_date DATE DEFAULT CURRENT_DATE,
    carrier VARCHAR(100),
    vehicle_number VARCHAR(50),
    notes TEXT,
    status grn_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id),
    item_id UUID NOT NULL REFERENCES items(id),
    batch_id UUID REFERENCES stock_batches(id),
    quantity_ordered DECIMAL(15,2),
    quantity_received DECIMAL(15,2) NOT NULL,
    quantity_accepted DECIMAL(15,2) NOT NULL,
    quantity_rejected DECIMAL(15,2) DEFAULT 0,
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    manufacture_date DATE,
    expiry_date DATE,
    unit_cost DECIMAL(15,2),
    rejection_reason TEXT,
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer Management
CREATE TABLE transfer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status transfer_status DEFAULT 'draft',
    priority priority_enum DEFAULT 'medium',
    transfer_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transfer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES transfer_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    batch_id UUID REFERENCES stock_batches(id),
    quantity_requested DECIMAL(15,2) NOT NULL,
    quantity_sent DECIMAL(15,2) DEFAULT 0,
    quantity_received DECIMAL(15,2) DEFAULT 0,
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reorder & Automation
CREATE TABLE reorder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    rule_type rule_type_enum NOT NULL,
    min_stock DECIMAL(15,2),
    max_stock DECIMAL(15,2),
    reorder_point DECIMAL(15,2),
    reorder_quantity DECIMAL(15,2),
    safety_stock DECIMAL(15,2),
    lead_time_days INTEGER,
    service_level_percent DECIMAL(5,2) DEFAULT 95,
    demand_forecast_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    auto_create_po BOOLEAN DEFAULT false,
    preferred_supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, warehouse_id)
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type alert_type_enum NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    warehouse_id UUID REFERENCES warehouses(id),
    item_id UUID REFERENCES items(id),
    severity severity_enum DEFAULT 'medium',
    status alert_status DEFAULT 'active',
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration & Audit
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type setting_type_enum DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    operation operation_enum NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_batches_updated_at BEFORE UPDATE ON stock_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_items_updated_at BEFORE UPDATE ON supplier_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requisitions_updated_at BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_receipt_notes_updated_at BEFORE UPDATE ON goods_receipt_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_orders_updated_at BEFORE UPDATE ON transfer_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_order_items_updated_at BEFORE UPDATE ON transfer_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reorder_rules_updated_at BEFORE UPDATE ON reorder_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

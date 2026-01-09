-- IMRAS Row Level Security Policies
-- Migration: 003_rls_policies.sql

-- Enable Row Level Security on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function for role-based access
CREATE OR REPLACE FUNCTION user_role() 
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for warehouse access
CREATE OR REPLACE FUNCTION has_warehouse_access(warehouse_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin can access all warehouses
    IF user_role() = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Inventory manager can access all warehouses
    IF user_role() = 'inventory_manager' THEN
        RETURN true;
    END IF;
    
    -- Warehouse staff can only access their assigned warehouses
    -- (This assumes a user_warehouse_access table exists for assignment)
    RETURN EXISTS (
        SELECT 1 FROM user_warehouse_access uwa 
        WHERE uwa.user_id = auth.uid() 
        AND uwa.warehouse_id = warehouse_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Table Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
    FOR SELECT USING (user_role() = 'admin');

CREATE POLICY "Admin can insert users" ON users
    FOR INSERT WITH CHECK (user_role() = 'admin');

CREATE POLICY "Admin can update users" ON users
    FOR UPDATE USING (user_role() = 'admin');

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Stock Batches Policies
CREATE POLICY "Admin full access to stock batches" ON stock_batches
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to stock batches" ON stock_batches
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view stock in assigned warehouses" ON stock_batches
    FOR SELECT USING (
        has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = stock_batches.location_id))
    );

CREATE POLICY "Warehouse staff can update stock in assigned warehouses" ON stock_batches
    FOR UPDATE USING (
        has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = stock_batches.location_id))
    );

CREATE POLICY "Warehouse staff can insert stock in assigned warehouses" ON stock_batches
    FOR INSERT WITH CHECK (
        has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = NEW.location_id))
    );

-- Stock Movements Policies
CREATE POLICY "Admin full access to stock movements" ON stock_movements
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to stock movements" ON stock_movements
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view movements in assigned warehouses" ON stock_movements
    FOR SELECT USING (
        (has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = stock_movements.from_location_id)) OR
         has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = stock_movements.to_location_id)))
    );

CREATE POLICY "Warehouse staff can create movements in assigned warehouses" ON stock_movements
    FOR INSERT WITH CHECK (
        has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = NEW.from_location_id)) OR
        has_warehouse_access((SELECT warehouse_id FROM locations WHERE id = NEW.to_location_id))
    );

-- Purchase Orders Policies
CREATE POLICY "Admin full access to purchase orders" ON purchase_orders
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to purchase orders" ON purchase_orders
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view POs for their warehouse" ON purchase_orders
    FOR SELECT USING (
        warehouse_id IS NULL OR 
        has_warehouse_access(warehouse_id)
    );

-- Purchase Requisitions Policies
CREATE POLICY "Admin full access to purchase requisitions" ON purchase_requisitions
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to purchase requisitions" ON purchase_requisitions
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Users can view own purchase requisitions" ON purchase_requisitions
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Users can create purchase requisitions" ON purchase_requisitions
    FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can update own purchase requisitions" ON purchase_requisitions
    FOR UPDATE USING (requested_by = auth.uid() AND status = 'draft');

-- Goods Receipt Notes Policies
CREATE POLICY "Admin full access to GRN" ON goods_receipt_notes
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to GRN" ON goods_receipt_notes
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view GRN for their warehouse" ON goods_receipt_notes
    FOR SELECT USING (has_warehouse_access(warehouse_id));

CREATE POLICY "Warehouse staff can create GRN for their warehouse" ON goods_receipt_notes
    FOR INSERT WITH CHECK (has_warehouse_access(warehouse_id));

CREATE POLICY "Warehouse staff can update GRN for their warehouse" ON goods_receipt_notes
    FOR UPDATE USING (has_warehouse_access(warehouse_id));

-- Transfer Orders Policies
CREATE POLICY "Admin full access to transfer orders" ON transfer_orders
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to transfer orders" ON transfer_orders
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view transfer orders for their warehouses" ON transfer_orders
    FOR SELECT USING (
        has_warehouse_access(from_warehouse_id) OR 
        has_warehouse_access(to_warehouse_id)
    );

CREATE POLICY "Warehouse staff can create transfer orders from their warehouse" ON transfer_orders
    FOR INSERT WITH CHECK (has_warehouse_access(from_warehouse_id));

-- Alerts Policies
CREATE POLICY "Admin full access to alerts" ON alerts
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager full access to alerts" ON inventory_manager
    FOR ALL USING (user_role() = 'inventory_manager');

CREATE POLICY "Warehouse staff can view alerts for their warehouses" ON alerts
    FOR SELECT USING (
        warehouse_id IS NULL OR 
        has_warehouse_access(warehouse_id)
    );

CREATE POLICY "Warehouse staff can acknowledge alerts" ON alerts
    FOR UPDATE USING (
        (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
        status = 'active'
    );

-- Audit Logs Policies
CREATE POLICY "Admin full access to audit logs" ON audit_logs
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager can view audit logs" ON audit_logs
    FOR SELECT USING (user_role() = 'inventory_manager');

-- Public Access for Non-Sensitive Tables
-- Items, Categories, Warehouses, Locations, Suppliers can be read by all authenticated users
CREATE POLICY "Authenticated users can view items" ON items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view categories" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view warehouses" ON warehouses
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Authenticated users can view locations" ON locations
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Authenticated users can view suppliers" ON suppliers
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Create user_warehouse_access table for warehouse assignments
CREATE TABLE IF NOT EXISTS user_warehouse_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, warehouse_id)
);

-- Enable RLS on user_warehouse_access
ALTER TABLE user_warehouse_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage warehouse access" ON user_warehouse_access
    FOR ALL USING (user_role() = 'admin');

CREATE POLICY "Inventory manager can view warehouse access" ON user_warehouse_access
    FOR SELECT USING (user_role() = 'inventory_manager');

CREATE POLICY "Users can view own warehouse access" ON user_warehouse_access
    FOR SELECT USING (user_id = auth.uid());

-- Create indexes for RLS performance
CREATE INDEX idx_user_warehouse_access_user ON user_warehouse_access(user_id);
CREATE INDEX idx_user_warehouse_access_warehouse ON user_warehouse_access(warehouse_id);
CREATE INDEX idx_user_warehouse_access_active ON user_warehouse_access(is_active);

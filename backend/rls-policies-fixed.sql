-- IMRAS Row Level Security (RLS) Policies - Fixed Version
-- Run this in Supabase SQL Editor to implement security policies

-- Enable RLS on all sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has warehouse access
CREATE OR REPLACE FUNCTION has_warehouse_access(user_id uuid, warehouse_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_warehouse_access 
    WHERE user_warehouse_access.user_id = user_id 
    AND user_warehouse_access.warehouse_id = warehouse_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE profiles.id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Stock batches policies
CREATE POLICY "Warehouse staff can view stock in their warehouse" ON stock_batches
FOR SELECT USING (
  has_warehouse_access(auth.uid(), (
    SELECT warehouse_id FROM locations 
    WHERE locations.id = stock_batches.location_id
  ))
);

CREATE POLICY "Inventory managers can view all stock" ON stock_batches
FOR SELECT USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can view all stock" ON stock_batches
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Warehouse staff can update stock in their warehouse" ON stock_batches
FOR UPDATE USING (
  has_warehouse_access(auth.uid(), (
    SELECT warehouse_id FROM locations 
    WHERE locations.id = stock_batches.location_id
  ))
);

CREATE POLICY "Inventory managers can update all stock" ON stock_batches
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can update all stock" ON stock_batches
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Stock movements policies
CREATE POLICY "Warehouse staff can view movements in their warehouse" ON stock_movements
FOR SELECT USING (
  has_warehouse_access(auth.uid(), (
    SELECT warehouse_id FROM locations 
    WHERE locations.id = stock_movements.from_location_id
  )) OR
  has_warehouse_access(auth.uid(), (
    SELECT warehouse_id FROM locations 
    WHERE locations.id = stock_movements.to_location_id
  ))
);

CREATE POLICY "Inventory managers can view all movements" ON stock_movements
FOR SELECT USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can view all movements" ON stock_movements
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Warehouse staff can create movements in their warehouse" ON stock_movements
FOR INSERT WITH CHECK (
  has_warehouse_access(auth.uid(), (
    SELECT warehouse_id FROM locations 
    WHERE locations.id = stock_movements.to_location_id
  ))
);

CREATE POLICY "Inventory managers can create all movements" ON stock_movements
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can create all movements" ON stock_movements
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
);

-- Purchase orders policies
CREATE POLICY "Warehouse staff can view POs for their warehouse" ON purchase_orders
FOR SELECT USING (
  has_warehouse_access(auth.uid(), purchase_orders.warehouse_id)
);

CREATE POLICY "Inventory managers can view all POs" ON purchase_orders
FOR SELECT USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can view all POs" ON purchase_orders
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Inventory managers can create POs" ON purchase_orders
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can create POs" ON purchase_orders
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Inventory managers can update POs" ON purchase_orders
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can update POs" ON purchase_orders
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Reorder rules policies
CREATE POLICY "Warehouse staff can view reorder rules for their warehouse" ON reorder_rules
FOR SELECT USING (
  has_warehouse_access(auth.uid(), reorder_rules.warehouse_id)
);

CREATE POLICY "Inventory managers can view all reorder rules" ON reorder_rules
FOR SELECT USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can view all reorder rules" ON reorder_rules
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Inventory managers can manage reorder rules" ON reorder_rules
FOR ALL USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can manage reorder rules" ON reorder_rules
FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Alerts policies
CREATE POLICY "Warehouse staff can view alerts for their warehouse" ON alerts
FOR SELECT USING (
  alerts.warehouse_id IS NULL OR
  has_warehouse_access(auth.uid(), alerts.warehouse_id)
);

CREATE POLICY "Inventory managers can view all alerts" ON alerts
FOR SELECT USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can view all alerts" ON alerts
FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Warehouse staff can acknowledge alerts in their warehouse" ON alerts
FOR UPDATE USING (
  has_warehouse_access(auth.uid(), alerts.warehouse_id)
);

CREATE POLICY "Inventory managers can manage all alerts" ON alerts
FOR ALL USING (
  get_user_role(auth.uid()) = 'inventory_manager'
);

CREATE POLICY "Admins can manage all alerts" ON alerts
FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Items and Categories (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view items" ON items
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view categories" ON categories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view warehouses" ON warehouses
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view locations" ON locations
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view suppliers" ON suppliers
FOR SELECT USING (auth.role() = 'authenticated');

-- Success message
SELECT 'RLS policies implemented successfully!' as message;

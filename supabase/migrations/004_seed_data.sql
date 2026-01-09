-- IMRAS Seed Data
-- Migration: 004_seed_data.sql

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'IMRAS Demo Company', 'string', 'Company name for reports and invoices'),
('default_currency', 'USD', 'string', 'Default currency for transactions'),
('low_stock_alert_threshold', '0.8', 'number', 'Alert when stock falls below 80% of reorder point'),
('expiry_warning_days', '30', 'number', 'Warn about items expiring within X days'),
('auto_approve_low_value_po', '1000', 'number', 'Auto-approve POs below this value'),
('default_lead_time_days', '7', 'number', 'Default supplier lead time in days'),
('enable_email_alerts', 'true', 'boolean', 'Enable email notifications for alerts'),
('max_po_value_auto_approve', '5000', 'number', 'Maximum PO value for auto-approval'),
('stock_movement_auto_approve', 'true', 'boolean', 'Auto-approve stock movements below threshold'),
('default_warehouse', 'main', 'string', 'Default warehouse code');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES
('admin@imras.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6', 'System', 'Administrator', 'admin', '+1234567890');

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic components and devices'),
('Office Supplies', 'Stationery and office equipment'),
('Raw Materials', 'Raw materials for production'),
('Finished Goods', 'Completed products ready for sale'),
('Packaging Materials', 'Packaging and shipping supplies'),
('Safety Equipment', 'Personal protective equipment'),
('Maintenance', 'Maintenance and repair supplies'),
('Tools', 'Hand tools and power tools');

-- Insert sample warehouses
INSERT INTO warehouses (name, code, address, city, state, country, postal_code, contact_person, contact_phone, contact_email) VALUES
('Main Warehouse', 'MAIN', '123 Industrial Blvd', 'Mumbai', 'Maharashtra', 'India', '400001', 'Raj Patel', '+919876543210', 'raj.patel@imras.com'),
('North Warehouse', 'NORTH', '456 North Park', 'Delhi', 'Delhi', 'India', '110001', 'Priya Sharma', '+919876543211', 'priya.sharma@imras.com'),
('South Warehouse', 'SOUTH', '789 South Avenue', 'Bangalore', 'Karnataka', 'India', '560001', 'Arun Kumar', '+919876543212', 'arun.kumar@imras.com');

-- Insert sample locations for Main Warehouse
INSERT INTO locations (warehouse_id, zone, aisle, rack, bin, location_type, capacity) VALUES
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'A', '01', '01', '01', 'storage', 1000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'A', '01', '01', '02', 'storage', 1000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'A', '01', '02', '01', 'storage', 1000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'B', '01', '01', '01', 'storage', 1000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'RECEIVING', NULL, NULL, NULL, 'receiving', 5000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'SHIPPING', NULL, NULL, NULL, 'shipping', 5000),
((SELECT id FROM warehouses WHERE code = 'MAIN'), 'QUARANTINE', NULL, NULL, NULL, 'quarantine', 1000);

-- Insert sample suppliers
INSERT INTO suppliers (name, code, contact_person, email, phone, address, city, state, country, postal_code, lead_time_days, quality_rating, delivery_rating) VALUES
('Tech Components Ltd', 'TECH001', 'John Smith', 'john@techcomp.com', '+1234567890', '456 Tech Street', 'Mumbai', 'Maharashtra', 'India', '400001', 7, 4.5, 4.2),
('Office Supplies Co', 'OFFICE001', 'Sarah Johnson', 'sarah@officesupplies.com', '+1234567891', '789 Office Park', 'Delhi', 'Delhi', 'India', '110001', 3, 4.8, 4.6),
('Raw Materials Inc', 'RAW001', 'Mike Wilson', 'mike@rawmaterials.com', '+1234567892', '321 Industrial Way', 'Bangalore', 'Karnataka', 'India', '560001', 14, 4.3, 4.0),
('Packaging Solutions', 'PACK001', 'Lisa Brown', 'lisa@packaging.com', '+1234567893', '654 Package Blvd', 'Chennai', 'Tamil Nadu', 'India', '600001', 5, 4.7, 4.8);

-- Insert sample items
INSERT INTO items (sku, name, description, category_id, unit_of_measure, weight, standard_cost, selling_price, lead_time_days, safety_stock, reorder_point, requires_batch_tracking, has_expiry, shelf_life_days) VALUES
('ELEC001', 'Laptop Computer', '15-inch business laptop', (SELECT id FROM categories WHERE name = 'Electronics'), 'Each', 2.5, 800.00, 1200.00, 7, 10, 5, true, false, NULL),
('ELEC002', 'Wireless Mouse', 'Ergonomic wireless mouse', (SELECT id FROM categories WHERE name = 'Electronics'), 'Each', 0.2, 25.00, 45.00, 5, 50, 25, false, false, NULL),
('OFF001', 'A4 Paper', 'Standard A4 printing paper', (SELECT id FROM categories WHERE name = 'Office Supplies'), 'Ream', 2.5, 5.00, 8.00, 3, 100, 50, true, false, NULL),
('OFF002', 'Ballpoint Pens', 'Blue ballpoint pens (box of 12)', (SELECT id FROM categories WHERE name = 'Office Supplies'), 'Box', 0.5, 3.00, 6.00, 2, 20, 10, false, false, NULL),
('RAW001', 'Steel Sheets', 'Industrial steel sheets 2mm thickness', (SELECT id FROM categories WHERE name = 'Raw Materials'), 'Sheet', 10.0, 50.00, 75.00, 14, 25, 15, true, false, NULL),
('RAW002', 'Plastic Granules', 'HDPE plastic granules for manufacturing', (SELECT id FROM categories WHERE name = 'Raw Materials'), 'Kg', 1.0, 2.00, 3.50, 7, 500, 250, true, true, 365),
('PACK001', 'Cardboard Boxes', 'Standard shipping boxes 12x12x12', (SELECT id FROM categories WHERE name = 'Packaging Materials'), 'Each', 0.3, 1.50, 2.50, 3, 200, 100, false, false, NULL),
('SAFE001', 'Safety Gloves', 'Industrial safety gloves (pair)', (SELECT id FROM categories WHERE name = 'Safety Equipment'), 'Pair', 0.1, 5.00, 8.00, 5, 100, 50, true, false, NULL);

-- Insert sample supplier items relationships
INSERT INTO supplier_items (supplier_id, item_id, supplier_sku, unit_price, min_order_quantity, lead_time_days, is_preferred) VALUES
((SELECT id FROM suppliers WHERE code = 'TECH001'), (SELECT id FROM items WHERE sku = 'ELEC001'), 'TECH-LAPTOP-001', 750.00, 5, 7, true),
((SELECT id FROM suppliers WHERE code = 'TECH001'), (SELECT id FROM items WHERE sku = 'ELEC002'), 'TECH-MOUSE-001', 22.00, 10, 5, true),
((SELECT id FROM suppliers WHERE code = 'OFFICE001'), (SELECT id FROM items WHERE sku = 'OFF001'), 'OFF-PAPER-001', 4.50, 50, 3, true),
((SELECT id FROM suppliers WHERE code = 'OFFICE001'), (SELECT id FROM items WHERE sku = 'OFF002'), 'OFF-PEN-001', 2.75, 20, 2, true),
((SELECT id FROM suppliers WHERE code = 'RAW001'), (SELECT id FROM items WHERE sku = 'RAW001'), 'RAW-STEEL-001', 45.00, 10, 14, true),
((SELECT id FROM suppliers WHERE code = 'RAW001'), (SELECT id FROM items WHERE sku = 'RAW002'), 'RAW-PLASTIC-001', 1.80, 100, 7, true),
((SELECT id FROM suppliers WHERE code = 'PACK001'), (SELECT id FROM items WHERE sku = 'PACK001'), 'PACK-BOX-001', 1.25, 100, 3, true),
((SELECT id FROM suppliers WHERE code = 'SAFE001'), (SELECT id FROM items WHERE sku = 'SAFE001'), 'SAFE-GLOVES-001', 4.50, 25, 5, true);

-- Insert sample stock batches
INSERT INTO stock_batches (item_id, location_id, batch_number, quantity, reserved_quantity, unit_cost, manufacture_date, expiry_date) VALUES
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '01'), 'BATCH-001', 15, 2, 750.00, '2024-01-15', NULL),
((SELECT id FROM items WHERE sku = 'ELEC002'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '02'), 'BATCH-002', 75, 5, 22.00, '2024-02-01', NULL),
((SELECT id FROM items WHERE sku = 'OFF001'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '02' AND bin = '01'), 'BATCH-003', 150, 20, 4.50, '2024-01-20', NULL),
((SELECT id FROM items WHERE sku = 'OFF002'), (SELECT id FROM locations WHERE zone = 'B' AND aisle = '01' AND rack = '01' AND bin = '01'), 'BATCH-004', 45, 0, 2.75, '2024-02-10', NULL),
((SELECT id FROM items WHERE sku = 'RAW001'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '02' AND bin = '01'), 'BATCH-005', 30, 5, 45.00, '2024-01-10', NULL),
((SELECT id FROM items WHERE sku = 'RAW002'), (SELECT id FROM locations WHERE zone = 'B' AND aisle = '01' AND rack = '01' AND bin = '01'), 'BATCH-006', 750, 100, 1.80, '2024-01-25', '2025-01-25'),
((SELECT id FROM items WHERE sku = 'PACK001'), (SELECT id FROM locations WHERE zone = 'B' AND aisle = '01' AND rack = '01' AND bin = '01'), 'BATCH-007', 250, 25, 1.25, '2024-02-05', NULL),
((SELECT id FROM items WHERE sku = 'SAFE001'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '02' AND bin = '01'), 'BATCH-008', 120, 15, 4.50, '2024-01-30', NULL);

-- Insert sample reorder rules
INSERT INTO reorder_rules (item_id, warehouse_id, rule_type, min_stock, max_stock, reorder_point, reorder_quantity, safety_stock, lead_time_days, is_active, auto_create_po, preferred_supplier_id) VALUES
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 5, 50, 10, 20, 10, 7, true, false, (SELECT id FROM suppliers WHERE code = 'TECH001')),
((SELECT id FROM items WHERE sku = 'ELEC002'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 25, 150, 25, 50, 25, 5, true, false, (SELECT id FROM suppliers WHERE code = 'TECH001')),
((SELECT id FROM items WHERE sku = 'OFF001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 50, 300, 50, 100, 50, 3, true, false, (SELECT id FROM suppliers WHERE code = 'OFFICE001')),
((SELECT id FROM items WHERE sku = 'OFF002'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 10, 100, 10, 25, 10, 2, true, false, (SELECT id FROM suppliers WHERE code = 'OFFICE001')),
((SELECT id FROM items WHERE sku = 'RAW001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 10, 100, 15, 30, 15, 14, true, false, (SELECT id FROM suppliers WHERE code = 'RAW001')),
((SELECT id FROM items WHERE sku = 'RAW002'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 200, 1500, 250, 500, 250, 7, true, false, (SELECT id FROM suppliers WHERE code = 'RAW001')),
((SELECT id FROM items WHERE sku = 'PACK001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 100, 500, 100, 200, 100, 3, true, false, (SELECT id FROM suppliers WHERE code = 'PACK001')),
((SELECT id FROM items WHERE sku = 'SAFE001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), 'min_max', 50, 200, 50, 100, 50, 5, true, false, (SELECT id FROM suppliers WHERE code = 'SAFE001'));

-- Insert sample users for different roles
INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES
('warehouse@imras.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6', 'Warehouse', 'Staff', 'warehouse_staff', '+919876543213'),
('manager@imras.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6', 'Inventory', 'Manager', 'inventory_manager', '+919876543214');

-- Assign warehouse access to warehouse staff
INSERT INTO user_warehouse_access (user_id, warehouse_id, assigned_by) VALUES
((SELECT id FROM users WHERE email = 'warehouse@imras.com'), (SELECT id FROM warehouses WHERE code = 'MAIN'), (SELECT id FROM users WHERE email = 'admin@imras.com')),
((SELECT id FROM users WHERE email = 'warehouse@imras.com'), (SELECT id FROM warehouses WHERE code = 'NORTH'), (SELECT id FROM users WHERE email = 'admin@imras.com'));

-- Create some sample alerts
INSERT INTO alerts (alert_type, title, message, entity_type, entity_id, warehouse_id, item_id, severity, status) VALUES
('low_stock', 'Low Stock Alert', 'Laptop Computer (ELEC001) is running low on stock', 'item', (SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM warehouses WHERE code = 'MAIN'), (SELECT id FROM items WHERE sku = 'ELEC001'), 'medium', 'active'),
('expiry_warning', 'Expiry Warning', 'Plastic Granules (RAW002) batch BATCH-006 expires in 30 days', 'batch', (SELECT id FROM stock_batches WHERE batch_number = 'BATCH-006'), (SELECT id FROM warehouses WHERE code = 'MAIN'), (SELECT id FROM items WHERE sku = 'RAW002'), 'medium', 'active'),
('reorder_required', 'Reorder Required', 'Ballpoint Pens (OFF002) needs to be reordered', 'item', (SELECT id FROM items WHERE sku = 'OFF002'), (SELECT id FROM warehouses WHERE code = 'MAIN'), (SELECT id FROM items WHERE sku = 'OFF002'), 'low', 'active');

-- Insert sample stock movements
INSERT INTO stock_movements (item_id, batch_id, from_location_id, to_location_id, movement_type, quantity, reference_type, reference_id, reason, performed_by, movement_date) VALUES
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM stock_batches WHERE batch_number = 'BATCH-001'), NULL, (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '01'), 'in', 15, 'grn', (SELECT id FROM goods_receipt_notes LIMIT 1), 'Initial stock', (SELECT id FROM users WHERE email = 'warehouse@imras.com'), '2024-01-15 10:00:00'),
((SELECT id FROM items WHERE sku = 'OFF001'), (SELECT id FROM stock_batches WHERE batch_number = 'BATCH-003'), NULL, (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '02' AND bin = '01'), 'in', 150, 'grn', (SELECT id FROM goods_receipt_notes LIMIT 1), 'Initial stock', (SELECT id FROM users WHERE email = 'warehouse@imras.com'), '2024-01-20 09:30:00'),
((SELECT id FROM items WHERE sku = 'ELEC001'), (SELECT id FROM stock_batches WHERE batch_number = 'BATCH-001'), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '01'), NULL, 'out', 2, 'sale', gen_random_uuid(), 'Sold to customer', (SELECT id FROM users WHERE email = 'warehouse@imras.com'), '2024-02-01 14:15:00');

-- Create audit log entries for initial data
INSERT INTO audit_logs (table_name, record_id, operation, new_values, changed_by, changed_at) VALUES
('users', (SELECT id FROM users WHERE email = 'admin@imras.com'), 'INSERT', '{"email": "admin@imras.com", "role": "admin"}', (SELECT id FROM users WHERE email = 'admin@imras.com'), NOW()),
('items', (SELECT id FROM items WHERE sku = 'ELEC001'), 'INSERT', '{"sku": "ELEC001", "name": "Laptop Computer"}', (SELECT id FROM users WHERE email = 'admin@imras.com'), NOW()),
('warehouses', (SELECT id FROM warehouses WHERE code = 'MAIN'), 'INSERT', '{"code": "MAIN", "name": "Main Warehouse"}', (SELECT id FROM users WHERE email = 'admin@imras.com'), NOW());

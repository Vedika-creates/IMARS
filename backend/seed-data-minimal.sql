-- IMRAS Seed Data - Minimal Working Version
-- Run this in Supabase SQL Editor to populate initial data

-- 1. Categories
INSERT INTO categories (name, description) VALUES 
('Electronics', 'Electronic components and devices'),
('Office Supplies', 'Stationery and office equipment'),
('Raw Materials', 'Raw materials for production'),
('Finished Goods', 'Completed products ready for sale'),
('Tools & Equipment', 'Tools and maintenance equipment'),
('Safety Supplies', 'Safety and protective equipment');

-- 2. Warehouses
INSERT INTO warehouses (name, code, is_active) VALUES 
('Main Warehouse', 'MAIN', true),
('North Warehouse', 'NORTH', true),
('South Warehouse', 'SOUTH', true);

-- 3. Locations for Main Warehouse
INSERT INTO locations (warehouse_id, zone, aisle, rack, bin, location_type) VALUES 
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'A', '01', '01', '001', 'storage'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'A', '01', '01', '002', 'storage'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'A', '01', '02', '001', 'storage'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'B', '01', '01', '001', 'picking'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'B', '01', '01', '002', 'picking'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'C', '01', '01', '001', 'receiving'),
((SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'C', '01', '01', '002', 'shipping');

-- 4. Suppliers
INSERT INTO suppliers (name, lead_time_days, is_active) VALUES 
('Tech Supplies Inc', 7, true),
('Office Depot Wholesale', 5, true),
('Global Materials Co', 10, true),
('Safety First Supplies', 3, true);

-- 5. Items
INSERT INTO items (sku, name, category_id, unit_of_measure, requires_batch_tracking, has_expiry, standard_cost, selling_price, reorder_point, max_stock, is_active) VALUES 
('ELEC001', 'Laptop Computer', (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Each', true, false, 800.00, 1200.00, 5, 50, true),
('ELEC002', 'Wireless Mouse', (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Each', false, false, 25.00, 45.00, 25, 100, true),
('ELEC003', 'USB-C Cable', (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Each', false, false, 8.00, 15.00, 50, 200, true),
('OFF001', 'A4 Paper', (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 'Ream', false, false, 5.00, 8.00, 50, 200, true),
('OFF002', 'Ballpoint Pens', (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 'Box', false, false, 3.00, 6.00, 10, 50, true),
('OFF003', 'Notebook', (SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1), 'Each', false, false, 2.50, 5.00, 25, 100, true),
('RAW001', 'Steel Sheets', (SELECT id FROM categories WHERE name = 'Raw Materials' LIMIT 1), 'Sheet', true, false, 50.00, 75.00, 10, 50, true),
('RAW002', 'Plastic Granules', (SELECT id FROM categories WHERE name = 'Raw Materials' LIMIT 1), 'Kg', true, true, 2.00, 3.50, 250, 1000, true),
('FIN001', 'Office Chair', (SELECT id FROM categories WHERE name = 'Finished Goods' LIMIT 1), 'Each', false, false, 150.00, 250.00, 8, 40, true),
('SAF001', 'Safety Gloves', (SELECT id FROM categories WHERE name = 'Safety Supplies' LIMIT 1), 'Pack', true, true, 15.00, 25.00, 15, 60, true);

-- 6. Stock Batches (initial inventory)
INSERT INTO stock_batches (item_id, location_id, batch_number, quantity, reserved_quantity, status) VALUES 
((SELECT id FROM items WHERE sku = 'ELEC001' LIMIT 1), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '001' LIMIT 1), 'BATCH001', 20, 0, 'active'),
((SELECT id FROM items WHERE sku = 'ELEC002' LIMIT 1), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '002' LIMIT 1), 'BATCH002', 75, 0, 'active'),
((SELECT id FROM items WHERE sku = 'OFF001' LIMIT 1), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '02' AND bin = '001' LIMIT 1), 'BATCH003', 150, 0, 'active'),
((SELECT id FROM items WHERE sku = 'OFF002' LIMIT 1), (SELECT id FROM locations WHERE zone = 'B' AND aisle = '01' AND rack = '01' AND bin = '001' LIMIT 1), 'BATCH004', 45, 0, 'active'),
((SELECT id FROM items WHERE sku = 'FIN001' LIMIT 1), (SELECT id FROM locations WHERE zone = 'B' AND aisle = '01' AND rack = '01' AND bin = '002' LIMIT 1), 'BATCH005', 25, 0, 'active');

-- 7. Reorder Rules
INSERT INTO reorder_rules (item_id, warehouse_id, rule_type, reorder_point, reorder_quantity, auto_create_po) VALUES 
((SELECT id FROM items WHERE sku = 'ELEC001' LIMIT 1), (SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'reorder_point', 15, 35, false),
((SELECT id FROM items WHERE sku = 'ELEC002' LIMIT 1), (SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'reorder_point', 30, 70, false),
((SELECT id FROM items WHERE sku = 'OFF001' LIMIT 1), (SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'reorder_point', 60, 140, false),
((SELECT id FROM items WHERE sku = 'OFF002' LIMIT 1), (SELECT id FROM warehouses WHERE code = 'MAIN' LIMIT 1), 'reorder_point', 15, 35, false);

-- 8. Sample Stock Movements
INSERT INTO stock_movements (item_id, batch_id, to_location_id, movement_type, quantity) VALUES 
((SELECT id FROM items WHERE sku = 'ELEC001' LIMIT 1), (SELECT id FROM stock_batches WHERE batch_number = 'BATCH001' LIMIT 1), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '001' LIMIT 1), 'in', 20),
((SELECT id FROM items WHERE sku = 'ELEC002' LIMIT 1), (SELECT id FROM stock_batches WHERE batch_number = 'BATCH002' LIMIT 1), (SELECT id FROM locations WHERE zone = 'A' AND aisle = '01' AND rack = '01' AND bin = '002' LIMIT 1), 'in', 75);

-- 9. Sample Purchase Orders
INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount) VALUES 
('PO-2024-001', (SELECT id FROM suppliers WHERE name = 'Tech Supplies Inc' LIMIT 1), 'sent', 17000.00),
('PO-2024-002', (SELECT id FROM suppliers WHERE name = 'Office Depot Wholesale' LIMIT 1), 'draft', 825.00);

-- Success message
SELECT 'Seed data inserted successfully!' as message;

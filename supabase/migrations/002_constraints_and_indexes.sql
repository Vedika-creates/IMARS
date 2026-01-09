-- IMRAS Constraints, Indexes, and Views
-- Migration: 002_constraints_and_indexes.sql

-- Check Constraints
ALTER TABLE stock_batches ADD CONSTRAINT chk_positive_quantity CHECK (quantity >= 0);
ALTER TABLE stock_batches ADD CONSTRAINT chk_positive_reserved CHECK (reserved_quantity >= 0);
ALTER TABLE stock_batches ADD CONSTRAINT chk_reserved_not_greater CHECK (reserved_quantity <= quantity);

ALTER TABLE items ADD CONSTRAINT chk_positive_cost CHECK (standard_cost >= 0);
ALTER TABLE items ADD CONSTRAINT chk_positive_price CHECK (selling_price >= 0);

ALTER TABLE stock_batches ADD CONSTRAINT chk_expiry_after_manufacture CHECK (expiry_date IS NULL OR manufacture_date IS NULL OR expiry_date > manufacture_date);

ALTER TABLE suppliers ADD CONSTRAINT chk_quality_rating_range CHECK (quality_rating >= 0 AND quality_rating <= 5);
ALTER TABLE suppliers ADD CONSTRAINT chk_delivery_rating_range CHECK (delivery_rating >= 0 AND delivery_rating <= 5);

ALTER TABLE reorder_rules ADD CONSTRAINT chk_service_level_range CHECK (service_level_percent > 0 AND service_level_percent <= 100);
ALTER TABLE reorder_rules ADD CONSTRAINT chk_positive_forecast_days CHECK (demand_forecast_days > 0);

-- Performance Indexes
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Items
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_active ON items(is_active);
CREATE INDEX idx_items_name_search ON items USING gin(to_tsvector('english', name));

-- Stock
CREATE INDEX idx_stock_batches_item ON stock_batches(item_id);
CREATE INDEX idx_stock_batches_location ON stock_batches(location_id);
CREATE INDEX idx_stock_batches_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_stock_batches_status ON stock_batches(status);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);

-- Alerts
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at);
CREATE INDEX idx_alerts_warehouse ON alerts(warehouse_id);

-- Categories
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Locations
CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_active ON locations(is_active);

-- Warehouses
CREATE INDEX idx_warehouses_active ON warehouses(is_active);
CREATE INDEX idx_warehouses_code ON warehouses(code);

-- Suppliers
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_code ON suppliers(code);

-- Supplier Items
CREATE INDEX idx_supplier_items_supplier ON supplier_items(supplier_id);
CREATE INDEX idx_supplier_items_item ON supplier_items(item_id);
CREATE INDEX idx_supplier_items_active ON supplier_items(is_active);

-- Purchase Requisitions
CREATE INDEX idx_purchase_requisitions_requested_by ON purchase_requisitions(requested_by);
CREATE INDEX idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX idx_purchase_requisitions_priority ON purchase_requisitions(priority);

-- Purchase Order Items
CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_item ON purchase_order_items(item_id);

-- GRN
CREATE INDEX idx_grn_po ON goods_receipt_notes(po_id);
CREATE INDEX idx_grn_warehouse ON goods_receipt_notes(warehouse_id);
CREATE INDEX idx_grn_status ON goods_receipt_notes(status);

-- GRN Items
CREATE INDEX idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX idx_grn_items_item ON grn_items(item_id);
CREATE INDEX idx_grn_items_batch ON grn_items(batch_id);

-- Transfer Orders
CREATE INDEX idx_transfer_orders_from_warehouse ON transfer_orders(from_warehouse_id);
CREATE INDEX idx_transfer_orders_to_warehouse ON transfer_orders(to_warehouse_id);
CREATE INDEX idx_transfer_orders_status ON transfer_orders(status);

-- Transfer Order Items
CREATE INDEX idx_transfer_order_items_transfer ON transfer_order_items(transfer_id);
CREATE INDEX idx_transfer_order_items_item ON transfer_order_items(item_id);

-- Reorder Rules
CREATE INDEX idx_reorder_rules_item ON reorder_rules(item_id);
CREATE INDEX idx_reorder_rules_warehouse ON reorder_rules(warehouse_id);
CREATE INDEX idx_reorder_rules_active ON reorder_rules(is_active);

-- User Sessions
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Audit Logs
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Views for Common Queries

-- Stock Status View
CREATE VIEW stock_status AS
SELECT 
    i.id as item_id,
    i.sku,
    i.name as item_name,
    c.name as category_name,
    COALESCE(SUM(sb.quantity), 0) as total_quantity,
    COALESCE(SUM(sb.reserved_quantity), 0) as reserved_quantity,
    COALESCE(SUM(sb.available_quantity), 0) as available_quantity,
    i.reorder_point,
    i.safety_stock,
    CASE 
        WHEN COALESCE(SUM(sb.available_quantity), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(sb.available_quantity), 0) <= i.reorder_point THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status,
    w.name as warehouse_name,
    w.id as warehouse_id
FROM items i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN stock_batches sb ON i.id = sb.item_id AND sb.status = 'active'
LEFT JOIN locations l ON sb.location_id = l.id
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE i.is_active = true
GROUP BY i.id, i.sku, i.name, c.name, i.reorder_point, i.safety_stock, w.name, w.id;

-- Supplier Performance View
CREATE VIEW supplier_performance AS
SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    COUNT(po.id) as total_orders,
    SUM(po.final_amount) as total_value,
    AVG(po.final_amount) as avg_order_value,
    COUNT(CASE WHEN po.status = 'completed' THEN 1 END) as completed_orders,
    AVG(EXTRACT(DAY FROM po.actual_delivery_date - po.expected_delivery_date)) as avg_delivery_days,
    s.quality_rating,
    s.delivery_rating,
    s.lead_time_days
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.quality_rating, s.delivery_rating, s.lead_time_days;

-- Low Stock Alert View
CREATE VIEW low_stock_alerts AS
SELECT 
    i.id as item_id,
    i.sku,
    i.name as item_name,
    w.name as warehouse_name,
    w.id as warehouse_id,
    COALESCE(SUM(sb.available_quantity), 0) as current_stock,
    i.reorder_point,
    i.safety_stock,
    CASE 
        WHEN COALESCE(SUM(sb.available_quantity), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(sb.available_quantity), 0) <= i.safety_stock THEN 'critical'
        ELSE 'low'
    END as alert_level
FROM items i
LEFT JOIN stock_batches sb ON i.id = sb.item_id AND sb.status = 'active'
LEFT JOIN locations l ON sb.location_id = l.id
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE i.is_active = true 
    AND i.reorder_point > 0
    AND w.is_active = true
GROUP BY i.id, i.sku, i.name, w.name, w.id, i.reorder_point, i.safety_stock
HAVING COALESCE(SUM(sb.available_quantity), 0) <= i.reorder_point;

-- Expiry Alert View
CREATE VIEW expiry_alerts AS
SELECT 
    i.id as item_id,
    i.sku,
    i.name as item_name,
    sb.batch_number,
    sb.expiry_date,
    sb.quantity,
    w.name as warehouse_name,
    l.zone,
    l.aisle,
    l.rack,
    l.bin,
    CASE 
        WHEN sb.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'ok'
    END as expiry_status
FROM items i
JOIN stock_batches sb ON i.id = sb.item_id
JOIN locations l ON sb.location_id = l.id
JOIN warehouses w ON l.warehouse_id = w.id
WHERE i.is_active = true 
    AND sb.status = 'active'
    AND sb.quantity > 0
    AND i.has_expiry = true
    AND sb.expiry_date IS NOT NULL
    AND sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY sb.expiry_date ASC;

-- Purchase Order Status View
CREATE VIEW purchase_order_summary AS
SELECT 
    po.id as po_id,
    po.po_number,
    s.name as supplier_name,
    w.name as warehouse_name,
    po.status,
    po.order_date,
    po.expected_delivery_date,
    po.total_amount,
    po.final_amount,
    COUNT(poi.id) as total_items,
    SUM(poi.quantity_ordered) as total_quantity_ordered,
    SUM(poi.quantity_received) as total_quantity_received,
    CASE 
        WHEN SUM(poi.quantity_received) = 0 THEN 'pending'
        WHEN SUM(poi.quantity_received) < SUM(poi.quantity_ordered) THEN 'partial'
        WHEN SUM(poi.quantity_received) >= SUM(poi.quantity_ordered) THEN 'complete'
    END as receipt_status
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN warehouses w ON po.warehouse_id = w.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
GROUP BY po.id, po.po_number, s.name, w.name, po.status, po.order_date, po.expected_delivery_date, po.total_amount, po.final_amount;

-- Daily Stock Movement View
CREATE VIEW daily_stock_movements AS
SELECT 
    DATE(sm.movement_date) as movement_date,
    sm.movement_type,
    i.name as item_name,
    i.sku,
    w.name as warehouse_name,
    SUM(sm.quantity) as total_quantity,
    COUNT(sm.id) as movement_count
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
LEFT JOIN locations l ON sm.to_location_id = l.id OR sm.from_location_id = l.id
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE sm.movement_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(sm.movement_date), sm.movement_type, i.name, i.sku, w.name
ORDER BY movement_date DESC;

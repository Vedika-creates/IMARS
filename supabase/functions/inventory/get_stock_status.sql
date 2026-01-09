-- Get stock status for items
CREATE OR REPLACE FUNCTION inventory.get_stock_status(warehouse_uuid UUID DEFAULT NULL, item_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    item_id UUID,
    sku VARCHAR,
    item_name VARCHAR,
    category_name VARCHAR,
    total_quantity DECIMAL,
    reserved_quantity DECIMAL,
    available_quantity DECIMAL,
    reorder_point DECIMAL,
    safety_stock DECIMAL,
    stock_status VARCHAR,
    warehouse_name VARCHAR,
    warehouse_id UUID
) AS $$
BEGIN
    RETURN QUERY
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
        AND (warehouse_uuid IS NULL OR w.id = warehouse_uuid)
        AND (item_uuid IS NULL OR i.id = item_uuid)
        AND (warehouse_uuid IS NULL OR w.is_active = true)
    GROUP BY i.id, i.sku, i.name, c.name, i.reorder_point, i.safety_stock, w.name, w.id
    ORDER BY i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION inventory.get_stock_status TO authenticated;

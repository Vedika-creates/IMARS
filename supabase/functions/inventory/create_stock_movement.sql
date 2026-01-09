-- Create stock movement function
CREATE OR REPLACE FUNCTION inventory.create_stock_movement(
    item_uuid UUID,
    batch_uuid UUID DEFAULT NULL,
    from_location_uuid UUID DEFAULT NULL,
    to_location_uuid UUID DEFAULT NULL,
    movement_type movement_type_enum,
    quantity DECIMAL,
    reference_type VARCHAR DEFAULT NULL,
    reference_id UUID DEFAULT NULL,
    reason TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE躁
DECLARE
    of 
   申请人
申请人
 sto
    offsets
DECLARE
 Vol
DECLARE
    movement_id UUID;
    new_quantity DECIMAL;
    batch_record stock_batches%ROWTYPE;
    from_location_record locations%ROWTYPE;
    to_location_record locations%ROWTYPE;
BEGIN
    -- Validate inputs
    IF quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Quantity must be positive');
    END IF;
    
    -- Get batch information if provided
    IF batch_uuid IS NOT NULL THEN
        SELECT * INTO batch_record FROM stock_batches WHERE id = batch_uuid;
        
        IF batch_record IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Batch not found');
        END IF;
        
        -- Check if batch has enough quantity for outgoing movements
1
        .
        IF_,
        IF movement_type IN ('out', 'transfer') AND batch_record.available_quantity < quantity THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient stock in batch');
        END IF;
    END IF;
    
    -- Validate locations for transfer movements
    IF movement_type = 'transfer' THEN
        IF from_location_uuid IS NULL OR to_location_uuid IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Both from and to locations required for transfer');
        END IF;
        
        SELECT * INTO from_location_record FROM locations WHERE id = from_location_uuid;
        SELECT * INTO to_location_record FROM locations WHERE id = to_location_uuid;
        
        IF from_location_record IS NULL OR to_location_record IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Invalid location(s)');
        END IF;
    END IF;
    
    -- Create the stock movement record
    INSERT INTO stock_movements (
        item_id, batch_id, from_location_id, to_location_id,
        movement_type, quantity, reference_type, reference_id,
        reason, performed_by
    ) VALUES (
        item_uuid, batch_uuid, from_location_uuid, to_location_uuid,
        movement_type, quantity, reference_type, reference_id,
        reason, auth.uid()
    ) RETURNING id INTO movement_id;
    
    -- Update batch quantities
    IF batch_uuid IS NOT NULL THEN
        CASE movement_type
            WHEN 'in' THEN
                UPDATE stock_batches 
                SET quantity = quantity + quantity,
                    updated_at = NOW()
                WHERE id = batch_uuid;
                
            WHEN 'out' THEN
                UPDATE stock_batches 
                SET quantity = quantity - quantity,
                    updated_at = NOW()
                WHERE id = batch_uuid;
                
            WHEN 'transfer' THEN
                -- For transfers, we don't change the batch quantity, just location
                UPDATE stock_batches 
                SET location_id = to_location_uuid,
                    updated_at = NOW()
                WHERE id = batch_uuid;
                
            WHEN 'adjustment' THEN
                -- Adjustments can be positive or negative
                UPDATE stock_batches 
                SET quantity = quantity + quantity,
                    updated_at = NOW()
                WHERE id = batch_uuid;
        END CASE;
    END IF;
    
    -- Create alert if stock is low
    IF batch_uuid IS NOT NULL AND movement_type IN ('out', 'transfer', 'adjustment') THEN
        PERFORM create_low_stock_alert(batch_record.item_id, batch_record.location_id);
    END IF;
    
    RETURN json_build_object('success', true, 'movement_id', movement_id);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create low stock alerts
CREATE OR REPLACE FUNCTION create_low_stock_alert(item_uuid UUID, location_uuid UUID)
RETURNS void AS $$
DECLARE
    current_stock DECIMAL;
    reorder_point DECIMAL;
    item_record items%ROWTYPE;
    location_record locations%ROWTYPE;
BEGIN
    -- Get item and location information
    SELECT * INTO item_record FROM items WHERE id = item_uuid;
    SELECT * INTO location_record FROM locations WHERE id = location_uuid;
    
    IF item_record IS NULL OR location_record IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate current stock for this item at this location
    SELECT COALESCE(SUM(available_quantity), 0) INTO current_stock
    FROM stock_batches
    WHERE item_id = item_uuid AND location_id = location_uuid AND status = 'active';
    
    -- Check if we need to create an alert
    IF current_stock <= item_record.reorder_point AND item_record.reorder_point > 0 THEN
        INSERT INTO alerts (
            alert_type, title, message, entity_type, entity_id,
            warehouse_id, item_id, severity, status
        ) VALUES (
            'low_stock',
            'Low Stock Alert',
            format('%s (SKU: %s) is running low on stock at %s. Current: %s, Reorder Point: %s',
                   item_record.name, item_record.sku, 
                   location_record.zone || '-' || location_record.aisle || '-' || location_record.rack || '-' || location_record.bin,
                   current_stock, item_record.reorder_point),
            'item',
            item_uuid,
            location_record.warehouse_id,
            item_uuid,
            CASE 
                WHEN current_stock = 0 THEN 'critical'
                WHEN current_stock <= item_record.safety_stock THEN 'high'
                ELSE 'medium'
            END,
            'active'
        ) ON CONFLICT (entity_type, entity_id, warehouse_id, item_id, alert_type) 
        DO UPDATE SET 
            message = EXCLUDED.message,
            severity = EXCLUDED.severity,
            created_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION inventory.create_stock_movement TO authenticated;

import { db } from "../db.js";

export const getReorderRules = async (req, res) => {
  try {
    const { warehouse_id, item_id } = req.query;
    
    let query = `
      SELECT rr.*,
             i.name as item_name, i.sku as item_sku,
             w.name as warehouse_name, w.code as warehouse_code
      FROM reorder_rules rr
      LEFT JOIN items i ON rr.item_id = i.id
      LEFT JOIN warehouses w ON rr.warehouse_id = w.id
      WHERE rr.is_active = 1
    `;
    
    const params = [];

    if (warehouse_id) {
      query += ' AND rr.warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (item_id) {
      query += ' AND rr.item_id = ?';
      params.push(item_id);
    }

    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching reorder rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reorder rules',
      error: error.message
    });
  }
};

export const createReorderRule = async (req, res) => {
  try {
    const { item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active } = req.body;

    const [result] = await db.execute(
      `INSERT INTO reorder_rules (item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active !== false]
    );
    
    const [newRule] = await db.execute('SELECT * FROM reorder_rules WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Reorder rule created successfully',
      data: newRule[0]
    });
  } catch (error) {
    console.error('Error creating reorder rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reorder rule',
      error: error.message
    });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const { warehouse_id, alert_type, severity, status } = req.query;
    
    let query = `
      SELECT a.*,
             i.name as item_name, i.sku as item_sku,
             w.name as warehouse_name, w.code as warehouse_code
      FROM alerts a
      LEFT JOIN items i ON a.item_id = i.id
      LEFT JOIN warehouses w ON a.warehouse_id = w.id
    `;
    
    const conditions = [];
    const params = [];

    if (warehouse_id) {
      conditions.push('a.warehouse_id = ?');
      params.push(warehouse_id);
    }

    if (alert_type) {
      conditions.push('a.alert_type = ?');
      params.push(alert_type);
    }

    if (severity) {
      conditions.push('a.severity = ?');
      params.push(severity);
    }

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';
    
    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

export const runReorderCheck = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    
    // Get items that need reordering
    let query = `
      SELECT i.*, rr.reorder_point, rr.max_stock, rr.strategy
      FROM items i
      LEFT JOIN reorder_rules rr ON i.id = rr.item_id AND rr.warehouse_id = ? AND rr.is_active = 1
    `;
    const params = [warehouse_id || null];
    
    const [items] = await db.execute(query, params);
    
    const reorderList = [];
    
    for (const item of items) {
      const currentStockQuery = `
        SELECT COALESCE(SUM(quantity), 0) as total_quantity,
               COALESCE(SUM(reserved_quantity), 0) as reserved_quantity,
               COALESCE(SUM(available_quantity), 0) as available_quantity
        FROM stock_batches 
        WHERE item_id = ? AND status = 'active'
      `;
      
      const [stockResult] = await db.execute(currentStockQuery, [item.id]);
      const stock = stockResult[0];
      
      const reorderPoint = item.reorder_point || 10; // Default reorder point
      const maxStock = item.max_stock || 100; // Default max stock
      
      if (stock.available_quantity <= reorderPoint) {
        const suggestedQty = maxStock - stock.available_quantity;
        
        reorderList.push({
          item_id: item.id,
          item_name: item.name,
          item_sku: item.sku,
          current_stock: stock.available_quantity,
          reorder_point: reorderPoint,
          suggested_quantity: suggestedQty,
          priority: stock.available_quantity === 0 ? 'urgent' : 'high',
          strategy: item.strategy || 'simple'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Reorder check completed. Found ${reorderList.length} items needing reorder.`,
      data: reorderList,
      count: reorderList.length
    });
  } catch (error) {
    console.error('Error running reorder check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run reorder check',
      error: error.message
    });
  }
};

import { db } from "../db.js";

export const getStockStatus = async (req, res) => {
  try {
    const { warehouse_id, item_id } = req.query;
    
    let query = 'SELECT * FROM stock_status';
    const params = [];
    const conditions = [];

    if (warehouse_id) {
      conditions.push('warehouse_id = ?');
      params.push(warehouse_id);
    }

    if (item_id) {
      conditions.push('item_id = ?');
      params.push(item_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching stock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock status',
      error: error.message
    });
  }
};

export const getStockMovements = async (req, res) => {
  try {
    const { 
      warehouse_id, 
      item_id, 
      movement_type, 
      start_date, 
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT sm.*,
             i.name as item_name, i.sku as item_sku,
             b.batch_number, b.expiry_date,
             fl.zone as from_zone, fl.aisle as from_aisle, fl.rack as from_rack, fl.bin as from_bin,
             tl.zone as to_zone, tl.aisle as to_aisle, tl.rack as to_rack, tl.bin as to_bin,
             u.first_name, u.last_name
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.id
      LEFT JOIN stock_batches b ON sm.batch_id = b.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      LEFT JOIN users u ON sm.performed_by = u.id
    `;
    
    const conditions = [];
    const params = [];

    if (warehouse_id) {
      conditions.push('(fl.warehouse_id = ? OR tl.warehouse_id = ?)');
      params.push(warehouse_id, warehouse_id);
    }

    if (item_id) {
      conditions.push('sm.item_id = ?');
      params.push(item_id);
    }

    if (movement_type) {
      conditions.push('sm.movement_type = ?');
      params.push(movement_type);
    }

    if (start_date) {
      conditions.push('sm.movement_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('sm.movement_date <= ?');
      params.push(end_date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*$/, '');
    const [countResult] = await db.execute(countQuery, params);
    const count = countResult[0]['COUNT(*)'];

    // Add ordering and pagination
    query += ' ORDER BY sm.movement_date DESC';
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movements',
      error: error.message
    });
  }
};

export const getCurrentStock = async (req, res) => {
  try {
    const { item_id, warehouse_id } = req.query;
    
    let query = `
      SELECT quantity, reserved_quantity, available_quantity
      FROM stock_batches
      WHERE item_id = ? AND status = 'active'
    `;
    const params = [item_id];

    if (warehouse_id) {
      query += ` AND location_id IN (
        SELECT id FROM locations WHERE warehouse_id = ?
      )`;
      params.push(warehouse_id);
    }

    const [rows] = await db.execute(query, params);
    const data = rows;
    
    const totalQuantity = data.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalReserved = data.reduce((sum, batch) => sum + batch.reserved_quantity, 0);
    const totalAvailable = data.reduce((sum, batch) => sum + batch.available_quantity, 0);
    
    res.json({
      success: true,
      data: {
        total_quantity: totalQuantity,
        reserved_quantity: totalReserved,
        available_quantity: totalAvailable,
        batches: data
      }
    });
  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current stock',
      error: error.message
    });
  }
};

import { db } from "../databaseClient.js";
import { 
  addStockMovement, 
  getStockStatus, 
  getCurrentStock,
  reserveStock,
  releaseReservedStock
} from "../services/stock.service.js";

export const createStockMovement = async (req, res) => {
  try {
    const movementData = req.body;
    
    // Add performed_by from authenticated user (you'll need to get this from auth middleware)
    movementData.performed_by = req.user?.id || null;

    await addStockMovement(movementData);
    res.json({ message: "Stock movement created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStockStatusController = async (req, res) => {
  try {
    const { warehouse_id, item_id } = req.query;
    const stockStatus = await getStockStatus(warehouse_id, item_id);
    res.json(stockStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentStockController = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { warehouse_id } = req.query;
    
    const stock = await getCurrentStock(item_id, warehouse_id);
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reserveStockController = async (req, res) => {
  try {
    const { item_id, quantity, warehouse_id } = req.body;
    
    const reservations = await reserveStock(item_id, quantity, warehouse_id);
    res.json({ 
      message: "Stock reserved successfully", 
      reservations 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const releaseReservedStockController = async (req, res) => {
  try {
    const { batch_id, quantity } = req.body;
    
    await releaseReservedStock(batch_id, quantity);
    res.json({ message: "Reserved stock released successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStockBatches = async (req, res) => {
  try {
    const { warehouse_id, item_id, status = 'active' } = req.query;

    let query = `
      SELECT sb.*,
             i.name as item_name, i.sku as item_sku, i.requires_batch_tracking, i.has_expiry,
             l.zone, l.aisle, l.rack, l.bin, l.warehouse_id,
             w.name as warehouse_name, w.code as warehouse_code
      FROM stock_batches sb
      LEFT JOIN items i ON sb.item_id = i.id
      LEFT JOIN locations l ON sb.location_id = l.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
    `;
    
    const conditions = [];
    const params = [];

    if (warehouse_id) {
      conditions.push('l.warehouse_id = ?');
      params.push(warehouse_id);
    }

    if (item_id) {
      conditions.push('sb.item_id = ?');
      params.push(item_id);
    }

    if (status) {
      conditions.push('sb.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sb.created_at DESC';
    
    const [rows] = await db.execute(query, params);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { 
      item_id, 
      batch_id, 
      location_id, 
      quantity, 
      reason,
      adjustment_type = 'manual'
    } = req.body;

    const movementData = {
      item_id,
      batch_id,
      from_location_id: location_id,
      to_location_id: location_id,
      quantity: Math.abs(quantity),
      movement_type: quantity >= 0 ? 'in' : 'out',
      reference_type: 'adjustment',
      reason: `${adjustment_type} adjustment: ${reason}`,
      performed_by: req.user?.id || null
    };

    await addStockMovement(movementData);
    res.json({ message: "Stock adjustment completed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const transferStock = async (req, res) => {
  try {
    const { 
      item_id, 
      batch_id, 
      from_location_id, 
      to_location_id, 
      quantity,
      reason
    } = req.body;

    const movementData = {
      item_id,
      batch_id,
      from_location_id,
      to_location_id,
      quantity,
      movement_type: 'transfer',
      reference_type: 'transfer',
      reason: reason || 'Stock transfer',
      performed_by: req.user?.id || null
    };

    await addStockMovement(movementData);
    res.json({ message: "Stock transfer completed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

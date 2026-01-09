import { db } from "../databaseClient.js";
import { 
  runReorderCheck, 
  createAutoPurchaseRequisition, 
  getLowStockAlerts, 
  getExpiryAlerts 
} from "../services/reorder.service.js";

export const runReorderCheckController = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const reorderList = await runReorderCheck(warehouse_id);
    res.json(reorderList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAutoRequisition = async (req, res) => {
  try {
    const { reorder_items, requested_by } = req.body;
    
    if (!requested_by) {
      return res.status(400).json({ error: "requested_by is required" });
    }

    const requisitions = await createAutoPurchaseRequisition(reorder_items, requested_by);
    res.json({ 
      message: "Auto purchase requisitions created", 
      data: requisitions 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLowStockAlertsController = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const alerts = await getLowStockAlerts(warehouse_id);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getExpiryAlertsController = async (req, res) => {
  try {
    const { warehouse_id, days_ahead = 90 } = req.query;
    const alerts = await getExpiryAlerts(warehouse_id, parseInt(days_ahead));
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createReorderRule = async (req, res) => {
  try {
    const rule = req.body;
    const { item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active } = rule;

    const [result] = await db.execute(
      `INSERT INTO reorder_rules (item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active !== false]
    );
    
    const newRule = { id: result.insertId, ...rule };
    res.json({ message: "Reorder rule created", data: newRule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateReorderRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = req.body;
    const { item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active } = rule;

    const [result] = await db.execute(
      `UPDATE reorder_rules SET 
       item_id = ?, warehouse_id = ?, reorder_point = ?, max_stock = ?, strategy = ?,
       lead_time = ?, preferred_supplier_id = ?, rule_type = ?, is_active = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [item_id, warehouse_id, reorder_point, max_stock, strategy, lead_time, preferred_supplier_id, rule_type, is_active !== false, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reorder rule not found' });
    }
    
    const updatedRule = { id, ...rule };
    res.json({ message: "Reorder rule updated", data: updatedRule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteReorderRule = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      'UPDATE reorder_rules SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reorder rule not found' });
    }

    res.json({ message: "Reorder rule deactivated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by } = req.body;

    const [result] = await db.execute(
      `UPDATE alerts SET 
       status = 'acknowledged', acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [acknowledged_by, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: "Alert acknowledged" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by } = req.body;

    const [result] = await db.execute(
      `UPDATE alerts SET 
       status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resolved_by, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: "Alert resolved" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

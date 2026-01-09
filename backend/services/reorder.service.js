import { db } from "../databaseClient.js";

// Enhanced reorder quantity calculation with multiple strategies
export const calculateReorderQty = (
  currentStock,
  reorderPoint,
  maxLevel,
  strategy = 'simple',
  historicalData = null,
  leadTime = 7
) => {
  if (currentStock <= reorderPoint) {
    switch (strategy) {
      case 'dynamic':
        return calculateDynamicReorder(currentStock, maxLevel, historicalData, leadTime);
      case 'eoq':
        return calculateEOQ(historicalData);
      case 'safety_stock':
        return calculateSafetyStockReorder(currentStock, maxLevel, historicalData, leadTime);
      default:
        return maxLevel - currentStock;
    }
  }
  return 0;
};

// Dynamic reorder calculation based on consumption patterns
const calculateDynamicReorder = (currentStock, maxLevel, historicalData, leadTime) => {
  if (!historicalData || historicalData.length === 0) {
    return maxLevel - currentStock;
  }
  
  // Calculate average daily consumption
  const avgDailyConsumption = historicalData.reduce((sum, record) => 
    sum + record.quantity_consumed, 0) / historicalData.length;
  
  // Calculate consumption variance for safety stock
  const variance = calculateVariance(historicalData.map(r => r.quantity_consumed));
  const standardDeviation = Math.sqrt(variance);
  
  // Safety stock = Z-score * standard deviation * sqrt(lead time)
  const safetyStock = 1.65 * standardDeviation * Math.sqrt(leadTime); // 95% service level
  
  // Expected demand during lead time
  const leadTimeDemand = avgDailyConsumption * leadTime;
  
  // Reorder quantity = (Max level - current stock) + safety stock + lead time demand
  const reorderQty = Math.max(0, (maxLevel - currentStock) + safetyStock + leadTimeDemand);
  
  return Math.round(reorderQty);
};

// Economic Order Quantity calculation
const calculateEOQ = (historicalData) => {
  if (!historicalData || historicalData.length === 0) return 0;
  
  // Simplified EOQ - would need actual cost data in production
  const annualDemand = historicalData.reduce((sum, record) => 
    sum + record.quantity_consumed, 0) * 12; // Monthly to annual
  const orderCost = 25; // Placeholder - should come from supplier data
  const holdingCost = 0.25; // 25% of item cost as placeholder
  const unitCost = 10; // Placeholder - should come from item data
  
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingCost));
  return Math.round(eoq);
};

// Safety stock based reorder
const calculateSafetyStockReorder = (currentStock, maxLevel, historicalData, leadTime) => {
  if (!historicalData || historicalData.length === 0) {
    return maxLevel - currentStock;
  }
  
  const avgDemand = historicalData.reduce((sum, record) => 
    sum + record.quantity_consumed, 0) / historicalData.length;
  const maxDemand = Math.max(...historicalData.map(r => r.quantity_consumed));
  
  // Safety stock = maximum demand - average demand during lead time
  const safetyStock = (maxDemand - avgDemand) * leadTime;
  
  return Math.round((maxLevel - currentStock) + safetyStock);
};

// Calculate variance for safety stock calculations
const calculateVariance = (values) => {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
};

// Get historical consumption data for an item
export const getHistoricalConsumption = async (item_id, warehouse_id, days = 90) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  
  let query = `
    SELECT quantity, movement_date, movement_type
    FROM stock_movements
    WHERE item_id = ? 
    AND movement_type = 'OUT'
    AND movement_date >= ?
  `;
  
  const params = [item_id, startDate];
  
  if (warehouse_id) {
    query += ` AND location_id IN (
      SELECT id FROM locations WHERE warehouse_id = ?
    )`;
    params.push(warehouse_id);
  }
  
  query += ` ORDER BY movement_date DESC`;
  
  const [rows] = await db.execute(query, params);
  const data = rows;
  
  // Group by day and calculate daily consumption
  const dailyConsumption = {};
  data.forEach(movement => {
    const date = movement.movement_date.split('T')[0];
    dailyConsumption[date] = (dailyConsumption[date] || 0) + Math.abs(movement.quantity);
  });
  
  return Object.entries(dailyConsumption).map(([date, quantity]) => ({
    date,
    quantity_consumed: quantity
  }));
};

// Calculate safety stock based on historical data
const calculateSafetyStock = (historicalData, leadTime) => {
  if (!historicalData || historicalData.length === 0) return 0;
  
  const variance = calculateVariance(historicalData.map(r => r.quantity_consumed));
  const standardDeviation = Math.sqrt(variance);
  
  // Safety stock for 95% service level
  return Math.round(1.65 * standardDeviation * Math.sqrt(leadTime));
};

// Enhanced reorder check with multiple strategies and historical data analysis
export const runReorderCheck = async (warehouse_id = null, strategy = 'simple') => {
  let query = 'SELECT * FROM items';
  const params = [];
  
  if (warehouse_id) {
    query += ` WHERE id IN (
      SELECT item_id FROM reorder_rules 
      WHERE warehouse_id = ? AND is_active = 1
    )`;
    params.push(warehouse_id);
  }

  const [items] = await db.execute(query, params);
  const itemsData = items;

  let reorderList = [];

  for (let item of items) {
    try {
      const currentStock = await getCurrentStock(item.id, warehouse_id);
      
      const [reorderRulesRows] = await db.execute(
        'SELECT * FROM reorder_rules WHERE item_id = ? AND is_active = 1',
        [item.id]
      );
      const reorderRules = reorderRulesRows;

      for (const rule of reorderRules) {
        // Get historical consumption data for dynamic calculations
        const historicalData = await getHistoricalConsumption(item.id, rule.warehouse_id);
        
        const qty = calculateReorderQty(
          currentStock.available_quantity,
          rule.reorder_point || item.reorder_point,
          rule.max_stock || item.max_stock,
          rule.strategy || strategy,
          historicalData,
          rule.lead_time || 7
        );

        if (qty > 0) {
          reorderList.push({
            item_id: item.id,
            item_name: item.name,
            sku: item.sku,
            warehouse_id: rule.warehouse_id,
            current_stock: currentStock.available_quantity,
            reorder_point: rule.reorder_point || item.reorder_point,
            max_stock: rule.max_stock || item.max_stock,
            suggested_qty: qty,
            rule_type: rule.rule_type,
            strategy: rule.strategy || strategy,
            preferred_supplier_id: rule.preferred_supplier_id,
            priority: currentStock.available_quantity === 0 ? 'urgent' : 
                     currentStock.available_quantity < (rule.reorder_point || item.reorder_point) * 0.5 ? 'high' : 'normal',
            safety_stock: historicalData ? calculateSafetyStock(historicalData, rule.lead_time || 7) : 0,
            lead_time: rule.lead_time || 7
          });
        }
      }
    } catch (error) {
      console.error(`Error checking reorder for item ${item.id}:`, error);
    }
  }

  return reorderList;
};

export const getCurrentStock = async (item_id, warehouse_id = null) => {
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
  
  return {
    total_quantity: totalQuantity,
    reserved_quantity: totalReserved,
    available_quantity: totalAvailable
  };
};

// Enhanced auto purchase requisition with better grouping and approval workflow
export const createAutoPurchaseRequisition = async (reorderItems, requested_by, priority = 'medium') => {
  if (!reorderItems || reorderItems.length === 0) {
    throw new Error("No items to reorder");
  }

  // Group items by warehouse and supplier for optimal PO creation
  const itemsByWarehouseSupplier = {};
  
  reorderItems.forEach(item => {
    const key = `${item.warehouse_id}_${item.preferred_supplier_id || 'default'}`;
    if (!itemsByWarehouseSupplier[key]) {
      itemsByWarehouseSupplier[key] = {
        warehouse_id: item.warehouse_id,
        supplier_id: item.preferred_supplier_id,
        items: []
      };
    }
    itemsByWarehouseSupplier[key].items.push(item);
  });

  const createdRequisitions = [];

  for (const groupKey in itemsByWarehouseSupplier) {
    const group = itemsByWarehouseSupplier[groupKey];
    const warehouseItems = group.items;
    
    // Calculate total amount (would need actual pricing in production)
    const totalAmount = warehouseItems.reduce((sum, item) => {
      return sum + (item.suggested_qty * 10); // Placeholder cost
    }, 0);

    // Determine priority based on items
    const hasUrgent = warehouseItems.some(item => item.priority === 'urgent');
    const hasHigh = warehouseItems.some(item => item.priority === 'high');
    const reqPriority = hasUrgent ? 'urgent' : hasHigh ? 'high' : priority;

    const [requisitionResult] = await db.execute(
      `INSERT INTO purchase_requisitions (
        requisition_number, requested_by, department, priority, status,
        total_amount, required_date, justification, warehouse_id, supplier_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requested_by,
        'Auto-Reorder',
        reqPriority,
        'pending_review',
        totalAmount,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        `Automatic reorder based on stock levels. Strategy: ${warehouseItems[0]?.strategy || 'simple'}`,
        group.warehouse_id,
        group.supplier_id
      ]
    );
    const requisition = { id: requisitionResult.insertId, ...requisitionResult };

    // Create requisition line items
    const lineItems = warehouseItems.map(item => [
      requisition.id,
      item.item_id,
      item.suggested_qty,
      10, // Placeholder unit price
      item.suggested_qty * 10,
      `Auto-reorder. Current stock: ${item.current_stock}, Safety stock: ${item.safety_stock || 0}`
    ]);

    const lineItemQuery = `
      INSERT INTO purchase_requisition_items (
        requisition_id, item_id, quantity, unit_price, total_price, notes
      ) VALUES ${lineItems.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}
    `;
    
    await db.execute(lineItemQuery, lineItems.flat());

    // Send notification to inventory managers
    await sendReorderNotification(requisition, warehouseItems);

    createdRequisitions.push({
      requisition,
      items: warehouseItems,
      line_items_count: lineItems.length
    });
  }

  return createdRequisitions;
};

export const getLowStockAlerts = async (warehouse_id = null) => {
  let query = 'SELECT * FROM low_stock_alerts';
  const params = [];

  if (warehouse_id) {
    query += ' WHERE warehouse_id = ?';
    params.push(warehouse_id);
  }

  query += ' ORDER BY alert_level DESC';
  
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getExpiryAlerts = async (warehouse_id = null, days_ahead = 90) => {
  let query = `
    SELECT * FROM expiry_alerts
    WHERE expiry_date <= ?
  `;
  const params = [new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]];

  if (warehouse_id) {
    query += ' AND warehouse_id = ?';
    params.push(warehouse_id);
  }

  query += ' ORDER BY expiry_date ASC';
  
  const [rows] = await db.execute(query, params);
  return rows;
};

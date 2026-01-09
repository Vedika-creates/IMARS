import { db } from "../databaseClient.js";

export const addStockMovement = async ({
  item_id,
  warehouse_id,
  quantity,
  type,
  reference,
  reason,
  batch_id,
  from_location_id,
  to_location_id,
  performed_by
}) => {
  await db.execute(
    `INSERT INTO stock_movements (
      item_id, warehouse_id, quantity, movement_type,
      reference_type, reference_id, reason, batch_id,
      from_location_id, to_location_id, performed_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item_id,
      warehouse_id,
      quantity,
      type,
      reference?.type,
      reference?.id,
      reason,
      batch_id,
      from_location_id,
      to_location_id,
      performed_by
    ]
  );
};

export const getStockStatus = async (warehouse_id = null, item_id = null) => {
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
  return rows;
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

export const reserveStock = async (item_id, quantity, warehouse_id = null) => {
  const currentStock = await getCurrentStock(item_id, warehouse_id);
  
  if (currentStock.available_quantity < quantity) {
    throw new Error("Insufficient stock available");
  }

  // Find batches to reserve from (FIFO or other strategy)
  const [batchesRows] = await db.execute(
    `SELECT * FROM stock_batches
     WHERE item_id = ? AND status = 'active' AND available_quantity > 0
     ORDER BY created_at ASC`,
    [item_id]
  );
  const batches = batchesRows;

  let remainingQuantity = quantity;
  const reservations = [];

  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const reserveAmount = Math.min(remainingQuantity, batch.available_quantity);
    
    await db.execute(
      'UPDATE stock_batches SET reserved_quantity = ? WHERE id = ?',
      [batch.reserved_quantity + reserveAmount, batch.id]
    );

    reservations.push({
      batch_id: batch.id,
      reserved_quantity: reserveAmount
    });

    remainingQuantity -= reserveAmount;
  }

  return reservations;
};

export const releaseReservedStock = async (batch_id, quantity) => {
  const [batchRows] = await db.execute(
    'SELECT reserved_quantity FROM stock_batches WHERE id = ?',
    [batch_id]
  );
  const batch = batchRows[0];

  if (!batch) {
    throw new Error('Batch not found');
  }

  if (batch.reserved_quantity < quantity) {
    throw new Error("Cannot release more than reserved quantity");
  }

  await db.execute(
    'UPDATE stock_batches SET reserved_quantity = ? WHERE id = ?',
    [batch.reserved_quantity - quantity, batch_id]
  );
};

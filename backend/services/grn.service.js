import { db } from "../databaseClient.js";

export const createGRNService = async (grnData) => {
  const { po_id, supplier_id, warehouse_id, received_by, notes, items } = grnData;
  
  try {
    // Create GRN record
    const { data: grn, error: grnError } = await db
      .from('grn')
      .insert({
        po_id,
        supplier_id,
        warehouse_id,
        received_by,
        notes,
        status: 'draft'
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // Create GRN items
    if (items && items.length > 0) {
      const grnItems = items.map(item => ({
        ...item,
        grn_id: grn.id
      }));

      const { error: itemsError } = await db
        .from('grn_items')
        .insert(grnItems);

      if (itemsError) throw itemsError;
    }

    return grn;
  } catch (error) {
    throw new Error(`Failed to create GRN: ${error.message}`);
  }
};

export const updateGRNItemService = async (itemId, updateData) => {
  try {
    const { data, error } = await db
      .from('grn_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Failed to update GRN item: ${error.message}`);
  }
};

export const createBatchFromGRN = async (grnItem) => {
  try {
    const { item_id, batch_number, expiry_date, manufacturing_date, quantity_accepted } = grnItem;
    
    // Create batch record
    const { data: batch, error: batchError } = await db
      .from('batches')
      .insert({
        item_id,
        batch_number,
        expiry_date,
        manufacturing_date,
        quantity: quantity_accepted,
        available_quantity: quantity_accepted,
        status: 'active'
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Create stock movement for GRN receipt
    const { error: movementError } = await db
      .from('stock_movements')
      .insert({
        item_id,
        batch_id: batch.id,
        movement_type: 'in',
        quantity: quantity_accepted,
        reference_type: 'grn',
        reference_id: grnItem.grn_id,
        notes: `GRN receipt - Batch ${batch_number}`
      });

    if (movementError) throw movementError;

    return batch;
  } catch (error) {
    throw new Error(`Failed to create batch from GRN: ${error.message}`);
  }
};

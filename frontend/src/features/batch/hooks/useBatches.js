import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export const useBatches = (itemId) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBatches = async () => {
    if (!itemId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addBatch = async (batchData) => {
    try {
      const { data, error } = await supabase
        .from('inventory_batches')
        .insert([{
          ...batchData,
          item_id: itemId,
          available_quantity: batchData.quantity,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      await fetchBatches(); // Refresh the list
      return data[0];
    } catch (err) {
      console.error('Error adding batch:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [itemId]);

  return { batches, loading, error, refetch: fetchBatches, addBatch };
};

export const useBatchIssuance = () => {
  const issueStock = async (itemId, warehouseId, quantity) => {
    try {
      const { data, error } = await supabase.rpc('get_next_batch_for_issue', {
        p_item_id: itemId,
        p_warehouse_id: warehouseId,
        p_quantity: quantity
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No available batches found for this item');
      }

      const { batch_id, quantity_available } = data[0];
      const quantityToDeduct = Math.min(quantity, quantity_available);

      // Update batch
      const { error: updateError } = await supabase
        .from('inventory_batches')
        .update({ 
          available_quantity: quantity_available - quantityToDeduct,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch_id);

      if (updateError) throw updateError;

      // If we still need to issue more quantity, recursively call the function
      if (quantityToDeduct < quantity) {
        return issueStock(itemId, warehouseId, quantity - quantityToDeduct);
      }

      return { success: true, batchId: batch_id, quantityIssued: quantityToDeduct };
    } catch (error) {
      console.error('Error issuing stock:', error);
      throw error;
    }
  };

  return { issueStock };
};

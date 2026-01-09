import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from "../../../supabase.js";
import './grn.css';

const GRNForm = ({ onClose, onSuccess }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const selectedPOId = watch('po_id');

  useEffect(() => {
    fetchPurchaseOrders();
    fetchItems();
    fetchWarehouses();
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      console.log('🔍 Testing Supabase connection...');
      const { data, error } = await supabase
        .from('warehouses')
        .select('count')
        .single();

      if (error) {
        console.error('❌ Supabase connection failed:', error);
      } else {
        console.log('✅ Supabase connection successful:', data);
      }
    } catch (err) {
      console.error('❌ Supabase test error:', err);
    }
  };

  useEffect(() => {
    if (selectedPOId) {
      const po = purchaseOrders.find(p => p.id === selectedPOId);
      setSelectedPO(po);
      if (po) {
        setValue('supplier_id', po.supplier_id);
      }
    }
  }, [selectedPOId, purchaseOrders]);

  const fetchPurchaseOrders = async () => {
    try {
      console.log('Fetching purchase orders...');
      
      // Try simpler query first
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*');

      console.log('Purchase orders response:', { data, error });
      console.log('Total POs found:', data?.length || 0);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setPurchaseOrders(data || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, unit_of_measure')
        .eq('is_active', true)  // Only show active items
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      console.log('Fetching warehouses...');
      const { data, error } = await supabase
        .from('warehouses')
        .select('*');

      console.log('Warehouses response:', { data, error });
      if (error) throw error;
      setWarehouses(data || []);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Get the selected PO details
      const selectedPO = purchaseOrders.find(po => po.id === data.po_id);
      if (!selectedPO) {
        throw new Error('Please select a valid purchase order');
      }

      // Create a simple GRN record using inventory_batches table
      const batchData = {
        item_id: selectedPO.item_id,
        warehouse_id: data.warehouse_id,
        batch_number: data.batch_number || `GRN-${selectedPO.item_id?.slice(0, 8)}-${Date.now()}`, // Include item ID for uniqueness
        quantity: selectedPO.quantity || 1,
        available_quantity: selectedPO.quantity || 1,
        expiry_date: data.expiry_date || null, // Use user expiry date if provided
        received_at: new Date().toISOString()
      };

      console.log('Creating batch:', batchData);
      
      const { error: batchError } = await supabase
        .from('inventory_batches')
        .insert(batchData);

      if (batchError) {
        console.error('Batch creation error:', batchError);
        throw batchError;
      }

      // Update PO status to show it's been received
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'completed',
          approved_at: new Date().toISOString()
        })
        .eq('id', data.po_id);

      if (poError) {
        console.error('PO update error:', poError);
        // Don't throw error here, batch was created successfully
      }

      alert('GRN created successfully! Batch has been created in inventory.');
      
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      console.error('Error creating GRN:', err);
      alert('Error creating GRN: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantities = (itemId, field, value) => {
    const received = parseInt(field === 'quantity_received' ? value : watch(`quantity_received_${itemId}`) || 0);
    const accepted = parseInt(field === 'quantity_accepted' ? value : watch(`quantity_accepted_${itemId}`) || 0);
    const rejected = parseInt(field === 'quantity_rejected' ? value : watch(`quantity_rejected_${itemId}`) || 0);

    if (field === 'quantity_received') {
      setValue(`quantity_accepted_${itemId}`, Math.min(received, accepted + rejected));
      setValue(`quantity_rejected_${itemId}`, Math.max(0, received - accepted));
    } else if (field === 'quantity_accepted') {
      setValue(`quantity_rejected_${itemId}`, Math.max(0, received - accepted));
    }
  };

  return (
    <div className="grn-form-overlay">
      <div className="grn-form-container">
        <div className="grn-form-header">
          <h3>Create Goods Receipt Note</h3>
          <button type="button" onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grn-form">
          <div className="form-section">
            <h4>GRN Details</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Purchase Order *</label>
                <select
                  {...register('po_id', { required: 'Purchase Order is required' })}
                  className="form-input"
                >
                  <option value="">Select Purchase Order</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      PO-{po.id?.slice(0, 8)}... - {po.supplier?.name || 'No Supplier'}
                    </option>
                  ))}
                </select>
                {errors.po_id && <div className="error">{errors.po_id.message}</div>}
              </div>

              <div className="form-group">
                <label>Warehouse *</label>
                <select
                  {...register('warehouse_id', { required: 'Warehouse is required' })}
                  className="form-input"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.warehouse_id && <div className="error">{errors.warehouse_id.message}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Batch Number</label>
                <input
                  {...register('batch_number')}
                  type="text"
                  className="form-input"
                  placeholder="Optional - Auto-generated if empty"
                />
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  {...register('expiry_date')}
                  type="date"
                  className="form-input"
                  placeholder="Optional for items with expiry"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  {...register('notes')}
                  className="form-input"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GRNForm;

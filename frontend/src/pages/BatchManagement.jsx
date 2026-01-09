import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BatchList, ExpiryAlerts } from '../features/batch';
import '../features/batch/batch.css';

const BatchManagement = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('id, name, sku, issue_method')
          .eq('is_active', true)  // Only show active items
          .order('name');

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Error fetching items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) return <div className="loading">Loading items...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Batch & Expiry Management</h1>
        
        <div className="mb-6">
          <label htmlFor="item-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Item:
          </label>
          <select
            id="item-select"
            value={selectedItem?.id || ''}
            onChange={(e) => {
              const item = items.find(i => i.id === e.target.value);
              setSelectedItem(item);
            }}
            className="form-input"
            style={{ maxWidth: '300px' }}
          >
            <option value="">Choose an item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku}) - {item.issue_method}
              </option>
            ))}
          </select>
        </div>

        {selectedItem && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Batches for {selectedItem.name}
            </h2>
            <BatchList itemId={selectedItem.id} />
          </div>
        )}
      </div>

      <ExpiryAlerts />
    </div>
  );
};

export default BatchManagement;

// Items Management Component
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const ItemsManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    unit_of_measure: '',
    reorder_point: '',
    max_stock: '',
    requires_batch_tracking: false,
    has_expiry: false
  });

  const { getItems, createItem, updateItem, deleteItem, user, isAuthenticated } = useApi();

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    } else {
      setError('🔐 Please login to view items');
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    
    const result = await getItems();
    
    if (result.success) {
      setItems(result.data.data || []);
    } else {
      setError(`❌ Failed to fetch items: ${result.error}`);
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = editingItem 
      ? await updateItem(editingItem.id, formData)
      : await createItem(formData);

    if (result.success) {
      setMessage(editingItem ? '✅ Item updated successfully!' : '✅ Item created successfully!');
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: '',
        unit_of_measure: '',
        reorder_point: '',
        max_stock: '',
        requires_batch_tracking: false,
        has_expiry: false
      });
      await fetchItems();
    } else {
      setError(`❌ Failed to ${editingItem ? 'update' : 'create'} item: ${result.error}`);
    }
    
    setLoading(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      description: item.description,
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      reorder_point: item.reorder_point,
      max_stock: item.max_stock,
      requires_batch_tracking: item.requires_batch_tracking,
      has_expiry: item.has_expiry
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setLoading(true);
      
      const result = await deleteItem(id);
      
      if (result.success) {
        setMessage('✅ Item deleted successfully!');
        await fetchItems();
      } else {
        setError(`❌ Failed to delete item: ${result.error}`);
      }
      
      setLoading(false);
    }
  };

  const setMessage = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>🔐 Authentication Required</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📦 Items Management</h2>
        <button 
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ➕ Add New Item
        </button>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px' 
        }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '20px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>{editingItem ? '✏️ Edit Item' : '➕ Add New Item'}</h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Unit of Measure</label>
                <input
                  type="text"
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Reorder Point</label>
                <input
                  type="number"
                  name="reorder_point"
                  value={formData.reorder_point}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Max Stock</label>
                <input
                  type="number"
                  name="max_stock"
                  value={formData.max_stock}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    name="requires_batch_tracking"
                    checked={formData.requires_batch_tracking}
                    onChange={handleChange}
                    style={{ marginRight: '5px' }}
                  />
                  Requires Batch Tracking
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    name="has_expiry"
                    checked={formData.has_expiry}
                    onChange={handleChange}
                    style={{ marginRight: '5px' }}
                  />
                  Has Expiry Date
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  setFormData({
                    name: '',
                    sku: '',
                    description: '',
                    category: '',
                    unit_of_measure: '',
                    reorder_point: '',
                    max_stock: '',
                    requires_batch_tracking: false,
                    has_expiry: false
                  });
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '🔄 Saving...' : (editingItem ? '💾 Update' : '➕ Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showForm && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>🔄 Loading items...</div>
        </div>
      )}

      {!loading && !showForm && items.length > 0 && (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '4px', 
          overflow: 'hidden' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>SKU</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Reorder Point</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Max Stock</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{item.name}</td>
                  <td style={{ padding: '12px' }}>{item.sku}</td>
                  <td style={{ padding: '12px' }}>{item.category}</td>
                  <td style={{ padding: '12px' }}>{item.reorder_point}</td>
                  <td style={{ padding: '12px' }}>{item.max_stock}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{
                        marginRight: '5px',
                        padding: '4px 8px',
                        backgroundColor: '#ffc107',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !showForm && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>📦 No items found</h3>
          <p>Start by adding your first item using the button above.</p>
        </div>
      )}
    </div>
  );
};

export default ItemsManagement;

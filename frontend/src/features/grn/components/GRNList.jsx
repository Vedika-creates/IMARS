import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase.js';
import GRNForm from './GRNForm';
import './grn.css';

const GRNList = () => {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    warehouse_id: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchGRNs();
  }, [filters]);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      // Fetch batches that were created through GRN (batch_number starts with 'GRN-')
      const { data, error } = await supabase
        .from('inventory_batches')
        .select(`
          *,
          item:item_id(name, sku),
          warehouse:warehouse_id(name)
        `)
        .like('batch_number', 'GRN-%')
        .order('received_at', { ascending: false });

      console.log('GRN batches response:', { data, error });
      if (error) throw error;
      setGRNs(data || []);
    } catch (err) {
      console.error('Error fetching GRNs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (expiryDate) => {
    if (!expiryDate) return 'status-draft';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'status-rejected';
    if (diffDays <= 30) return 'status-confirmed';
    return 'status-draft';
  };

  const handleCreateGRN = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleGRNSuccess = () => {
    setShowForm(false);
    fetchGRNs(); // Refresh the GRN list
  };

  if (loading) return <div className="loading">Loading GRNs...</div>;

  return (
    <div className="grn-container">
      <div className="grn-header">
        <h2>Goods Receipt Notes</h2>
        <button className="btn btn-primary" onClick={handleCreateGRN}>
          Create GRN
        </button>
      </div>

      <div className="grn-filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          className="filter-input"
          placeholder="From Date"
        />

        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          className="filter-input"
          placeholder="To Date"
        />
      </div>

      <div className="grn-table-container">
        <table className="grn-table">
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Date</th>
              <th>Item</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Quantity</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grns.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  No GRNs found
                </td>
              </tr>
            ) : (
              grns.map((grn) => (
                <tr key={grn.id}>
                  <td className="grn-number">{grn.batch_number}</td>
                  <td>{new Date(grn.received_at).toLocaleDateString()}</td>
                  <td>
                    <div className="item-info">
                      <strong>{grn.item?.name || 'Unknown Item'}</strong>
                      <small>{grn.item?.sku || ''}</small>
                    </div>
                  </td>
                  <td>{grn.warehouse?.name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(grn.expiry_date)}`}>
                      {grn.expiry_date ? 'Has Expiry' : 'No Expiry'}
                    </span>
                  </td>
                  <td>{grn.quantity}</td>
                  <td>{grn.available_quantity}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-secondary">
                        View
                      </button>
                      <button className="btn btn-sm btn-primary">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showForm && (
        <GRNForm 
          onClose={handleCloseForm} 
          onSuccess={handleGRNSuccess}
        />
      )}
    </div>
  );
};

export default GRNList;

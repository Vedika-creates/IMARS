import React from 'react';
import { useBatches } from '../hooks/useBatches';
import AddBatchForm from './AddBatchForm';
import '../batch.css';

const BatchList = ({ itemId }) => {
  const { batches, loading, error, addBatch } = useBatches(itemId);

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'no-expiry', label: 'No Expiry' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', label: 'Expired' };
    if (diffDays <= 30) return { status: 'expiring-soon', label: `Expires in ${diffDays} days` };
    return { status: 'ok', label: 'OK' };
  };

  if (!itemId) return <div>No item selected</div>;
  if (loading) return <div className="loading">Loading batches...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="batch-list space-y-4">
      <div className="flex justify-between items-center">
        <AddBatchForm itemId={itemId} onAdd={addBatch} />
      </div>
      
      <div className="overflow-x-auto">
        <table className="batch-table">
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Expiry Date</th>
              <th>Quantity</th>
              <th>Available</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  No batches found
                </td>
              </tr>
            ) : (
              batches.map((batch) => {
                const { status, label } = getExpiryStatus(batch.expiry_date);
                return (
                  <tr key={batch.id} className={status === 'expired' ? 'expired' : status === 'expiring-soon' ? 'expiring-soon' : ''}>
                    <td>{batch.batch_number}</td>
                    <td>{batch.expiry_date || 'N/A'}</td>
                    <td>{batch.quantity}</td>
                    <td>{batch.available_quantity}</td>
                    <td>
                      <span className={`status-badge status-${status}`}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatchList;

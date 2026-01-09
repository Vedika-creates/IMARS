import React from 'react';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import '../batch.css';

const ExpiryAlerts = () => {
  const { alerts, loading, error } = useExpiryAlerts();

  const getAlertClass = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today ? 'expired' : 'expiring-soon';
  };

  if (loading) return <div className="loading">Loading expiry alerts...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="expiry-alerts">
      <h2>Expiry Alerts</h2>
      
      {alerts.length === 0 ? (
        <p className="empty-state">No expiring batches found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Expiry Date</th>
                <th>Available</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const alertClass = getAlertClass(alert.expiry_date);
                const expiryDate = new Date(alert.expiry_date);
                const today = new Date();
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <tr key={alert.id} className={alertClass}>
                    <td>{alert.items?.name}</td>
                    <td>{alert.items?.sku}</td>
                    <td>{alert.batch_number}</td>
                    <td>{alert.expiry_date}</td>
                    <td>{alert.available_quantity}</td>
                    <td>
                      <span className={`status-badge status-${alertClass}`}>
                        {alertClass === 'expired' 
                          ? `Expired ${Math.abs(diffDays)} days ago` 
                          : `Expires in ${diffDays} days`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpiryAlerts;

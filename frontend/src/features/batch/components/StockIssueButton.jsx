import { useBatchIssuance } from '../hooks/useBatches';
import '../batch.css';

const StockIssueButton = ({ itemId, warehouseId, quantity, onSuccess }) => {
  const { issueStock, loading, error } = useBatchIssuance();

  const handleIssue = async () => {
    try {
      const result = await issueStock(itemId, warehouseId, quantity);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      console.error('Failed to issue stock:', err);
    }
  };

  return (
    <div>
      <button
        onClick={handleIssue}
        disabled={loading}
        className={`btn ${loading ? 'btn-disabled' : 'btn-primary'}`}
      >
        {loading ? 'Issuing...' : 'Issue Stock'}
      </button>
      {error && <div className="form-error">{error.message}</div>}
    </div>
  );
};

export default StockIssueButton;

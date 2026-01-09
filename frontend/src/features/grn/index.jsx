import { useState } from 'react';
import GRNList from './components/GRNList';
import GRNForm from './components/GRNForm';
import './components/grn.css';

const GRNManagement = () => {
  const [showForm, setShowForm] = useState(false);

  const handleCreateGRN = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleGRNSuccess = () => {
    setShowForm(false);
    // Refresh the GRN list
    window.location.reload();
  };

  return (
    <div>
      <GRNList onCreateGRN={handleCreateGRN} />
      {showForm && (
        <GRNForm 
          onClose={handleCloseForm} 
          onSuccess={handleGRNSuccess}
        />
      )}
    </div>
  );
};

export default GRNManagement;

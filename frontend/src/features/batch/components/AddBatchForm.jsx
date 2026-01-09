import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import '../batch.css';

const AddBatchForm = ({ itemId, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      await onAdd({
        ...data,
        quantity: parseInt(data.quantity, 10),
        expiry_date: data.expiry_date || null
      });
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding batch:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="add-batch-btn"
      >
        Add Batch
      </button>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Add New Batch</h3>
          <button
            type="button"
            onClick={() => {
              reset();
              setIsOpen(false);
            }}
            className="close-btn"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="batch_number" className="form-label">
              Batch Number *
            </label>
            <input
              type="text"
              id="batch_number"
              {...register('batch_number', { required: 'Batch number is required' })}
              className="form-input"
            />
            {errors.batch_number && (
              <div className="form-error">{errors.batch_number.message}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expiry_date" className="form-label">
              Expiry Date
            </label>
            <input
              type="date"
              id="expiry_date"
              {...register('expiry_date')}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity" className="form-label">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              {...register('quantity', { 
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' }
              })}
              className="form-input"
            />
            {errors.quantity && (
              <div className="form-error">{errors.quantity.message}</div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => {
                reset();
                setIsOpen(false);
              }}
              className="btn btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBatchForm;

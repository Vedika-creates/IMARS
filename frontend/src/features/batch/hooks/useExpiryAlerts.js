import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export const useExpiryAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpiryAlerts = async () => {
    try {
      setLoading(true);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('inventory_batches')
        .select(`
          id,
          batch_number,
          expiry_date,
          available_quantity,
          items!inner(
            name,
            sku
          )
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('available_quantity', 0)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryAlerts();
  }, []);

  return { alerts, loading, error, refetch: fetchExpiryAlerts };
};

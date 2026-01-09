import { supabase } from '../supabase';

// Simple test to check items and their stock levels
export const testItemsStock = async () => {
  try {
    console.log('🔍 Testing items stock levels...');
    
    // Get all items with stock info
    const { data: items, error } = await supabase
      .from('items')
      .select('id, name, current_stock, reorder_point')
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching items:', error);
      return { success: false, error };
    }
    
    console.log('🔍 All items:', items);
    
    // Find items that are below reorder point
    const lowStockItems = items.filter(item => 
      item.current_stock <= item.reorder_point && 
      item.reorder_point > 0
    );
    
    console.log('🔍 Low stock items:', lowStockItems);
    console.log(`🔍 Total items: ${items.length}, Low stock: ${lowStockItems.length}`);
    
    // Show details for each item
    items.forEach(item => {
      console.log(`📦 Item: ${item.name}`);
      console.log(`   Current Stock: ${item.current_stock}`);
      console.log(`   Reorder Point: ${item.reorder_point}`);
      console.log(`   Status: ${item.current_stock <= item.reorder_point ? '⚠️ LOW STOCK' : '✅ OK'}`);
      console.log('---');
    });
    
    return {
      success: true,
      totalItems: items.length,
      lowStockItems: lowStockItems.length,
      items
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error };
  }
};

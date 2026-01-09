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

/**
 * Generate suggested purchase orders based on low stock items
 * This should be called when:
 * - Stock changes (real-time trigger)
 * - Daily cron job
 * - Manual "Check Reorder" button click
 */
export const generateSuggestedPOs = async () => {
  try {
    console.log('🔍 Generating suggested POs...');
    
    // First, test the items stock levels
    const stockTest = await testItemsStock();
    
    if (!stockTest.success) {
      return { success: false, error: stockTest.error };
    }
    
    if (stockTest.lowStockItems === 0) {
      console.log('✅ No items need reordering');
      return { success: true, message: 'No items need reordering', createdPOs: 0 };
    }
    
    console.log(`🔍 Found ${stockTest.lowStockItems} items needing reordering`);
    
    // Use the low stock items from our test
    const lowStockItems = stockTest.items.filter(item => 
      item.current_stock <= item.reorder_point && 
      item.reorder_point > 0
    );

    let createdPOs = 0;
    let errors = 0;

    // Create suggested PO for each low stock item
    for (const item of lowStockItems) {
      try {
        // Check if a suggested PO already exists for this item
        const { data: existingPO, error } = await supabase
          .from('purchase_orders')
          .select('id')
          .eq('item_id', item.id)
          .eq('source', 'suggested')
          .eq('status', 'draft')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error checking existing PO:', error);
          errors++;
          continue;
        }

        if (existingPO) {
          console.log(`⚠️ Suggested PO already exists for item: ${item.name}`);
          continue; // Skip if suggested PO already exists
        }

        // Calculate suggested quantity (reorder_point - current_stock)
        // Ensure minimum quantity of 1 to avoid zero/negative values
        const suggestedQuantity = Math.max(1, item.reorder_point - item.current_stock);

        console.log(`🔍 Creating suggested PO for item: ${item.name}, quantity: ${suggestedQuantity}`);

        // Create suggested PO without supplier initially
        const { error: insertError } = await supabase
          .from('purchase_orders')
          .insert({
            item_id: item.id,
            quantity: suggestedQuantity,
            status: 'draft',
            source: 'suggested', // ⭐ KEY: This makes it a suggested PO
            created_by: null, // System-generated
            notes: `Auto-generated suggested PO for ${item.name}. Current stock: ${item.current_stock}, Reorder point: ${item.reorder_point}, Suggested quantity: ${suggestedQuantity}`,
            auto_generated: true
          });

        if (insertError) {
          console.error('❌ Suggested PO error for item', item.id, insertError);
          console.error('❌ Full error details:', {
            item_id: item.id,
            item_name: item.name,
            quantity: suggestedQuantity,
            error: insertError
          });
          errors++;
        } else {
          console.log(`✅ Created suggested PO for ${item.name} - Quantity: ${suggestedQuantity}`);
          createdPOs++;
        }
      } catch (error) {
        console.error(`❌ Error processing item ${item.name}:`, error);
        errors++;
      }
    }

    console.log(`🎉 Suggested PO generation complete. Created: ${createdPOs}, Errors: ${errors}`);

    return {
      success: true,
      createdPOs,
      errors,
      message: `Created ${createdPOs} suggested purchase orders${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    };

  } catch (error) {
    console.error('❌ Unexpected error in generateSuggestedPOs:', error);
    return { success: false, error };
  }
};

/**
 * Convert a suggested PO to a manual PO (user approval)
 * This moves the PO from "Suggested" to "Manual" section
 */
export const convertSuggestedToManual = async (poId, userId) => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        source: 'manual',
        created_by: userId,
        notes: 'Converted from suggested PO by user',
        auto_generated: false
      })
      .eq('id', poId)
      .eq('source', 'suggested'); // Only convert suggested POs

    if (error) {
      console.error('❌ Error converting suggested PO to manual:', error);
      return { success: false, error };
    }

    console.log(`✅ Successfully converted suggested PO ${poId} to manual`);
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected error converting PO:', error);
    return { success: false, error };
  }
};

/**
 * Get suggested POs that need attention
 */
export const getSuggestedPOsSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items(name, sku, current_stock, reorder_point),
        suppliers(name)
      `)
      .eq('source', 'suggested')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching suggested POs:', error);
      return { success: false, error };
    }

    return { success: true, data };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error };
  }
};

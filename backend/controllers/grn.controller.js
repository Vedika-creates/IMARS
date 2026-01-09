import { db } from "../databaseClient.js";

export const createGRN = async (req, res) => {
  try {
    const { po_id, supplier_id, warehouse_id, notes, items } = req.body;
    
    // Get authenticated user ID
    const received_by = req.user?.id || null;

    // Start transaction
    const { data: grn, error: grnError } = await db.rpc('create_grn_with_items', {
      p_po_id: po_id,
      p_supplier_id: supplier_id,
      p_warehouse_id: warehouse_id,
      p_received_by: received_by,
      p_notes: notes,
      p_items: items
    });

    if (grnError) throw grnError;

    res.status(201).json({ 
      message: "GRN created successfully", 
      data: grn 
    });
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGRNs = async (req, res) => {
  try {
    const { 
      warehouse_id, 
      supplier_id, 
      status, 
      date_from, 
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    let query = db
      .from('grn')
      .select(`
        *,
        supplier:supplier_id(name, contact_person, email),
        warehouse:warehouse_id(name, location),
        received_by_user:received_by(first_name, last_name),
        grn_items(
          *,
          item:item_id(name, sku, unit),
          batch:batch_id(batch_number, expiry_date)
        )
      `);

    // Apply filters
    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (status) query = query.eq('status', status);
    if (date_from) query = query.gte('grn_date', date_from);
    if (date_to) query = query.lte('grn_date', date_to);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('grn_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGRNById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await db
      .from('grn')
      .select(`
        *,
        supplier:supplier_id(name, contact_person, email, phone),
        warehouse:warehouse_id(name, location),
        received_by_user:received_by(first_name, last_name, email),
        grn_items(
          *,
          item:item_id(name, sku, unit, description),
          batch:batch_id(batch_number, expiry_date, manufacturing_date),
          po_item:po_item_id(quantity, unit_price),
          quality_checks:grn_quality_checks(
            *,
            checked_by:first_name,
            checked_by:last_name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "GRN not found" });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const { data, error } = await db
      .from('grn')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "GRN not found" });
    }

    res.json({ 
      message: "GRN updated successfully", 
      data 
    });
  } catch (error) {
    console.error('Error updating GRN:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGRNItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      quantity_received, 
      quantity_accepted, 
      quantity_rejected,
      rejection_reason,
      batch_number,
      expiry_date,
      manufacturing_date,
      lot_number,
      notes
    } = req.body;

    const { data, error } = await db
      .from('grn_items')
      .update({
        quantity_received,
        quantity_accepted,
        quantity_rejected,
        rejection_reason,
        batch_number,
        expiry_date,
        manufacturing_date,
        lot_number,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "GRN item not found" });
    }

    res.json({ 
      message: "GRN item updated successfully", 
      data 
    });
  } catch (error) {
    console.error('Error updating GRN item:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createQualityCheck = async (req, res) => {
  try {
    const { grn_item_id, quality_status, check_parameters, check_results, defects_found, action_taken, notes } = req.body;
    
    // Get authenticated user ID
    const checked_by = req.user?.id || null;

    const { data, error } = await db
      .from('grn_quality_checks')
      .insert({
        grn_item_id,
        checked_by,
        quality_status,
        check_parameters,
        check_results,
        defects_found,
        action_taken,
        notes
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: "Quality check created successfully", 
      data 
    });
  } catch (error) {
    console.error('Error creating quality check:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGRNDashboard = async (req, res) => {
  try {
    const { warehouse_id } = req.query;

    // Get GRN statistics
    const { data: stats, error: statsError } = await db.rpc('get_grn_dashboard_stats', {
      p_warehouse_id: warehouse_id
    });

    if (statsError) throw statsError;

    // Get recent GRNs
    const { data: recentGRNs, error: grnError } = await db
      .from('grn')
      .select(`
        id,
        grn_number,
        grn_date,
        status,
        total_items,
        total_quantity_received,
        supplier:supplier_id(name),
        warehouse:warehouse_id(name)
      `)
      .eq('warehouse_id', warehouse_id)
      .order('grn_date', { ascending: false })
      .limit(10);

    if (grnError) throw grnError;

    res.json({
      stats,
      recentGRNs
    });
  } catch (error) {
    console.error('Error fetching GRN dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPOItemsForGRN = async (req, res) => {
  try {
    const { po_id } = req.params;

    const { data, error } = await db
      .from('po_items')
      .select(`
        *,
        item:item_id(name, sku, unit, description),
        purchase_order:po_id(po_number, status)
      `)
      .eq('po_id', po_id)
      .eq('purchase_order.status', 'confirmed');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching PO items for GRN:', error);
    res.status(500).json({ error: error.message });
  }
};

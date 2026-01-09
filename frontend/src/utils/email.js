import emailjs from "@emailjs/browser";

// Email template IDs
const EMAILJS_SERVICE_ID = "service_tclx5er";
const EMAILJS_ALERT_TEMPLATE = "template_3ankkeg";
const EMAILJS_GRN_TEMPLATE = "template_grn_notification";  // You'll need to create this template in EmailJS

// Send GRN notification email
export const sendGRNEmail = async (grn, items, status) => {
  try {
    console.log('📧 Sending GRN notification email...');
    
    const templateParams = {
      to_email: grn.received_by_email || 'inventory@example.com',
      subject: `GRN ${grn.grn_number} - ${status}`,
      grn_number: grn.grn_number,
      grn_date: new Date(grn.grn_date).toLocaleDateString(),
      status: status,
      supplier_name: grn.supplier_name,
      received_by: grn.received_by_name || 'Staff',
      notes: grn.notes || 'No additional notes',
      inspection_date: grn.inspection_date || 'Not specified',
      inspector_name: grn.inspector_name || 'Not specified',
      overall_quality: grn.overall_quality || 'Not specified',
      items: items.map(item => ({
        name: item.item_name,
        sku: item.sku,
        ordered: item.ordered_quantity,
        accepted: item.accepted_quantity,
        rejected: item.rejected_quantity || 0,
        batch: item.batch_number || 'N/A',
        expiry: item.expiry_date || 'N/A',
        unit_price: item.unit_price,
        total: (item.accepted_quantity * item.unit_price).toFixed(2),
        quality_status: item.quality_status || 'N/A',
        rejection_reason: item.rejection_reason || 'N/A'
      })),
      total_items: items.length,
      total_accepted: items.reduce((sum, item) => sum + (item.accepted_quantity || 0), 0),
      total_rejected: items.reduce((sum, item) => sum + (item.rejected_quantity || 0), 0),
      total_value: items.reduce((sum, item) => sum + (item.accepted_quantity * item.unit_price || 0), 0).toFixed(2)
    };

    console.log('📧 GRN Email Params:', templateParams);
    
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_GRN_TEMPLATE,
      templateParams
    );

    console.log('✅ GRN Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ GRN Email Error:', error);
    throw error;
  }
};

export const sendAlertEmail = async ({
  toEmail,
  subject,
  message,
  item
}) => {
  try {
    console.log('📧 EmailJS Debug - Starting email send...');
    console.log('📧 EmailJS Debug - Item data:', item);
    
    // Validate item data
    if (!item || !item.name) {
      throw new Error('Item data is missing or invalid');
    }

    const templateParams = {
      email: toEmail,                    // Changed from to_email to email
      subject: subject,
      message: message,
      item_name: item.name,
      current_stock: item.current_stock || 0,
      reorder_point: item.reorder_point || 0,
      // Add any additional variables your template needs
      user_email: toEmail,
      item_sku: item.sku || 'N/A',
      alert_type: 'stock_alert'
    };

    console.log('📧 EmailJS Debug - Template params:', templateParams);
    console.log('📧 EmailJS Debug - Service ID: service_tclx5er');
    console.log('📧 EmailJS Debug - Template ID: UyOyPZkS_FYE4mkit');
    
    // Add more debugging for EmailJS setup
    console.log('📧 EmailJS Debug - Public Key:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    console.log('service_tclx5er');
    console.log('template_3ankkeg"');

    const response = await emailjs.send(
      "service_tclx5er",                    // SERVICE ID (correct)
      "template_3ankkeg",                   // TEMPLATE ID (replace with actual template ID)
      templateParams
    );

    console.log('✅ EmailJS Success - Response:', response);
    return response;
  } catch (error) {
    console.error('❌ EmailJS Error - Full Details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      text: error.text,
      stack: error.stack
    });
    
    // More user-friendly error messages
    if (error.message.includes('public key')) {
      throw new Error('EmailJS public key is invalid. Check your EmailJS dashboard.');
    } else if (error.message.includes('service')) {
      throw new Error('EmailJS service ID not found. Check your service ID.');
    } else if (error.message.includes('template')) {
      throw new Error('EmailJS template ID not found. Check your template ID.');
    } else {
      throw error;
    }
  }
};

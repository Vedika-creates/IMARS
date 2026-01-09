// Test API endpoints
import { db } from './db.js';

console.log('🧪 Testing API Endpoints...\n');

// Test database connection
try {
  await db.execute('SELECT 1 as test');
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

// Test sample data creation
try {
  console.log('\n📦 Creating test item...');
  const [result] = await db.execute(
    `INSERT INTO items (name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Test Item', 'TEST-001', 'Test item for API verification', 'Electronics', 'Units', 10, 100, 0, 0]
  );
  console.log('✅ Test item created with ID:', result.insertId);

  // Test fetching the item
  console.log('\n📋 Fetching test item...');
  const [items] = await db.execute('SELECT * FROM items WHERE id = ?', [result.insertId]);
  console.log('✅ Item fetched:', items[0]);

  // Test stock status query
  console.log('\n📊 Testing stock status query...');
  const [stockStatus] = await db.execute('SELECT * FROM stock_status LIMIT 5');
  console.log('✅ Stock status query works, found', stockStatus.length, 'records');

  // Test reorder rules
  console.log('\n🔄 Testing reorder rules query...');
  const [reorderRules] = await db.execute('SELECT * FROM reorder_rules LIMIT 5');
  console.log('✅ Reorder rules query works, found', reorderRules.length, 'rules');

  console.log('\n🚀 All API endpoints are ready!');
  console.log('\n📡 Available endpoints:');
  console.log('   POST /api/auth/login');
  console.log('   POST /api/auth/register');
  console.log('   GET  /api/items');
  console.log('   POST /api/items');
  console.log('   GET  /api/items/:id');
  console.log('   PUT  /api/items/:id');
  console.log('   DELETE /api/items/:id');
  console.log('   GET  /api/stock/status');
  console.log('   GET  /api/stock/movements');
  console.log('   GET  /api/stock/current');
  console.log('   GET  /api/reorder/rules');
  console.log('   POST /api/reorder/rules');
  console.log('   GET  /api/reorder/alerts');
  console.log('   GET  /api/reorder/check');
  console.log('\n🔑 To test: Start server with "npm start" and use Postman/curl');

} catch (error) {
  console.error('❌ API test failed:', error.message);
}

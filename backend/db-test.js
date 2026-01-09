// Database connection test
import { db } from './db.js';

console.log('🔍 Testing database connection...');
console.log('📋 Configuration:');
console.log('   Host:', process.env.DB_HOST);
console.log('   User:', process.env.DB_USER);
console.log('   Database:', process.env.DB_NAME);
console.log('   Port:', process.env.DB_PORT);

try {
  const [rows] = await db.execute('SELECT 1 as test');
  console.log('\n✅ Database connected successfully!');
  console.log('✅ Test query result:', rows[0]);
  console.log('🚀 Database is ready for use');
} catch (error) {
  console.error('\n❌ Database connection failed:');
  console.error('Error Code:', error.code);
  console.error('Error Message:', error.message);
  console.error('SQL State:', error.sqlState);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check if MySQL is on port 3306');
    console.log('3. Verify your database credentials in .env file');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your MySQL username/password');
    console.log('2. Make sure the user has access to the database');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure the database "ims" exists');
    console.log('2. Create database: CREATE DATABASE ims;');
  }
}

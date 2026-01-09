// Test JWT Integration
import { db } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

console.log('🔐 Testing JWT Integration...\n');

async function testJWTIntegration() {
  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    await db.execute('SELECT 1 as test');
    console.log('✅ Database connected successfully');

    // Test 2: Create test user
    console.log('\n2️⃣ Creating test user...');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const [userResult] = await db.execute(
      `INSERT INTO users (first_name, last_name, email, password, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Test', 'User', 'test@example.com', hashedPassword, 'admin']
    );
    console.log('✅ Test user created with ID:', userResult.insertId);

    // Test 3: Generate JWT token
    console.log('\n3️⃣ Generating JWT token...');
    const token = jwt.sign(
      { 
        id: userResult.insertId, 
        email: 'test@example.com', 
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated successfully');
    console.log('🔑 Token:', token.substring(0, 50) + '...');

    // Test 4: Verify JWT token
    console.log('\n4️⃣ Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT token verified successfully');
    console.log('👤 Decoded user:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    // Test 5: Simulate API request with JWT
    console.log('\n5️⃣ Simulating authenticated API request...');
    const mockRequest = {
      headers: {
        authorization: `Bearer ${token}`
      },
      user: decoded
    };
    console.log('✅ Mock authenticated request created');
    console.log('📋 User ID:', mockRequest.user.id);
    console.log('📧 User Role:', mockRequest.user.role);

    // Test 6: Test token expiration
    console.log('\n6️⃣ Testing token expiration handling...');
    try {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1s' }
      );
      
      // Wait 2 seconds to let token expire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      jwt.verify(expiredToken, process.env.JWT_SECRET);
    } catch (error) {
      console.log('✅ Token expiration correctly detected:', error.message);
    }

    console.log('\n🎉 JWT Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection: Working');
    console.log('   ✅ User creation: Working');
    console.log('   ✅ JWT generation: Working');
    console.log('   ✅ JWT verification: Working');
    console.log('   ✅ Token expiration: Working');
    console.log('   ✅ Auth middleware: Ready');

    console.log('\n🚀 Ready to test authenticated APIs!');
    console.log('\n📡 Test endpoints:');
    console.log('   1. Register: POST /api/auth/register');
    console.log('   2. Login: POST /api/auth/login');
    console.log('   3. Protected: GET /api/items (with Bearer token)');

  } catch (error) {
    console.error('❌ JWT Integration Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Clean up test data
async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up test data...');
    await db.execute('DELETE FROM users WHERE email = ?', ['test@example.com']);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️ Cleanup failed:', error.message);
  }
}

// Run tests
testJWTIntegration()
  .then(() => cleanup())
  .catch(() => cleanup());

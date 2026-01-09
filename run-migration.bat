// Simple Frontend Migration Script
console.log('🔄 Starting Frontend Migration...\n');

const { execSync } = require('child_process');

try {
  console.log('📝 Running migration script...');
  const result = execSync('node migrate-frontend.js', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('✅ Migration completed!');
  console.log('📋 Output:', result.stdout);
  
  if (result.stderr) {
    console.log('⚠️ Warnings:', result.stderr);
  }
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
}

console.log('\n🎉 Frontend is now ready for JWT authentication!');
console.log('\n📝 Next Steps:');
console.log('1. Update App.jsx to use App-new.jsx');
console.log('2. Start development: npm run dev');
console.log('3. Test authentication flow');

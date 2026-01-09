// PowerShell Migration Script
Write-Host "Starting Frontend Migration..."

$scriptPath = Join-Path -Path $PSScriptRoot "migrate-frontend.js"

try {
    Write-Host "📝 Running migration script..."
    $result = & node $scriptPath 2>&1
    
    Write-Host "✅ Migration completed!"
    Write-Host "📋 Output:"
    Write-Host $result
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Migration had errors (exit code: $LASTEXITCODE)"
    }
} catch {
    Write-Host "❌ Migration failed: $_"
}

Write-Host ""
Write-Host "🎉 Frontend is now ready for JWT authentication!"
Write-Host ""
Write-Host "📝 Next Steps:"
Write-Host "1. Update App.jsx to use App-new.jsx"
Write-Host "2. Start development: npm run dev"
Write-Host "3. Test authentication flow"

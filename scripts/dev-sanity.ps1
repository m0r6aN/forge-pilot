# Dev sanity check script
# Deletes zombie files and runs basic checks

# Delete nul if present
if (Test-Path "nul") {
    Remove-Item "nul" -Force
    Write-Host "Deleted nul file"
}

# Run quick format/lint/test (placeholder - adjust as needed)
# Example: npm run lint
# npm run test

Write-Host "Dev sanity check complete"

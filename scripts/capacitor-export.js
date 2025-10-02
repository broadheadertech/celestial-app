const fs = require('fs');
const path = require('path');

/**
 * Post-build script for Capacitor compatibility
 * Simple static export - no special handling needed for query param routes
 */

const outDir = path.join(__dirname, '../out');

console.log('🔧 Preparing static export for Capacitor...\n');

// All routes now use query parameters, so no special handling needed
console.log('✅ Using query parameter routes - no dynamic route handling required\n');

console.log('✨ Capacitor export preparation complete!\n');

const fs = require('fs');
const path = require('path');

/**
 * Post-build script for Capacitor compatibility
 * Copies Pushy SDK and prepares static export
 */

const outDir = path.join(__dirname, '../out');
const pushySourceDir = path.join(__dirname, '../node_modules/pushy-cordova/www');
const pushyDestDir = path.join(outDir, 'pushy-cordova/www');

console.log('🔧 Preparing static export for Capacitor...\n');

// All routes now use query parameters, so no special handling needed
console.log('✅ Using query parameter routes - no dynamic route handling required\n');

// Copy Pushy SDK files to output directory
console.log('📦 Copying Pushy SDK files...');
if (fs.existsSync(pushySourceDir)) {
  fs.mkdirSync(pushyDestDir, { recursive: true });
  fs.copyFileSync(
    path.join(pushySourceDir, 'Pushy.js'),
    path.join(pushyDestDir, 'Pushy.js')
  );
  console.log('✅ Pushy SDK files copied\n');
} else {
  console.log('⚠️  Pushy SDK source not found - skipping copy\n');
}

console.log('✨ Capacitor export preparation complete!\n');

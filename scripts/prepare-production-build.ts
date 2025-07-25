import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGE_JSON_PATH = resolve('./package.json');

function removeTypeModule() {
  try {
    console.log('🔧 Preparing package.json for production build...');

    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    if (packageJson.type === 'module') {
      delete packageJson.type;
      console.log('✅ Removed "type": "module" for production build');
    } else {
      console.log('ℹ️  No "type": "module" field found, skipping modification');
    }

    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.error('❌ Failed to prepare production build:', error);
    process.exit(1);
  }
}

removeTypeModule();

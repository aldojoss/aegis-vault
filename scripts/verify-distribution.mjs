import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Scan executable application assets, not docs or test fixtures.
const demoMarker = /(?:\baldo\b|\baldo[.@-]|SAMPLE_VAULT_ITEMS|sampleVault|P@ssw0rd!Secure99_Alpha|G!tHub_K3y#9821_VaultX)/i;
const failures = [];
function check(name, content) {
  // The explicitly requested creator credit is allowed; legacy credential
  // records and personal demo addresses remain forbidden.
  if (demoMarker.test(content.replaceAll('Creado por Aldo Aviles', 'Crédito del creador'))) failures.push(name);
}
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(name);
    else if (/\.(js|cjs|json|html)$/.test(name)) check(name, fs.readFileSync(name, 'utf8'));
  }
}
if (process.argv[2]) {
  const require = createRequire(import.meta.url);
  const asar = require('@electron/asar');
  const archive = process.argv[2];
  for (const entry of asar.listPackage(archive)) {
    const name = entry.replace(/^[/\\]/, '').replaceAll('\\', '/');
    if (/\.(enc|aegis|bak|pem|pfx|key)$|(?:^|\/)sampleVault\.|(?:^|\/)\.env(?:\.|$)/i.test(name)) failures.push(name);
    if (/^(?:dist|electron)\/.*\.(js|cjs|json|html)$/.test(name)) check(name, asar.extractFile(archive, entry.replace(/^[/\\]/, '')).toString());
  }
} else {
  visit('dist');
  visit('electron');
}
if (failures.length) throw new Error('Distribution contains demo or private data: ' + failures.join(', '));
console.log('Distribution verified: no original demo records, personal demo names or vault files.');

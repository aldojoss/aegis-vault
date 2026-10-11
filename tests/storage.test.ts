import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { readVault, saveVault } = require('../electron/vault-storage.cjs');
const temporaryFolders: string[] = [];
const newPath = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-test-'));
  temporaryFolders.push(directory);
  return path.join(directory, 'nested', 'vault.enc');
};
const payload = (cipherText: string) => JSON.stringify({ version: 2, salt: 'test-salt', iv: 'test-iv', cipherText });
afterEach(() => { vi.restoreAllMocks(); for (const folder of temporaryFolders.splice(0)) fs.rmSync(folder, { recursive: true, force: true }); });
describe('durable storage', () => {
  it('creates its directory and reloads the saved file', () => {
    const file = newPath();
    expect(readVault(file)).toBeNull();
    saveVault(file, payload('first'));
    expect(readVault(file)).toBe(payload('first'));
  });
  it('keeps the previous ciphertext as a backup', () => {
    const file = newPath();
    saveVault(file, payload('first'));
    saveVault(file, payload('second'));
    expect(readVault(file)).toBe(payload('second'));
    expect(readVault(file + '.bak')).toBe(payload('first'));
  });
  it('preserves the original on a failed replace and cleans temporary files', () => {
    const file = newPath();
    saveVault(file, payload('first'));
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('disk write failed'); });
    expect(() => saveVault(file, payload('second'))).toThrow('disk write failed');
    expect(readVault(file)).toBe(payload('first'));
    expect(fs.readdirSync(path.dirname(file)).some(name => name.endsWith('.tmp'))).toBe(false);
  });
  it('does not interpret corrupt or empty vaults as first-time setup', () => {
    const file = newPath();
    saveVault(file, payload('first'));
    fs.writeFileSync(file, '');
    expect(() => readVault(file)).toThrow();
    fs.writeFileSync(file, '{broken');
    expect(() => readVault(file)).toThrow();
    expect(() => saveVault(file, '')).toThrow();
  });
});

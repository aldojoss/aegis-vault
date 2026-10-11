import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { encryptVault } from '../src/utils/crypto';
import { readImportedVault, validateImportedVault, mergeImportedItems } from '../src/utils/import-vault';
import type { VaultData } from '../src/types/vault';
const data: VaultData = { version: 1, createdAt: 1, updatedAt: 1, items: [{ id: 'test', title: 'Synthetic record', category: 'login', password: 'synthetic secret', createdAt: 1, updatedAt: 1 }], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark', showPasswordStrength: true } };
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());
it('imports a desktop encrypted backup using the password of that backup', async () => {
  const payload = await encryptVault(data, 'different backup password');
  expect(await readImportedVault(JSON.stringify(payload), 'different backup password')).toEqual(data);
  await expect(readImportedVault(JSON.stringify(payload), 'wrong password')).rejects.toThrow();
});
it('rejects malformed or duplicated records before applying any import', () => {
  expect(() => validateImportedVault({ items: [data.items[0], data.items[0]] })).toThrow();
  expect(() => validateImportedVault({ items: [{ ...data.items[0], password: { invalid: true } }] })).toThrow();
  expect(() => validateImportedVault({ items: [{ ...data.items[0], customFields: [null] }] })).toThrow();
});
it('keeps current records and appends only new IDs', () => {
  const current = { ...data.items[0], password: 'newer local value' };
  const incoming = { ...data.items[0], id: 'other' };
  expect(mergeImportedItems([current], [data.items[0], incoming])).toEqual([current, incoming]);
});

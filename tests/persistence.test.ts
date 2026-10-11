import { it, expect } from 'vitest';
import { createVaultWriter } from '../src/utils/persistence';
import { decryptVault } from '../src/utils/crypto';
import type { VaultData } from '../src/types/vault';
const data: VaultData = { version: 1, createdAt: 1, updatedAt: 1, items: [], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark', showPasswordStrength: true } };

it('serializes saves and waits for disk before completing or closing', async () => {
  const written: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const writer = createVaultWriter(async content => { if (!written.length) await gate; written.push(content); });
  const first = writer.save(data, 'old password');
  const second = writer.save({ ...data, updatedAt: 2 }, 'new password');
  let flushed = false;
  const flush = writer.flush().then(() => { flushed = true; });
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(flushed).toBe(false);
  release();
  await Promise.all([first, second, flush]);
  expect(written).toHaveLength(2);
  expect((await decryptVault(JSON.parse(written[1]), 'new password')).updatedAt).toBe(2);
});

it('propagates disk errors and permits a later retry', async () => {
  let fail = true;
  const writer = createVaultWriter(async () => { if (fail) throw new Error('disk full'); });
  await expect(writer.save(data, 'password')).rejects.toThrow('disk full');
  await expect(writer.flush()).rejects.toThrow('disk full');
  fail = false;
  await expect(writer.save(data, 'password')).resolves.toHaveProperty('version', 2);
});

import { describe, it, expect } from 'vitest';
import { encryptVault, decryptVault, verifyMasterPassword, bufferToBase64 } from '../src/utils/crypto';
import { VaultData } from '../src/types/vault';

export const fixture: VaultData = { version: 1, createdAt: 1, updatedAt: 1, items: [{ id: 'test', title: 'Test record', category: 'login', password: 'synthetic-only', createdAt: 1, updatedAt: 1 }], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark', showPasswordStrength: true } };

describe('encrypted vault compatibility', () => {
  it('writes v2 without a cheap verifier and recovers records', async () => {
    const payload = await encryptVault(fixture, 'test master password');
    expect(payload.version).toBe(2);
    expect(payload.iterations).toBe(600_000);
    expect(payload).not.toHaveProperty('testHash');
    expect(JSON.stringify(payload)).not.toContain('synthetic-only');
    expect(await decryptVault(payload, 'test master password')).toEqual(fixture);
  });
  it('rejects wrong passwords and tampered ciphertext', async () => {
    const payload = await encryptVault(fixture, 'correct password');
    expect(await verifyMasterPassword(payload, 'wrong password')).toBe(false);
    const corrupted = { ...payload, cipherText: (payload.cipherText[0] === 'A' ? 'B' : 'A') + payload.cipherText.slice(1) };
    await expect(decryptVault(corrupted, 'correct password')).rejects.toThrow();
  });
  it('reads the original v1 format using the original 310,000 rounds', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode('legacy password'), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310_000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(fixture)));
    const payload = { version: 1, salt: bufferToBase64(salt), iv: bufferToBase64(iv), cipherText: bufferToBase64(cipher), testHash: 'ignored-legacy-verifier' };
    expect(await decryptVault(payload, 'legacy password')).toEqual(fixture);
    expect(await verifyMasterPassword(payload, 'legacy password')).toBe(true);
  });
  it('rejects unsupported iteration counts and malformed envelopes', async () => {
    const payload = await encryptVault(fixture, 'test password');
    await expect(decryptVault({ ...payload, iterations: 2_000 }, 'test password')).rejects.toThrow();
    await expect(decryptVault({ ...payload, salt: 'invalid!' }, 'test password')).rejects.toThrow();
  });
});

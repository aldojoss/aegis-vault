import { EncryptedVaultPayload, VaultData } from '../types/vault';

const ITERATIONS = 600_000;
const LEGACY_ITERATIONS = 310_000;

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function isEncryptedVaultPayload(value: unknown): value is EncryptedVaultPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as EncryptedVaultPayload;
  if (payload.version !== 1 && payload.version !== 2) return false;
  if (typeof payload.salt !== 'string' || typeof payload.iv !== 'string' || typeof payload.cipherText !== 'string') return false;
  if (payload.version === 2 && payload.iterations !== ITERATIONS) return false;
  try {
    return base64ToBuffer(payload.salt).length === 16
      && base64ToBuffer(payload.iv).length === 12
      && base64ToBuffer(payload.cipherText).length >= 16;
  } catch {
    return false;
  }
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    passwordKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export async function encryptVault(vault: VaultData, password: string): Promise<EncryptedVaultPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(vault))
  );
  // AES-GCM verifies the password. Never store a cheaper password verifier.
  return { version: 2, iterations: ITERATIONS, salt: bufferToBase64(salt), iv: bufferToBase64(iv), cipherText: bufferToBase64(cipher) };
}

export async function decryptVault(payload: EncryptedVaultPayload, password: string): Promise<VaultData> {
  if (!isEncryptedVaultPayload(payload)) throw new Error('El archivo de bóveda no es compatible o está dañado.');
  const key = await deriveKey(password, base64ToBuffer(payload.salt), payload.version === 1 ? LEGACY_ITERATIONS : ITERATIONS);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) }, key, base64ToBuffer(payload.cipherText)
    );
    const vault = JSON.parse(new TextDecoder().decode(plain)) as VaultData;
    if (!Array.isArray(vault.items) || !vault.settings) throw new Error('Invalid vault data');
    return vault;
  } catch {
    throw new Error('Contraseña maestra incorrecta o datos dañados.');
  }
}

export async function verifyMasterPassword(payload: EncryptedVaultPayload, password: string): Promise<boolean> {
  try {
    await decryptVault(payload, password);
    return true;
  } catch {
    return false;
  }
}

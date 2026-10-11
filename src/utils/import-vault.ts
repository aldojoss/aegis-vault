import { decryptVault, isEncryptedVaultPayload } from './crypto';
import type { VaultData, VaultItem } from '../types/vault';

export function validateImportedVault(value: unknown): VaultData {
  const vault = value as VaultData;
  if (!vault || !Array.isArray(vault.items) || vault.items.length > 20000) throw new Error('El archivo no contiene una bóveda compatible.');
  const fields = ['username', 'password', 'url', 'notes', 'cardNumber', 'cardHolder', 'cardExpiry', 'cardCvv', 'cardPin', 'fullName', 'email', 'phone', 'idNumber', 'address', 'host', 'port', 'privateKey'] as const;
  const ids = new Set<string>();
  for (const item of vault.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.title !== 'string' || !['login', 'card', 'note', 'identity', 'server'].includes(item.category)
      || !Number.isFinite(item.createdAt) || !Number.isFinite(item.updatedAt)
      || fields.some(field => item[field] !== undefined && typeof item[field] !== 'string')
      || ['favorite', 'trashed'].some(field => (item as any)[field] !== undefined && typeof (item as any)[field] !== 'boolean')
      || (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some(tag => typeof tag !== 'string')))
      || (item.customFields !== undefined && (!Array.isArray(item.customFields) || item.customFields.some(field => !field || typeof field.id !== 'string' || typeof field.label !== 'string' || typeof field.value !== 'string' || typeof field.isSecret !== 'boolean')))
      || (item.passwordHistory !== undefined && (!Array.isArray(item.passwordHistory) || item.passwordHistory.some(entry => !entry || typeof entry.password !== 'string' || !Number.isFinite(entry.changedAt))))) {
      throw new Error('La copia contiene registros dañados o identificadores repetidos. No se importó ningún registro.');
    }
    ids.add(item.id);
  }
  return vault;
}

export async function readImportedVault(content: string, password: string): Promise<VaultData> {
  const parsed = JSON.parse(content);
  return validateImportedVault(isEncryptedVaultPayload(parsed) ? await decryptVault(parsed, password) : parsed);
}

export function mergeImportedItems(current: VaultItem[], incoming: VaultItem[]) {
  const ids = new Set(current.map(item => item.id));
  return [...current, ...incoming.filter(item => !ids.has(item.id))];
}

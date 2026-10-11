import { VaultData, EncryptedVaultPayload } from '../types/vault';
import { encryptVault } from './crypto';

export function createVaultWriter(write: (content: string) => Promise<void>) {
  let pending: Promise<unknown> = Promise.resolve();
  return {
    save(data: VaultData, password: string): Promise<EncryptedVaultPayload> {
      // Snapshot now and serialize encryption too, so slower earlier saves cannot
      // overwrite newer records (or a changed master password).
      const snapshot = JSON.parse(JSON.stringify(data)) as VaultData;
      const operation = pending.catch(() => {}).then(async () => {
        const payload = await encryptVault(snapshot, password);
        await write(JSON.stringify(payload));
        return payload;
      });
      pending = operation;
      return operation;
    },
    flush: () => pending,
  };
}

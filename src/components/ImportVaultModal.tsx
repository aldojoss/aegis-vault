import React, { useState } from 'react';
import type { VaultData } from '../types/vault';
import { isEncryptedVaultPayload } from '../utils/crypto';
import { readImportedVault } from '../utils/import-vault';

export const ImportVaultModal: React.FC<{
  content: string; fileName: string; onClose: () => void;
  onImport: (vault: VaultData) => Promise<boolean>;
}> = ({ content, fileName, onClose, onImport }) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  let encrypted = false;
  try { encrypted = isEncryptedVaultPayload(JSON.parse(content)); } catch {}
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
    <form role="dialog" aria-modal="true" aria-labelledby="import-title" className="w-full max-w-md rounded-xl border border-stone-700 bg-[#202124] p-6 space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(null);
      try {
        const imported = await readImportedVault(content, password);
        if (!await onImport(imported)) throw new Error('No se pudo guardar la importación. Reintenta sin cerrar esta ventana.');
      } catch { setError('No se pudo importar: comprueba el archivo y la contraseña de esa copia. Tus registros actuales se conservan.'); }
      finally { setBusy(false); }
    }}>
      <h2 id="import-title" className="text-lg font-medium">Importar copia de Aegis</h2>
      <p className="text-sm text-stone-400 break-all">{fileName}</p>
      <p className="text-sm text-stone-400">Se añadirán los registros nuevos. Los que tengan un identificador ya existente se conservarán como están; esto no sincroniza cambios entre dispositivos.</p>
      {encrypted ? <div><label htmlFor="backup-password" className="block text-sm mb-2">Contraseña maestra de la copia</label><input id="backup-password" type="password" autoFocus autoComplete="off" disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className="auth-input w-full rounded-lg p-3" required /></div> : <p className="text-sm text-amber-300">Esta copia no está cifrada. Los registros se guardarán cifrados en tu bóveda actual.</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex justify-end gap-4 text-sm"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary-action px-4 py-2" disabled={busy} type="submit">{busy ? 'Importando…' : 'Importar registros'}</button></div>
    </form>
  </div>;
};

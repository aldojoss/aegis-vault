import React, { useState } from 'react';
import { VaultItem } from '../types/vault';

export const LegacyDemoReview: React.FC<{
  items: VaultItem[];
  onMoveToTrash: (ids: string[]) => Promise<boolean>;
}> = ({ items, onMoveToTrash }) => {
  const candidates = items.filter(item => /^sample-[1-7]$/.test(item.id) && !item.trashed);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!candidates.length) return null;
  return <>
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-stone-700 bg-stone-800 text-xs text-stone-300">
      <span>Hay registros con identificadores de demostración de una versión anterior.</span>
      <button className="underline shrink-0" onClick={() => setOpen(true)}>Revisar ejemplos antiguos</button>
    </div>
    {open && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="legacy-demo-title" className="w-full max-w-md p-6 rounded-xl border border-stone-700 bg-[#202124] text-stone-200 space-y-4">
        <h2 id="legacy-demo-title" className="font-semibold">Revisar ejemplos antiguos</h2>
        <p className="text-sm text-stone-400">Selecciona solo los registros de ejemplo que quieras mover a la papelera. Si editaste alguno para uso real, consérvalo. No se borrarán definitivamente.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {candidates.map(item => <label key={item.id} className="flex gap-3 items-center py-2 text-sm">
            <input type="checkbox" disabled={busy} checked={selected.includes(item.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />
            <span>{item.title}</span>
          </label>)}
        </div>
        {error && <p role="alert" className="text-sm text-rose-300">No se guardó el cambio. Tus registros siguen donde estaban; puedes reintentar.</p>}
        <div className="flex justify-end gap-3 text-sm">
          <button disabled={busy} onClick={() => { setOpen(false); setSelected([]); setError(false); }}>Cancelar</button>
          <button className="primary-action px-3 py-2 disabled:opacity-50" disabled={busy || !selected.length} onClick={async () => {
            setBusy(true);
            try {
              if (await onMoveToTrash(selected)) { setOpen(false); setSelected([]); setError(false); }
              else setError(true);
            } catch { setError(true); }
            finally { setBusy(false); }
          }}>{busy ? 'Guardando…' : 'Mover a la papelera'}</button>
        </div>
      </section>
    </div>}
  </>;
};

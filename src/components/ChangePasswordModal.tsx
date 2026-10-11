import React, { useState } from 'react';
import { X, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/strength';

interface ChangePasswordModalProps {
  onConfirm: (currentPass: string, newPass: string) => Promise<boolean>;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  onConfirm,
  onClose,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = evaluatePasswordStrength(newPass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPass || !newPass) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (newPass.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const ok = await onConfirm(currentPass, newPass);
      if (ok) {
        onClose();
      } else {
        setError('La contraseña actual es incorrecta.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña maestra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#191a1c]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#242529] border border-[#383a3e] rounded-lg shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Cambiar Contraseña Maestra</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Contraseña Actual
            </label>
            <input
              type="password"
              autoFocus
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white focus:outline-none focus:border-stone-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nueva Contraseña Maestra
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white focus:outline-none focus:border-stone-400"
            />
            {newPass && (
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Seguridad: {strength.label}</span>
                <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white focus:outline-none focus:border-stone-400"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-950 primary-action rounded-lg transition"
            >
              {loading ? 'Re-cifrando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

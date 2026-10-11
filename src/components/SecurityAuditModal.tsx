import React from 'react';
import { VaultItem } from '../types/vault';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Copy, ArrowRight, ShieldCheck } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/strength';

interface SecurityAuditModalProps {
  items: VaultItem[];
  onClose: () => void;
  onSelectItem: (item: VaultItem) => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  items,
  onClose,
  onSelectItem,
}) => {
  // Analyze items
  const activeItems = items.filter((i) => !i.trashed && i.password);

  // 1. Weak passwords
  const weakItems = activeItems.filter((i) => {
    if (!i.password) return false;
    const strength = evaluatePasswordStrength(i.password);
    return strength.score <= 1;
  });

  // 2. Reused passwords
  const passwordCounts: Record<string, VaultItem[]> = {};
  activeItems.forEach((item) => {
    if (item.password) {
      if (!passwordCounts[item.password]) {
        passwordCounts[item.password] = [];
      }
      passwordCounts[item.password].push(item);
    }
  });

  const reusedItems: { password: string; items: VaultItem[] }[] = [];
  Object.entries(passwordCounts).forEach(([pwd, list]) => {
    if (list.length > 1) {
      reusedItems.push({ password: pwd, items: list });
    }
  });

  // Health Score calculation (0 to 100)
  const totalWithPassword = activeItems.length;
  let healthScore = 100;
  if (totalWithPassword > 0) {
    const weakPenalty = (weakItems.length / totalWithPassword) * 45;
    const reusedCount = reusedItems.reduce((acc, curr) => acc + curr.items.length, 0);
    const reusedPenalty = (reusedCount / totalWithPassword) * 40;
    healthScore = Math.max(0, Math.round(100 - weakPenalty - reusedPenalty));
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981'; // emerald
    if (score >= 60) return '#06b6d4'; // cyan
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#191a1c]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#242529] border border-[#383a3e] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#202124]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-stone-300 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Auditoría de Seguridad de la Bóveda</h3>
              <p className="text-[11px] text-slate-400">Diagnóstico de vulnerabilidades y riesgos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Health Score Summary Card */}
          <div className="p-5 rounded-lg bg-gradient-to-r from-[#202124] to-[#151d2f] border border-[#222e44] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Puntuación Global de Salud
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: getScoreColor(healthScore) }}
                >
                  {healthScore}%
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {healthScore >= 80 ? 'Excelente Seguridad' : healthScore >= 50 ? 'Riesgo Moderado' : 'Acción Requerida'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Analizando {totalWithPassword} cuentas protegidas en tu bóveda local.
              </p>
            </div>

            <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-inner">
              {healthScore >= 80 ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              )}
            </div>
          </div>

          {/* Reused Passwords Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Contraseñas Reutilizadas ({reusedItems.length} grupos)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Peligro alto de brecha en cadena</span>
            </div>

            {reusedItems.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-[#0e1422] border border-[#1b2438] flex items-center space-x-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>¡Excelente! No tienes contraseñas repetidas en múltiples servicios.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {reusedItems.map((group, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0e1422] border border-rose-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-300 font-mono text-[11px]">
                        Contraseña compartida en {group.items.length} cuentas:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectItem(item);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
                        >
                          <span>{item.title}</span>
                          <ArrowRight className="w-3 h-3 text-stone-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Passwords Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Contraseñas Débiles o Cortas ({weakItems.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Vulnerables a ataques de fuerza bruta</span>
            </div>

            {weakItems.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-[#0e1422] border border-[#1b2438] flex items-center space-x-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Todas tus contraseñas cumplen con estándares altos de seguridad.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {weakItems.map((item) => {
                  const str = evaluatePasswordStrength(item.password!);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-[#0e1422] border border-amber-500/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-medium text-white block">{item.title}</span>
                        <span className="text-[11px] text-slate-400">
                          {str.feedback[0] || 'Entropía insuficiente'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-stone-200 border border-cyan-500/30 text-xs font-medium flex items-center space-x-1 transition"
                      >
                        <span>Fortalecer</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#202124] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { VaultItem } from '../types/vault';
import {
  ExternalLink, Copy, Check, Eye, EyeOff, Edit3, Trash2, Star,
  Globe, CreditCard, FileText, UserCheck, Server, ShieldCheck,
  History, Calendar, Lock, KeyRound, AlertCircle
} from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/strength';

interface VaultItemDetailProps {
  item: VaultItem | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopy: (text: string, label: string) => void;
}

export const VaultItemDetail: React.FC<VaultItemDetailProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <KeyRound className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-400">Ningún elemento seleccionado</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Selecciona un elemento de la lista para ver sus detalles o presiona Nuevo para agregar uno.
        </p>
      </div>
    );
  }

  const handleCopyField = (text: string, fieldName: string, label: string) => {
    onCopy(text, label);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const strength = item.password ? evaluatePasswordStrength(item.password) : null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="vault-detail h-full flex flex-col overflow-y-auto p-6 space-y-6">
      {/* Top Header Card */}
      <div className="detail-header flex items-start justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shadow-md">
            {item.category === 'card' && <CreditCard className="w-6 h-6" />}
            {item.category === 'note' && <FileText className="w-6 h-6" />}
            {item.category === 'identity' && <UserCheck className="w-6 h-6" />}
            {item.category === 'server' && <Server className="w-6 h-6" />}
            {item.category === 'login' && <Globe className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{item.title}</h2>
              <button
                onClick={onToggleFavorite}
                className={`p-1 rounded-lg transition ${
                  item.favorite
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-500 hover:text-amber-400'
                }`}
                title={item.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
            <div className="detail-metadata flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
              <span className="capitalize px-2 py-0.5 rounded-full bg-slate-800 text-stone-200 font-medium">
                {item.category}
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Modificado: {formatDate(item.updatedAt)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions flex items-center space-x-2">
          {item.url && (
            <a
              href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-stone-200 border border-slate-700/60 transition"
              title="Abrir enlace web"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-stone-200 border border-cyan-500/30 font-medium text-xs transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
            title="Eliminar elemento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="space-y-4">
        {/* Username / Identifier */}
        {item.username && (
          <div className="p-3.5 rounded-lg bg-[#242529] border border-[#383a3e] flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
                Usuario o Correo
              </span>
              <span className="text-xs font-mono text-slate-200 select-all block truncate">
                {item.username}
              </span>
            </div>
            <button
              onClick={() => handleCopyField(item.username!, 'user', 'Usuario copiado')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-stone-200 transition shrink-0 ml-3"
              title="Copiar usuario"
            >
              {copiedField === 'user' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Password Card with Strength & Copy */}
        {item.password && (
          <div className="p-4 rounded-lg bg-[#242529] border border-[#383a3e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Contraseña
              </span>
              {strength && (
                <div className="password-strength-label flex items-center space-x-1.5 text-[11px]">
                  <span className="text-slate-400">Fortaleza:</span>
                  <span style={{ color: strength.color }} className="font-semibold">
                    {strength.label} (estimación)
                  </span>
                </div>
              )}
            </div>

            {/* Password Display Field */}
            <div className="flex items-center justify-between bg-[#1b1c1f] px-3.5 py-2.5 rounded-lg border border-[#1f293d]">
              <span className="font-mono text-sm tracking-wider text-slate-100 select-all truncate flex-1">
                {showPassword ? item.password : '••••••••••••••••••••'}
              </span>
              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopyField(item.password!, 'pass', 'Contraseña copiada (portapapeles protegido)')}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center space-x-1 transition"
                  title="Copiar contraseña"
                >
                  {copiedField === 'pass' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Strength Visual Bar */}
            {strength && (
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${strength.percent}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                {strength.score <= 2 && (
                  <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Contraseña vulnerable. Te recomendamos actualizarla.</span>
                  </div>
                )}
              </div>
            )}

            {/* Password History Accordion */}
            {item.passwordHistory && item.passwordHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center space-x-1.5 text-[11px] text-slate-400 hover:text-stone-200 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial ({item.passwordHistory.length} contraseñas anteriores)</span>
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-1.5 pl-2 border-l border-slate-800">
                    {item.passwordHistory.map((hist, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="font-mono text-slate-300">••••••••</span>
                        <span className="text-[10px] text-slate-500">{formatDate(hist.changedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Website URL */}
        {item.url && (
          <div className="p-3.5 rounded-lg bg-[#242529] border border-[#383a3e] flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
                Dirección Web
              </span>
              <a
                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-stone-300 hover:underline block truncate"
              >
                {item.url}
              </a>
            </div>
            <button
              onClick={() => handleCopyField(item.url!, 'url', 'URL copiada')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-stone-200 transition shrink-0 ml-3"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Credit Card Specific Fields */}
        {item.category === 'card' && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-slate-900 to-[#121c2e] border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">Datos de la Tarjeta</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Número</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm tracking-widest text-white">
                    {item.cardNumber || '•••• •••• •••• ••••'}
                  </span>
                  {item.cardNumber && (
                    <button
                      onClick={() => handleCopyField(item.cardNumber!, 'cardNum', 'Número de tarjeta copiado')}
                      className="p-1 text-slate-400 hover:text-emerald-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Titular</span>
                  <span className="text-xs text-slate-200">{item.cardHolder || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Vence</span>
                  <span className="text-xs font-mono text-slate-200">{item.cardExpiry || '—'}</span>
                </div>
              </div>

              {item.cardCvv && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 uppercase block">CVV / CVC</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-slate-200">{item.cardCvv}</span>
                    <button
                      onClick={() => handleCopyField(item.cardCvv!, 'cvv', 'CVV copiado')}
                      className="p-1 text-slate-400 hover:text-emerald-400"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Server fields */}
        {item.category === 'server' && (
          <div className="p-4 rounded-lg bg-[#242529] border border-[#383a3e] space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Servidor / Host
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-200">
                {item.host ? `${item.host}:${item.port || '22'}` : '—'}
              </span>
              {item.host && (
                <button
                  onClick={() => handleCopyField(item.host!, 'host', 'Host copiado')}
                  className="p-1 text-slate-400 hover:text-stone-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="p-4 rounded-lg bg-[#242529] border border-[#383a3e] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Notas Seguras
              </span>
              <button
                onClick={() => handleCopyField(item.notes!, 'notes', 'Notas copiadas')}
                className="p-1 text-slate-400 hover:text-stone-300 transition"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed select-text">
              {item.notes}
            </p>
          </div>
        )}

        {/* Custom fields */}
        {item.customFields && item.customFields.length > 0 && (
          <div className="p-4 rounded-lg bg-[#242529] border border-[#383a3e] space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Campos Personalizados
            </span>
            <div className="space-y-2">
              {item.customFields.map((cf) => (
                <div key={cf.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800 last:border-none">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{cf.label}</span>
                    <span className="text-slate-200 font-mono">
                      {cf.isSecret ? '••••••••' : cf.value}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyField(cf.value, `cf-${cf.id}`, `${cf.label} copiado`)}
                    className="p-1 text-slate-400 hover:text-stone-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

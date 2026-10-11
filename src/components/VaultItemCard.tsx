import React from 'react';
import { VaultItem } from '../types/vault';
import { Globe, CreditCard, FileText, UserCheck, Server, Star, Copy, Check, Key } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/strength';

interface VaultItemCardProps {
  item: VaultItem;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onQuickCopyPassword: (e: React.MouseEvent, password: string) => void;
  onQuickCopyUsername: (e: React.MouseEvent, username: string) => void;
  copiedId: string | null;
}

export const VaultItemCard: React.FC<VaultItemCardProps> = ({
  item,
  isSelected,
  onSelect,
  onToggleFavorite,
  onQuickCopyPassword,
  onQuickCopyUsername,
  copiedId,
}) => {
  const getCategoryIcon = () => {
    switch (item.category) {
      case 'card':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'note':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'identity':
        return <UserCheck className="w-4 h-4 text-stone-400" />;
      case 'server':
        return <Server className="w-4 h-4 text-stone-400" />;
      case 'login':
      default:
        return <Globe className="w-4 h-4 text-stone-300" />;
    }
  };

  const getSubtext = () => {
    if (item.category === 'card') {
      return item.cardNumber ? `•••• ${item.cardNumber.slice(-4)}` : 'Tarjeta';
    }
    if (item.category === 'note') {
      return item.notes ? item.notes.slice(0, 32) + '...' : 'Nota Segura';
    }
    if (item.category === 'identity') {
      return item.email || item.fullName || 'Identidad';
    }
    if (item.category === 'server') {
      return item.host || 'Servidor';
    }
    return item.username || item.url || 'Sin usuario';
  };

  const strength = item.password ? evaluatePasswordStrength(item.password) : null;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={item.title}
      aria-pressed={isSelected}
      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(); } }}
      className={`group relative px-3 py-3 rounded-lg cursor-pointer transition-colors border border-transparent ${
        isSelected
          ? 'bg-[#313634] border-stone-500  text-white'
          : 'bg-transparent hover:bg-[#292b2d] text-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Category Icon Badge */}
          <div className="w-9 h-9 rounded-lg bg-[#202124] border border-[#383a3e] flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition">
            {getCategoryIcon()}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm text-stone-100 truncate group-hover:text-stone-200 transition">
                {item.title}
              </span>
              {item.favorite && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {getSubtext()}
            </p>
          </div>
        </div>

        {/* Hover / Right Actions */}
        <div className="flex items-center space-x-1 pl-2">
          {/* Strength dot indicator */}
          {strength && (
            <div
              className="w-2 h-2 rounded-full shrink-0 mr-1 hidden sm:block"
              style={{ backgroundColor: strength.color }}
              title={`Seguridad: ${strength.label}`}
            />
          )}

          {/* Quick Copy Username */}
          {item.username && (
            <button
              onClick={(e) => onQuickCopyUsername(e, item.username!)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-stone-200 transition"
              title="Copiar Usuario"
            >
              {copiedId === `user-${item.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Quick Copy Password */}
          {item.password && (
            <button
              onClick={(e) => onQuickCopyPassword(e, item.password!)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-emerald-300 transition"
              title="Copiar Contraseña"
            >
              {copiedId === `pass-${item.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Key className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Favorite Toggle */}
          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg transition ${
              item.favorite
                ? 'text-amber-400 hover:text-amber-300'
                : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400'
            }`}
            title={item.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
          >
            <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

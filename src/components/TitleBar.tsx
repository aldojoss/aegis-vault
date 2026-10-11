import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Shield, Lock } from 'lucide-react';
import { version } from '../../package.json';
import { isAndroid } from '../platform/android';

interface TitleBarProps {
  isLocked: boolean;
  onLockClick?: () => void;
  vaultItemCount?: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isLocked, onLockClick, vaultItemCount = 0 }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      const unsubscribe = window.electronAPI.onMaximizedChange(setIsMaximized);
      return () => unsubscribe();
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="app-titlebar titlebar-drag h-10 w-full bg-[#202124] border-b border-[#323438] flex items-center justify-between px-3 select-none z-50 text-slate-300">
      {/* Brand & Status */}
      <div className="titlebar-brand flex items-center space-x-2.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#c9d4c1] text-slate-950 font-bold shadow-sm">
          <Shield className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-xs tracking-tight text-slate-100">Aegis Vault</span>
          <span className="titlebar-version text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-stone-300 font-mono border border-slate-700/50">
            v{version}
          </span>
        </div>

        {/* Vault lock indicator button */}
        {!isLocked && (
          <button
            onClick={onLockClick}
            className="titlebar-lock titlebar-nodrag ml-3 flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Bloquear Bóveda Ahora"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Bloquear</span>
            <span className="titlebar-count text-slate-500 text-[10px]">({vaultItemCount})</span>
          </button>
        )}
      </div>

      {/* Center Drag Handle Title */}
      <div className="text-[11px] font-medium text-slate-400 hidden sm:block">
        {isLocked ? 'Bóveda bloqueada' : 'Mi bóveda'}
      </div>

      {/* Native Window Controls */}
      {!isAndroid() && <div className="window-controls titlebar-nodrag flex items-center space-x-1">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-600/90 text-slate-400 hover:text-white transition"
          title="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>}
    </div>
  );
};

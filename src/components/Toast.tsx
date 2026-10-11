import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Clock, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  countdownSeconds?: number;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;

    if (toast.countdownSeconds) {
      setRemaining(toast.countdownSeconds);
      const interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onClose();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-[#141b2b] border border-cyan-500/30 text-slate-100 shadow-2xl backdrop-blur-md">
        {toast.type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
        ) : toast.type === 'warning' ? (
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        ) : toast.type === 'info' ? (
          <Info className="w-5 h-5 text-stone-300 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        )}

        <div className="flex flex-col pr-2">
          <span className="text-xs font-semibold text-slate-100">{toast.title}</span>
          {toast.description && (
            <span className="text-[11px] text-slate-400">{toast.description}</span>
          )}
        </div>

        {remaining !== null && (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-800 text-stone-200 text-[11px] font-mono border border-slate-700">
            <Clock className="w-3 h-3 text-stone-300 animate-pulse" />
            <span>{remaining}s</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded hover:bg-slate-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

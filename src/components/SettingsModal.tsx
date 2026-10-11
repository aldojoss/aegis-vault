import React, { useState, useEffect } from 'react';
import { VaultSettings, VaultData } from '../types/vault';
import {
  X, Settings, Shield, Clock, Download, Upload, Key,
  CheckCircle2, AlertTriangle, FileCode, HardDrive
} from 'lucide-react';

interface SettingsModalProps {
  settings: VaultSettings;
  onUpdateSettings: (newSettings: VaultSettings) => void;
  onExportEncrypted: () => Promise<void>;
  onExportDecrypted: () => Promise<void>;
  onImportFile: () => Promise<void>;
  onChangeMasterPassword: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onExportEncrypted,
  onExportDecrypted,
  onImportFile,
  onChangeMasterPassword,
  onClose,
}) => {
  const [appInfo, setAppInfo] = useState<{ version: string; vaultPath: string } | null>(null);
  const [showExportWarning, setShowExportWarning] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getInfo().then(setAppInfo);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#191a1c]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#242529] border border-[#383a3e] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#202124]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-stone-300 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Configuración y Seguridad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-300">
          {/* Section: Security Timeouts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-300" />
              <span>Bloqueo y Portapapeles</span>
            </h4>

            <div className="p-4 rounded-lg bg-[#1b1c1f] border border-[#383a3e] space-y-4">
              {/* Auto lock */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Bloqueo automático de bóveda</span>
                  <span className="text-[11px] text-slate-400">Bloquea por inactividad del usuario</span>
                </div>
                <select
                  value={settings.autoLockMinutes}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, autoLockMinutes: Number(e.target.value) })
                  }
                  className="bg-[#121827] border border-[#414348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-stone-400"
                >
                  <option value={1}>1 minuto</option>
                  <option value={5}>5 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={0}>Nunca</option>
                </select>
              </div>

              {/* Clipboard auto clear */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-xs font-medium text-white block">Limpieza de Portapapeles</span>
                  <span className="text-[11px] text-slate-400">Elimina contraseñas copiadas de la memoria</span>
                </div>
                <select
                  value={settings.clipboardClearSeconds}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, clipboardClearSeconds: Number(e.target.value) })
                  }
                  className="bg-[#121827] border border-[#414348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-stone-400"
                >
                  <option value={15}>15 segundos</option>
                  <option value={30}>30 segundos (Recomendado)</option>
                  <option value={60}>60 segundos</option>
                  <option value={0}>No limpiar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Master Password Change */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contraseña Maestra</span>
            </h4>

            <div className="p-4 rounded-lg bg-[#1b1c1f] border border-[#383a3e] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-white block">Modificar clave de cifrado</span>
                <span className="text-[11px] text-slate-400">Re-cifra toda la bóveda con una nueva clave</span>
              </div>
              <button
                onClick={onChangeMasterPassword}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-stone-200 border border-slate-700 transition"
              >
                Cambiar Clave
              </button>
            </div>
          </div>

          {/* Section: Backup, Export & Import */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Copias de Seguridad e Importación</span>
            </h4>

            <div className="p-4 rounded-lg bg-[#1b1c1f] border border-[#383a3e] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Copia de Seguridad Cifrada (.aegis)</span>
                  <span className="text-[11px] text-slate-400">Seguro para almacenar en la nube o disco externo</span>
                </div>
                <button
                  onClick={onExportEncrypted}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Cifrado</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-xs font-medium text-white block">Importar Datos (Aegis / JSON / CSV)</span>
                  <span className="text-[11px] text-slate-400">Restaura un respaldo o importa desde otros gestores</span>
                </div>
                <button
                  onClick={onImportFile}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-stone-200 border border-cyan-500/30 text-xs font-medium transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar</span>
                </button>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                {!showExportWarning ? (
                  <button
                    onClick={() => setShowExportWarning(true)}
                    className="text-[11px] text-slate-500 hover:text-amber-400 transition"
                  >
                    Exportar copia en texto plano (JSON sin cifrar)...
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                    <div className="flex items-center space-x-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>¡Advertencia de Seguridad!</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      El archivo exportado contendrá todas tus contraseñas en texto claro sin proteger. Guarda este archivo en un lugar de extrema confianza o bórralo tras usarlo.
                    </p>
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={async () => {
                          setShowExportWarning(false);
                          await onExportDecrypted();
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-[11px]"
                      >
                        Entiendo, Exportar JSON
                      </button>
                      <button
                        onClick={() => setShowExportWarning(false)}
                        className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Architecture & Storage Info */}
          <div className="p-4 rounded-lg bg-[#090d16] border border-[#182030] text-[11px] space-y-1.5">
            <span className="font-semibold text-slate-300 block">Arquitectura de Seguridad:</span>
            <p className="text-slate-400">
              • Algoritmo de cifrado: <strong className="text-slate-200">AES-256-GCM</strong> autenticado con IV único de 96 bits.
            </p>
            <p className="text-slate-400">
              • Derivación de claves: <strong className="text-slate-200">PBKDF2 (SHA-256)</strong> con 600.000 rondas al guardar. Compatible con bóvedas antiguas de 310.000 rondas.
            </p>
            {appInfo && (
              <p className="text-slate-500 pt-1 truncate">
                Ruta local: <span className="font-mono text-[10px] text-slate-400">{appInfo.vaultPath}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#202124] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check, ShieldCheck, Key, Hash, FileText } from 'lucide-react';
import { PasswordGeneratorOptions } from '../types/vault';
import { generatePassword, passphraseEntropy } from '../utils/generator';
import { evaluatePasswordStrength } from '../utils/strength';

interface PasswordGeneratorModalProps {
  onClose: () => void;
  onCopy: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  onClose,
  onCopy,
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    avoidAmbiguous: true,
    mode: 'password',
    wordCount: 6,
    separator: '-',
  });

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    setPassword(generatePassword(options));
  };

  useEffect(() => {
    regenerate();
  }, [options]);

  const strength = evaluatePasswordStrength(password);

  const handleCopy = () => {
    onCopy(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#191a1c]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#242529] border border-[#383a3e] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#202124]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Generador Criptográfico de Contraseñas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Output Display */}
          <div className="p-4 rounded-lg bg-[#1b1c1f] border border-[#383a3e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Resultado Generado
              </span>
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-400">Entropía:</span>
                <span style={{ color: strength.color }} className="font-semibold">
                  {options.mode === 'passphrase' ? passphraseEntropy(options.wordCount) : strength.entropy} bits {options.mode !== 'passphrase' && '(estimación)' }
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#242529] p-3 rounded-lg border border-[#222c42]">
              <span className="font-mono text-base tracking-wider text-stone-200 select-all break-all flex-1">
                {password}
              </span>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={regenerate}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Generar nueva"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
              />
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-[#1b1c1f] border border-[#383a3e]">
            <button
              onClick={() => setOptions({ ...options, mode: 'password' })}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition ${
                options.mode === 'password'
                  ? 'bg-cyan-600/30 text-stone-200 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Contraseña</span>
            </button>
            <button
              onClick={() => setOptions({ ...options, mode: 'passphrase' })}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition ${
                options.mode === 'passphrase'
                  ? 'bg-cyan-600/30 text-stone-200 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Frase de Paso</span>
            </button>
            <button
              onClick={() => setOptions({ ...options, mode: 'pin' })}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition ${
                options.mode === 'pin'
                  ? 'bg-cyan-600/30 text-stone-200 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>PIN Numérico</span>
            </button>
          </div>

          {/* Controls based on mode */}
          {options.mode === 'password' && (
            <div className="space-y-4">
              {/* Length Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Longitud de Caracteres:</span>
                  <span className="font-mono text-stone-300 font-bold">{options.length}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={options.length}
                  onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.uppercase}
                    onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-stone-400"
                  />
                  <span>Mayúsculas (A-Z)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.lowercase}
                    onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-stone-400"
                  />
                  <span>Minúsculas (a-z)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.numbers}
                    onChange={(e) => setOptions({ ...options, numbers: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-stone-400"
                  />
                  <span>Números (0-9)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.symbols}
                    onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-stone-400"
                  />
                  <span>Símbolos (!@#$%)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={options.avoidAmbiguous}
                    onChange={(e) => setOptions({ ...options, avoidAmbiguous: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-stone-400"
                  />
                  <span>Evitar caracteres ambiguos (0, O, 1, l, I)</span>
                </label>
              </div>
            </div>
          )}

          {options.mode === 'passphrase' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Cantidad de Palabras:</span>
                  <span className="font-mono text-stone-300 font-bold">{options.wordCount || 6}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={10}
                  value={options.wordCount || 6}
                  onChange={(e) => setOptions({ ...options, wordCount: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Separador de palabras</label>
                <div className="flex space-x-2">
                  {['-', '_', '.', ' '].map((sep) => (
                    <button
                      key={sep}
                      onClick={() => setOptions({ ...options, separator: sep })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                        options.separator === sep
                          ? 'bg-cyan-600/30 text-stone-200 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {sep === ' ' ? 'Espacio' : sep}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {options.mode === 'pin' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Dígitos del PIN:</span>
                  <span className="font-mono text-stone-300 font-bold">{options.length}</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={12}
                  value={options.length}
                  onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#202124] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

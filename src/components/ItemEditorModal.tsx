import React, { useState } from 'react';
import { VaultItem, ItemCategory } from '../types/vault';
import {
  X, Save, Wand2, Eye, EyeOff, Globe, CreditCard, FileText,
  UserCheck, Server, Plus, Trash2, KeyRound
} from 'lucide-react';
import { generatePassword } from '../utils/generator';
import { evaluatePasswordStrength } from '../utils/strength';

interface ItemEditorModalProps {
  itemToEdit: VaultItem | null;
  onSave: (itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  itemToEdit,
  onSave,
  onClose,
}) => {
  const [category, setCategory] = useState<ItemCategory>(itemToEdit?.category || 'login');
  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [username, setUsername] = useState(itemToEdit?.username || '');
  const [password, setPassword] = useState(itemToEdit?.password || '');
  const [url, setUrl] = useState(itemToEdit?.url || '');
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [favorite, setFavorite] = useState(itemToEdit?.favorite || false);
  const [showPassword, setShowPassword] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState(itemToEdit?.cardNumber || '');
  const [cardHolder, setCardHolder] = useState(itemToEdit?.cardHolder || '');
  const [cardExpiry, setCardExpiry] = useState(itemToEdit?.cardExpiry || '');
  const [cardCvv, setCardCvv] = useState(itemToEdit?.cardCvv || '');

  // Server fields
  const [host, setHost] = useState(itemToEdit?.host || '');
  const [port, setPort] = useState(itemToEdit?.port || '22');

  // Custom fields
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string; isSecret: boolean }>>(
    itemToEdit?.customFields || []
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const strength = password ? evaluatePasswordStrength(password) : null;

  const handleGenerate = () => {
    const generated = generatePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      avoidAmbiguous: true,
      mode: 'password',
    });
    setPassword(generated);
  };

  const handleAddCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        label: 'Campo nuevo',
        value: '',
        isSecret: false,
      },
    ]);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleCustomFieldChange = (id: string, updates: Partial<{ label: string; value: string; isSecret: boolean }>) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título o nombre del elemento es obligatorio');
      return;
    }

    if (saving) return;
    setSaving(true);
    setError(null);
    try { await onSave({
      category,
      title: title.trim(),
      username: username.trim(),
      password,
      url: url.trim(),
      notes: notes.trim(),
      favorite,
      cardNumber: cardNumber.trim(),
      cardHolder: cardHolder.trim(),
      cardExpiry: cardExpiry.trim(),
      cardCvv: cardCvv.trim(),
      host: host.trim(),
      port: port.trim(),
      customFields: customFields.filter((f) => f.label.trim() && f.value.trim()),
    }); } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar. Tus campos siguen aquí para reintentar.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#191a1c]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#242529] border border-[#383a3e] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#202124]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-stone-300 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">
              {itemToEdit ? 'Editar Elemento' : 'Nuevo Registro Seguro'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Category Selector Tabs */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Categoría
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-lg bg-[#1b1c1f] border border-[#383a3e]">
              <button
                type="button"
                onClick={() => setCategory('login')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition ${
                  category === 'login'
                    ? 'bg-cyan-600/30 text-stone-200 border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Login</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('card')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition ${
                  category === 'card'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Tarjeta</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('note')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition ${
                  category === 'note'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Nota</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('identity')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition ${
                  category === 'identity'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Identidad</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('server')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition ${
                  category === 'server'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Server className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Servidor</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Título o Servicio *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Google, GitHub, Banco..."
              className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
            />
          </div>

          {/* Login or Server specific */}
          {(category === 'login' || category === 'server') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Usuario o Correo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL / Dominio
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>
            </div>
          )}

          {/* Password Field with Generator & Strength */}
          {(category === 'login' || category === 'server') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center space-x-1 text-[11px] text-stone-300 hover:text-stone-200 transition"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Generar Fuerte</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce o genera una contraseña..."
                  className="w-full pl-3 pr-10 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && strength && (
                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Seguridad:</span>
                    <span style={{ color: strength.color }} className="font-medium">
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Credit Card Specific */}
          {category === 'card' && (
            <div className="space-y-3 p-3 rounded-lg bg-[#202124] border border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Número de Tarjeta
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 0000 0000 0000"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Titular de la Tarjeta
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="NOMBRE APELLIDO"
                    className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expiración (MM/AA)
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                  />
                </div>
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-medium text-slate-300 mb-1">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="•••"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>
            </div>
          )}

          {/* Server Specific */}
          {category === 'server' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Host / IP</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100 o api.ejemplo.com"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Puerto</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="22"
                  className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
                />
              </div>
            </div>
          )}

          {/* Secure Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notas Seguras</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional cifrada, preguntas secretas, tokens de recuperación..."
              className="w-full px-3 py-2 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition resize-none"
            />
          </div>

          {/* Custom Fields */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Campos Adicionales
              </span>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="flex items-center space-x-1 text-[11px] text-stone-300 hover:text-stone-200"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar campo</span>
              </button>
            </div>

            {customFields.map((cf) => (
              <div key={cf.id} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Etiqueta"
                  value={cf.label}
                  onChange={(e) => handleCustomFieldChange(cf.id, { label: e.target.value })}
                  className="w-1/3 px-2 py-1.5 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white"
                />
                <input
                  type={cf.isSecret ? 'password' : 'text'}
                  placeholder="Valor"
                  value={cf.value}
                  onChange={(e) => handleCustomFieldChange(cf.id, { value: e.target.value })}
                  className="flex-1 px-2 py-1.5 bg-[#191a1c] border border-[#414348] rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleCustomFieldChange(cf.id, { isSecret: !cf.isSecret })}
                  className={`p-1.5 rounded-lg border text-xs ${
                    cf.isSecret
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Ocultar como secreto"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(cf.id)}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#202124] flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg primary-action text-slate-950 font-semibold text-xs  transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando…' : 'Guardar elemento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

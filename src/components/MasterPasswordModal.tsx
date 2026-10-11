import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, Shield, AlertCircle, Fingerprint } from 'lucide-react';
import { creatorCredit } from '../brand';

interface Props {
  isFirstTime: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onCreateVault: (password: string) => Promise<void>;
  onResetVault?: () => void;
  onBiometricUnlock?: () => Promise<boolean>;
}

export const MasterPasswordModal: React.FC<Props> = ({ isFirstTime, onUnlock, onCreateVault, onResetVault, onBiometricUnlock }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!password) { setError('Escribe tu contraseña maestra.'); return; }
    if (isFirstTime && password.length < 8) { setError('Usa al menos 8 caracteres. Una frase larga es más fácil de recordar.'); return; }
    if (isFirstTime && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      if (isFirstTime) await onCreateVault(password);
      else if (!await onUnlock(password)) setError('La contraseña no coincide o la bóveda está dañada.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo abrir la bóveda.');
    } finally { setBusy(false); }
  };

  return <main className="auth-layout flex-1 grid lg:grid-cols-2 overflow-auto">
    <section className="auth-intro hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-stone-800">
      <div className="flex items-center gap-3 text-stone-300"><Shield className="w-5 h-5" /><span className="text-sm font-medium">Aegis / Personal</span></div>
      <div className="max-w-sm space-y-6"><p className="text-xs tracking-[0.2em] uppercase text-stone-500">Lo importante, a salvo.</p><h1 className="auth-heading text-5xl leading-[1.15] text-stone-100">Un lugar para<br />tus claves.</h1><p className="text-sm leading-7 text-stone-400">Contraseñas, notas y documentos personales. Una bóveda en tu equipo, con una sola llave.</p><div className="h-px w-12 bg-stone-600" /></div>
      <p className="text-xs text-stone-500">Local por diseño. Sin cuenta ni sincronización.</p>
    </section>
    <section className="auth-form-section flex flex-col items-center justify-center p-8 lg:p-12">
      <div className="w-full max-w-sm">
        <div className="mb-8"><div className="auth-lock w-10 h-10 flex items-center justify-center rounded-lg mb-6"><Lock className="w-5 h-5" /></div><p className="text-xs uppercase tracking-widest text-stone-500 mb-3">{isFirstTime ? 'Primera vez aquí' : 'Bienvenido de nuevo'}</p><h2 className="text-2xl font-medium tracking-tight text-stone-100">{isFirstTime ? 'Configurar Bóveda Aegis' : 'Desbloquear Aegis Vault'}</h2><p className="text-sm leading-6 text-stone-400 mt-3">{isFirstTime ? 'Elige una contraseña maestra que puedas recordar. La necesitarás para abrir tu bóveda.' : onBiometricUnlock ? 'Tus registros siguen cifrados. Entra con tu huella o tu contraseña maestra.' : 'Tus registros siguen cifrados en este equipo. Usa tu contraseña maestra para acceder.'}</p></div>
        {error && <div role="alert" className="mb-5 flex gap-2 p-3 border border-rose-900 rounded-lg text-xs leading-5 text-rose-300"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {!isFirstTime && onBiometricUnlock && <div className="mb-5 space-y-3"><button disabled={busy} type="button" className="primary-action w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium" onClick={async () => {
          setBusy(true); setError('');
          try { await onBiometricUnlock(); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo usar la biometría. Usa tu contraseña maestra.'); }
          finally { setBusy(false); }
        }}><Fingerprint className="w-5 h-5" />Desbloquear con huella</button><p className="text-xs text-center text-stone-500">O usa tu contraseña maestra</p></div>}
        <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="master-password" className="block text-sm text-stone-300 mb-2">Contraseña maestra</label><div className="relative"><input id="master-password" type={visible ? 'text' : 'password'} autoFocus={!onBiometricUnlock} autoComplete={isFirstTime ? 'new-password' : 'current-password'} value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} className="auth-input w-full px-3 py-3 pr-12 rounded-lg text-sm" /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 px-3 text-stone-500 hover:text-stone-200">{visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
          {isFirstTime && <div><label htmlFor="confirm-master" className="block text-sm text-stone-300 mb-2">Confirmar contraseña</label><input id="confirm-master" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} className="auth-input w-full px-3 py-3 rounded-lg text-sm" /></div>}
          <button type="submit" disabled={busy} className="primary-action w-full flex items-center justify-between px-4 py-3 text-sm font-medium"><span>{busy ? 'Un momento…' : isFirstTime ? 'Crear bóveda' : 'Desbloquear bóveda'}</span><ArrowRight className="w-4 h-4" /></button>
        </form>
        <p className="text-xs text-stone-500 leading-5 mt-5">{isFirstTime ? 'Conserva tu contraseña maestra. La necesitarás para recuperar una copia o activar el desbloqueo con huella.' : 'La bóveda se bloquea al cerrar. Desbloquearla no crea una nueva.'}</p>
        {!isFirstTime && onResetVault && <div className="mt-8 pt-5 border-t border-stone-800">{!reset ? <button onClick={() => setReset(true)} className="text-xs text-stone-500 hover:text-stone-300">¿Olvidaste tu contraseña maestra?</button> : <div className="space-y-3 text-xs text-stone-400 leading-5"><p>Crear una bóveda nueva dejará la actual como respaldo cifrado. Sus registros seguirán necesitando la contraseña anterior.</p><div className="flex gap-4"><button onClick={onResetVault} className="text-rose-300">Crear otra bóveda</button><button onClick={() => setReset(false)}>Cancelar</button></div></div>}</div>}
      </div>
      <p className="creator-credit text-xs text-stone-500 mt-8">{creatorCredit}</p>
    </section>
  </main>;
};

// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { App } from '../src/App';
import type { ElectronAPI } from '../src/electron';
import { encryptVault, decryptVault } from '../src/utils/crypto';

const password = 'synthetic biometric test password';
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  const payload = await encryptVault({ version: 1, createdAt: 1, updatedAt: 1, items: [{ id: 'bio-test', category: 'login', title: 'Synthetic biometric record', createdAt: 1, updatedAt: 1 }], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark', showPasswordStrength: true } }, password);
  window.electronAPI = {
    loadVault: async () => ({ success: true, data: JSON.stringify(payload) }),
    saveVault: vi.fn(async () => ({ success: true })),
    isMaximized: async () => false, onMaximizedChange: () => () => {}, onBeforeClose: () => () => {},
    getInfo: async () => ({ version: 'test', vaultPath: 'synthetic' }),
    biometricStatus: async () => ({ available: true, enabled: true }),
    unlockBiometric: vi.fn(async () => ({ success: true, password })),
    disableBiometric: vi.fn(async () => ({ success: true })), confirmLocked: async () => {},
  } as unknown as ElectronAPI;
});
afterEach(() => { cleanup(); delete window.electronAPI; vi.unstubAllGlobals(); });

it('decrypts the vault using the credential released by native biometric authentication', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desbloquear con huella' }));
  expect(await screen.findByRole('button', { name: 'Synthetic biometric record' })).toBeTruthy();
  expect(window.electronAPI!.unlockBiometric).toHaveBeenCalledOnce();
});
it('keeps the vault locked when the biometric prompt is canceled', async () => {
  window.electronAPI!.unlockBiometric = async () => ({ success: false, canceled: true });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desbloquear con huella' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Desbloquear bóveda' }).hasAttribute('disabled')).toBe(false));
  expect(screen.queryByRole('button', { name: 'Synthetic biometric record' })).toBeNull();
  expect(window.electronAPI!.disableBiometric).not.toHaveBeenCalled();
});
it('rejects a stale biometric credential and requires the actual master password', async () => {
  window.electronAPI!.unlockBiometric = async () => ({ success: true, password: 'incorrect synthetic password' });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desbloquear con huella' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('activarse de nuevo'));
  expect(window.electronAPI!.disableBiometric).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Synthetic biometric record' })).toBeNull();
});
it('does not unlock from a biometric result arriving after the app entered the background', async () => {
  let complete!: (result: { success: boolean; password: string }) => void;
  window.electronAPI!.unlockBiometric = () => new Promise(resolve => { complete = resolve; });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desbloquear con huella' }));
  fireEvent(document, new Event('aegis:background'));
  fireEvent(document, new Event('aegis:foreground'));
  complete({ success: true, password });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Desbloquear bóveda' }).hasAttribute('disabled')).toBe(false));
  expect(screen.queryByRole('button', { name: 'Synthetic biometric record' })).toBeNull();
});
it('removes the wrapped old credential before saving a new master password', async () => {
  const order: string[] = [];
  let written = '';
  window.electronAPI!.disableBiometric = vi.fn(async () => { order.push('disable'); return { success: true }; });
  window.electronAPI!.saveVault = vi.fn(async content => { order.push('save'); written = content; return { success: true }; });
  const { container } = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desbloquear con huella' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir ajustes' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cambiar Clave' }));
  const inputs = container.querySelectorAll('form input');
  fireEvent.change(inputs[0], { target: { value: password } });
  fireEvent.change(inputs[1], { target: { value: 'new synthetic biometric password' } });
  fireEvent.change(inputs[2], { target: { value: 'new synthetic biometric password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar Contraseña' }));
  await waitFor(() => expect(order).toEqual(['disable', 'save']), { timeout: 10000 });
  expect((await decryptVault(JSON.parse(written), 'new synthetic biometric password')).items[0].id).toBe('bio-test');
});

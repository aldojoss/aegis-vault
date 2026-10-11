// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { App } from '../src/App';
import { ElectronAPI } from '../src/electron';
import { encryptVault, decryptVault } from '../src/utils/crypto';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
  window.electronAPI = {
    loadVault: vi.fn(async () => ({ success: true, data: null })),
    saveVault: vi.fn(async () => ({ success: true })),
    isMaximized: vi.fn(async () => false),
    onMaximizedChange: vi.fn(() => () => {}),
    onBeforeClose: vi.fn(() => () => {}),
    finishClose: vi.fn(async () => {}),
  } as unknown as ElectronAPI;
});
afterEach(() => { cleanup(); delete window.electronAPI; vi.unstubAllGlobals(); });

it('saves reviewed legacy examples to trash while preserving real records', async () => {
  const initial = { version: 1, createdAt: 1, updatedAt: 1, items: [
    { id: 'sample-1', category: 'login' as const, title: 'Old demonstration', password: 'synthetic example secret', createdAt: 1, updatedAt: 1 },
    { id: 'real-record', category: 'login' as const, title: 'Real record to keep', password: 'synthetic real secret', createdAt: 1, updatedAt: 1 },
  ], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark' as const, showPasswordStrength: true } };
  const password = 'synthetic test password';
  const payload = await encryptVault(initial, password);
  window.electronAPI!.loadVault = async () => ({ success: true, data: JSON.stringify(payload) });
  let written: string | undefined;
  window.electronAPI!.saveVault = vi.fn(async value => { written = value; return { success: true }; });
  render(<App />);
  await screen.findByRole('heading', { name: 'Desbloquear Aegis Vault' });
  fireEvent.change(screen.getByLabelText('Contraseña maestra'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Desbloquear bóveda' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Revisar ejemplos antiguos' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Old demonstration' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mover a la papelera' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const saved = await decryptVault(JSON.parse(written!), password);
  expect(saved.items.find(item => item.id === 'sample-1')?.trashed).toBe(true);
  expect(saved.items.find(item => item.id === 'real-record')).toEqual(initial.items[1]);
  expect(saved.items).toHaveLength(2);
});

it('waits for loading before offering setup', async () => {
  let complete!: (result: { success: boolean; data: null }) => void;
  window.electronAPI!.loadVault = () => new Promise(resolve => { complete = resolve; });
  render(<App />);
  expect(screen.queryByRole('heading', { name: 'Configurar Bóveda Aegis' })).toBeNull();
  complete({ success: true, data: null });
  expect(await screen.findByRole('heading', { name: 'Configurar Bóveda Aegis' })).toBeTruthy();
});

it.each([
  { success: false, error: 'No se pudo leer el archivo' },
  { success: true, data: '{corrupt-json' },
])('never replaces unreadable existing data with a setup wizard: %j', async result => {
  window.electronAPI!.loadVault = async () => result;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'No se pudo abrir la bóveda' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Configurar Bóveda Aegis' })).toBeNull();
  expect(window.electronAPI!.saveVault).not.toHaveBeenCalled();
});

it('stays in setup when disk rejects the write, and can retry successfully', async () => {
  let content: string | null = null;
  const save = vi.fn(async (value: string) => { content = value; return { success: true }; });
  save.mockImplementationOnce(async () => ({ success: false, error: 'disk full' }));
  window.electronAPI!.saveVault = save;
  render(<App />);
  await screen.findByRole('heading', { name: 'Configurar Bóveda Aegis' });
  fireEvent.change(screen.getByLabelText('Contraseña maestra'), { target: { value: 'synthetic test password' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'synthetic test password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear bóveda' }));
  await screen.findByText('No se pudo guardar la bóveda. Reintenta antes de agregar contraseñas.');
  expect(screen.getByRole('heading', { name: 'Configurar Bóveda Aegis' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Crear bóveda' }));
  await screen.findByRole('button', { name: 'Nuevo elemento' });
  expect(content).toBeTruthy();
  const created = await decryptVault(JSON.parse(content!), 'synthetic test password');
  expect(created.items).toEqual([]);
  expect(await screen.findByText('Tu bóveda está vacía')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Revisar ejemplos antiguos' })).toBeNull();
  cleanup();
  window.electronAPI!.loadVault = async () => ({ success: true, data: content });
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Desbloquear Aegis Vault' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Configurar Bóveda Aegis' })).toBeNull();
});

it('waits for the actual write acknowledgment before allowing the window to close', async () => {
  let beforeClose!: () => void;
  let finishWrite!: (result: { success: boolean }) => void;
  window.electronAPI!.onBeforeClose = callback => { beforeClose = callback; return () => {}; };
  window.electronAPI!.saveVault = vi.fn(() => new Promise(resolve => { finishWrite = resolve; }));
  render(<App />);
  await screen.findByRole('heading', { name: 'Configurar Bóveda Aegis' });
  fireEvent.change(screen.getByLabelText('Contraseña maestra'), { target: { value: 'synthetic test password' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'synthetic test password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear bóveda' }));
  await waitFor(() => expect(window.electronAPI!.saveVault).toHaveBeenCalled());
  beforeClose();
  expect(window.electronAPI!.finishClose).not.toHaveBeenCalled();
  finishWrite({ success: true });
  await waitFor(() => expect(window.electronAPI!.finishClose).toHaveBeenCalledWith(true));
});

it('removes an open editor and its plaintext fields when locking', async () => {
  const payload = await encryptVault({ version: 1, createdAt: 1, updatedAt: 1, items: [{ id: 'test', category: 'login', title: 'Private test record', password: 'synthetic-secret-value', createdAt: 1, updatedAt: 1 }], settings: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark', showPasswordStrength: true } }, 'synthetic test password');
  window.electronAPI!.loadVault = async () => ({ success: true, data: JSON.stringify(payload) });
  render(<App />);
  await screen.findByRole('heading', { name: 'Desbloquear Aegis Vault' });
  fireEvent.change(screen.getByLabelText('Contraseña maestra'), { target: { value: 'synthetic test password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Desbloquear bóveda' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Editar', exact: true }));
  expect(screen.getByDisplayValue('synthetic-secret-value')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bloquear', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Desbloquear Aegis Vault' })).toBeTruthy();
  expect(screen.queryByDisplayValue('synthetic-secret-value')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Editar Elemento' })).toBeNull();
});

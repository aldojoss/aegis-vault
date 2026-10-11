import { Capacitor, registerPlugin } from '@capacitor/core';
import type { ElectronAPI } from '../electron';

type Result = { success: boolean; error?: string };
interface NativeVault {
  loadVault(): Promise<Result & { data?: string | null }>;
  saveVault(options: { content: string }): Promise<Result>;
  resetVault(): Promise<Result>;
  exportVault(options: { content: string; defaultName?: string }): ReturnType<ElectronAPI['exportVault']>;
  importVault(): ReturnType<ElectronAPI['importVault']>;
  copyWithAutoClear(options: { text: string; clearSeconds: number }): Promise<Result>;
  getInfo(): ReturnType<ElectronAPI['getInfo']>;
  exit(): Promise<void>;
  confirmLocked(): Promise<void>;
  addListener(event: string, callback: () => void): Promise<{ remove: () => Promise<void> }>;
}
export const isAndroid = () => Capacitor.getPlatform() === 'android';
const Native = registerPlugin<NativeVault>('AegisVault');

export async function initializePlatform() {
  if (!isAndroid()) return;
  // Render only after the native bridge is available. Never silently switch
  // mobile vaults to browser localStorage on a missing or broken native plugin.
  await Native.getInfo();
  window.electronAPI = {
    loadVault: () => Native.loadVault(),
    saveVault: content => Native.saveVault({ content }),
    resetVault: () => Native.resetVault(),
    exportVault: options => Native.exportVault(options),
    importVault: () => Native.importVault(),
    copyWithAutoClear: (text, clearSeconds = 30) => Native.copyWithAutoClear({ text, clearSeconds }),
    getInfo: () => Native.getInfo(),
    confirmLocked: () => Native.confirmLocked(),
    minimize: () => {}, maximize: () => {}, close: () => { void Native.exit(); },
    isMaximized: async () => false,
    onMaximizedChange: () => () => {}, onBeforeClose: () => () => {}, finishClose: async () => {},
  };
  await Native.addListener('background', () => document.dispatchEvent(new Event('aegis:background')));
  await Native.addListener('back', () => document.dispatchEvent(new Event('aegis:back')));
}

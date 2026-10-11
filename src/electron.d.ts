export interface ElectronAPI {
  loadVault: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  saveVault: (cipherPayload: string) => Promise<{ success: boolean; error?: string }>;
  resetVault: () => Promise<{ success: boolean; error?: string }>;
  exportVault: (payload: { content: string; defaultName?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  importVault: () => Promise<{ success: boolean; content?: string; fileName?: string; canceled?: boolean; error?: string }>;
  copyWithAutoClear: (text: string, clearSeconds?: number) => Promise<{ success: boolean; error?: string }>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMax: boolean) => void) => () => void;
  onBeforeClose: (callback: () => void) => () => void;
  finishClose: (saved: boolean) => Promise<void>;
  getInfo: () => Promise<{ version: string; vaultPath: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

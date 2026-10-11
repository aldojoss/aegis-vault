import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  VaultData, VaultItem, EncryptedVaultPayload, VaultSettings, ItemCategory
} from './types/vault';
import { decryptVault, verifyMasterPassword, isEncryptedVaultPayload } from './utils/crypto';
import { createVaultWriter } from './utils/persistence';

// Components
import { TitleBar } from './components/TitleBar';
import { MasterPasswordModal } from './components/MasterPasswordModal';
import { VaultItemCard } from './components/VaultItemCard';
import { VaultItemDetail } from './components/VaultItemDetail';
import { ItemEditorModal } from './components/ItemEditorModal';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { SettingsModal } from './components/SettingsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LegacyDemoReview } from './components/LegacyDemoReview';
import { ImportVaultModal } from './components/ImportVaultModal';
import { mergeImportedItems } from './utils/import-vault';
import { Toast, ToastMessage } from './components/Toast';

// Icons
import {
  Plus, Search, Shield, ShieldAlert, Key, Globe, CreditCard,
  FileText, UserCheck, Server, Star, Trash2, Settings, Lock,
  Wand2, ChevronDown, CheckCircle2, ArrowUpDown, Menu, ArrowLeft
} from 'lucide-react';
import { evaluatePasswordStrength } from './utils/strength';

const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  theme: 'dark',
  showPasswordStrength: true,
};

export const App: React.FC = () => {
  // Vault state
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedVaultPayload | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(true);
  const unlockedRef = useRef(false);
  const sessionEpochRef = useRef(0);
  const foregroundRef = useRef(true);
  const [biometric, setBiometric] = useState<{ available: boolean; enabled: boolean; reason?: string } | null>(null);
  const writerRef = useRef<ReturnType<typeof createVaultWriter> | null>(null);
  if (!writerRef.current) writerRef.current = createVaultWriter(async (content) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.saveVault(content);
      if (!result.success) throw new Error(result.error || 'No se pudo escribir la bóveda.');
    } else localStorage.setItem('aegis_vault_browser_fallback', content);
  });

  // UI Navigation state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'title-asc' | 'date-desc' | 'strength-asc'>('title-asc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(() => window.innerWidth < 800);
  const [pendingImport, setPendingImport] = useState<{ content: string; fileName: string } | null>(null);
  useEffect(() => {
    const resize = () => setIsPhone(window.innerWidth < 800);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Modals
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const refreshBiometric = async () => {
    try { const result = await window.electronAPI?.biometricStatus?.(); if (result) setBiometric(result); }
    catch { setBiometric(null); }
  };
  useEffect(() => { void refreshBiometric(); }, [isLocked, isSettingsOpen, isFirstTime]);

  // Toast feedback & quick copy
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [quickCopiedId, setQuickCopiedId] = useState<string | null>(null);

  // Inactivity Auto-Lock ref
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show Toast Helper
  const showToast = (title: string, description?: string, countdownSeconds?: number, type: ToastMessage['type'] = 'success') => {
    setToast({
      id: String(Date.now()),
      title,
      description,
      countdownSeconds,
      type,
    });
  };

  // Never offer a new vault after a read error or while loading.
  useEffect(() => {
    async function initVault() {
      try {
        let content: string | null;
        if (window.electronAPI) {
          const result = await window.electronAPI.loadVault();
          if (!result.success) throw new Error(result.error || 'No se pudo leer la bóveda.');
          content = result.data ?? null;
        } else {
          if (location.protocol === 'file:') throw new Error('No se pudo conectar con el almacenamiento de escritorio. Reinicia la aplicación; tus archivos no se han modificado.');
          content = localStorage.getItem('aegis_vault_browser_fallback');
        }
        if (content !== null) {
          const parsed: unknown = JSON.parse(content);
          if (!isEncryptedVaultPayload(parsed)) throw new Error('La bóveda está dañada o no es compatible. Conserva el archivo y recupera una copia de respaldo.');
          setEncryptedPayload(parsed);
          setIsFirstTime(false);
        } else setIsFirstTime(true);
      } catch (error) {
        setStartupError(error instanceof Error ? error.message : 'No se pudo cargar la bóveda.');
      } finally {
        setIsInitializing(false);
      }
    }
    initVault();
  }, []);

  useEffect(() => window.electronAPI?.onBeforeClose(async () => {
    try { await writerRef.current!.flush(); } catch { savedRef.current = false; }
    await window.electronAPI?.finishClose(savedRef.current);
  }), []);

  const persistVault = async (data: VaultData, pass: string) => {
    setPendingSaves((count) => count + 1);
    savedRef.current = false;
    try {
      const encrypted = await writerRef.current!.save(data, pass);
      setEncryptedPayload(encrypted);
      setSaveError(null);
      savedRef.current = true;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la bóveda.';
      setSaveError(message);
      showToast('No se guardaron los cambios', message, undefined, 'error');
      return false;
    } finally {
      setPendingSaves((count) => count - 1);
    }
  };

  // 3. Activity tracker for Auto-Lock
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (isLocked || !vaultData) return;

    const timeoutMinutes = vaultData.settings.autoLockMinutes;
    if (timeoutMinutes > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        handleLockVault();
        showToast('Bóveda Bloqueada', 'Bloqueada automáticamente por inactividad', undefined, 'info');
      }, timeoutMinutes * 60 * 1000);
    }
  };

  useEffect(() => {
    const handleUserActivity = () => resetInactivityTimer();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isLocked, vaultData]);

  // Unlock Vault
  const handleUnlock = async (passwordInput: string): Promise<boolean> => {
    if (!encryptedPayload) return false;
    const epoch = sessionEpochRef.current;

    try {
      const decrypted = await decryptVault(encryptedPayload, passwordInput);
      if (epoch !== sessionEpochRef.current || !foregroundRef.current) return false;
      setVaultData(decrypted);
      setMasterPassword(passwordInput);
      unlockedRef.current = true;
      setIsLocked(false);
      // Select first item if available
      if (decrypted.items.length > 0 && !selectedItemId && !isPhone) {
        setSelectedItemId(decrypted.items[0].id);
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleBiometricUnlock = async () => {
    const epoch = sessionEpochRef.current;
    const result = await window.electronAPI?.unlockBiometric?.();
    if (!result || result.canceled || epoch !== sessionEpochRef.current || !foregroundRef.current) return false;
    if (!result.success || !result.password) {
      await refreshBiometric();
      throw new Error(result.error || 'No se pudo usar la huella. Usa tu contraseña maestra.');
    }
    if (await handleUnlock(result.password)) return true;
    if (epoch !== sessionEpochRef.current || !foregroundRef.current) return false;
    await window.electronAPI?.disableBiometric?.();
    await refreshBiometric();
    throw new Error('La huella necesita activarse de nuevo. Entra con tu contraseña maestra y actívala en Configuración.');
  };

  const handleToggleBiometric = async () => {
    if (!masterPassword || !unlockedRef.current) return;
    try {
      const result = biometric?.enabled
        ? await window.electronAPI?.disableBiometric?.()
        : await window.electronAPI?.enableBiometric?.(masterPassword);
      await refreshBiometric();
      if (result && 'canceled' in result && result.canceled) return;
      if (!unlockedRef.current) return;
      if (!result?.success) { showToast('No se pudo configurar la huella', result?.error, undefined, 'error'); return; }
      showToast(biometric?.enabled ? 'Huella desactivada' : 'Huella activada', 'Tu contraseña maestra sigue disponible.');
    } catch { if (unlockedRef.current) showToast('No se pudo configurar la huella', 'Reintenta desde Configuración.', undefined, 'error'); }
  };

  // Create First-Time Vault
  const handleCreateVault = async (passwordInput: string) => {
    const epoch = sessionEpochRef.current;
    const newVault: VaultData = {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      settings: DEFAULT_SETTINGS,
    };

    if (!await persistVault(newVault, passwordInput)) throw new Error('No se pudo guardar la bóveda. Reintenta antes de agregar contraseñas.');
    setIsFirstTime(false);
    if (epoch !== sessionEpochRef.current || !foregroundRef.current) return;
    setVaultData(newVault);
    setMasterPassword(passwordInput);
    unlockedRef.current = true;
    setIsLocked(false);
    setIsFirstTime(false);
    if (newVault.items.length > 0) {
      setSelectedItemId(newVault.items[0].id);
    }
    showToast('Bóveda Creada', 'Tus datos están protegidos con cifrado AES-256-GCM');
  };

  // Lock Vault
  const handleLockVault = () => {
    sessionEpochRef.current += 1;
    unlockedRef.current = false;
    setIsItemEditorOpen(false);
    setEditingItem(null);
    setIsGeneratorOpen(false);
    setIsAuditOpen(false);
    setIsSettingsOpen(false);
    setIsChangePasswordOpen(false);
    setSearchQuery('');
    setPendingImport(null);
    setSidebarOpen(false);
    setToast(null);
    setVaultData(null);
    setMasterPassword(null);
    setIsLocked(true);
    setSelectedItemId(null);
  };

  useEffect(() => {
    const background = () => {
      foregroundRef.current = false;
      flushSync(() => handleLockVault());
      void window.electronAPI?.confirmLocked?.();
    };
    const foreground = () => { foregroundRef.current = true; void refreshBiometric(); };
    const back = () => {
      if (isItemEditorOpen) { setIsItemEditorOpen(false); setEditingItem(null); }
      else if (pendingImport) setPendingImport(null);
      else if (isGeneratorOpen) setIsGeneratorOpen(false);
      else if (isAuditOpen) setIsAuditOpen(false);
      else if (isSettingsOpen) setIsSettingsOpen(false);
      else if (isChangePasswordOpen) setIsChangePasswordOpen(false);
      else if (sidebarOpen) setSidebarOpen(false);
      else if (selectedItemId) setSelectedItemId(null);
      else if (!isLocked) handleLockVault();
      else window.electronAPI?.close();
    };
    document.addEventListener('aegis:background', background);
    document.addEventListener('aegis:foreground', foreground);
    document.addEventListener('aegis:back', back);
    return () => { document.removeEventListener('aegis:background', background); document.removeEventListener('aegis:foreground', foreground); document.removeEventListener('aegis:back', back); };
  }, [isLocked, sidebarOpen, selectedItemId, pendingImport, isItemEditorOpen, isGeneratorOpen, isAuditOpen, isSettingsOpen, isChangePasswordOpen]);

  // Reset Vault (Erase and recreate)
  const handleResetVault = async () => {
    sessionEpochRef.current += 1;
    if (window.electronAPI) {
      const result = await window.electronAPI.resetVault();
      if (!result.success) { showToast('No se pudo reiniciar', result.error, undefined, 'error'); return; }
    } else {
      localStorage.removeItem('aegis_vault_browser_fallback');
    }
    setEncryptedPayload(null);
    await refreshBiometric();
    unlockedRef.current = false;
    setVaultData(null);
    setMasterPassword(null);
    setIsFirstTime(true);
    setIsLocked(true);
    showToast('Bóveda Reiniciada', 'Puedes configurar una nueva contraseña maestra', undefined, 'info');
  };

  // Clipboard copy with auto-clear
  const handleCopyText = async (text: string, label: string) => {
    const seconds = vaultData?.settings.clipboardClearSeconds ?? 30;

    if (window.electronAPI) {
      const result = await window.electronAPI.copyWithAutoClear(text, seconds);
      if (!result.success) { showToast('No se pudo copiar', result.error, undefined, 'error'); return; }
    } else {
      await navigator.clipboard.writeText(text);
      if (seconds > 0) {
        setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {}
        }, seconds * 1000);
      }
    }

    showToast(
      label,
      seconds > 0 ? `Portapapeles protegido: se limpiará automáticamente en ${seconds}s` : undefined,
      seconds > 0 ? seconds : undefined
    );
  };

  // Quick Copy in Card
  const handleQuickCopy = (e: React.MouseEvent, text: string, type: 'user' | 'pass', itemId: string) => {
    e.stopPropagation();
    const key = `${type}-${itemId}`;
    setQuickCopiedId(key);
    setTimeout(() => setQuickCopiedId(null), 1500);
    handleCopyText(text, type === 'user' ? 'Usuario copiado' : 'Contraseña copiada');
  };

  // Toggle Favorite
  const handleToggleFavorite = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!vaultData || !masterPassword) return;

    const updatedItems = vaultData.items.map((item) =>
      item.id === itemId ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item
    );

    const updatedVault = { ...vaultData, items: updatedItems, updatedAt: Date.now() };
    if (!await persistVault(updatedVault, masterPassword)) return;
    if (!unlockedRef.current) return;
    setVaultData(updatedVault);
  };

  // Trashing / Deleting Item
  const handleDeleteItem = async (itemId: string) => {
    if (!vaultData || !masterPassword) return;

    const item = vaultData.items.find((i) => i.id === itemId);
    if (!item) return;

    let updatedItems: VaultItem[];
    if (item.trashed) {
      // Permanent delete
      updatedItems = vaultData.items.filter((i) => i.id !== itemId);
    } else {
      // Move to trash
      updatedItems = vaultData.items.map((i) =>
        i.id === itemId ? { ...i, trashed: true, updatedAt: Date.now() } : i
      );
    }

    const updatedVault = { ...vaultData, items: updatedItems, updatedAt: Date.now() };
    if (!await persistVault(updatedVault, masterPassword)) return;
    if (!unlockedRef.current) return;
    setVaultData(updatedVault);

    if (selectedItemId === itemId) {
      setSelectedItemId(updatedItems.length > 0 ? updatedItems[0].id : null);
    }
  };

  // Save / Update Item
  const handleTrashLegacyExamples = async (ids: string[]) => {
    if (!vaultData || !masterPassword) return false;
    const now = Date.now();
    const updatedVault = { ...vaultData, updatedAt: now, items: vaultData.items.map(item =>
      ids.includes(item.id) && /^sample-[1-7]$/.test(item.id) && !item.trashed
        ? { ...item, trashed: true, updatedAt: now } : item
    ) };
    if (!await persistVault(updatedVault, masterPassword)) return false;
    if (!unlockedRef.current) return false;
    setVaultData(updatedVault);
    if (selectedItemId && ids.includes(selectedItemId)) setSelectedItemId(null);
    return true;
  };

  const handleSaveItem = async (itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vaultData || !masterPassword) return;

    let updatedItems: VaultItem[];
    let newSelectedId: string;

    if (editingItem) {
      // Update
      const oldHistory = editingItem.passwordHistory || [];
      const hasPasswordChanged = editingItem.password && itemData.password && editingItem.password !== itemData.password;
      const newHistory = hasPasswordChanged
        ? [{ password: editingItem.password!, changedAt: Date.now() }, ...oldHistory].slice(0, 5)
        : oldHistory;

      updatedItems = vaultData.items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              ...itemData,
              passwordHistory: newHistory,
              updatedAt: Date.now(),
            }
          : i
      );
      newSelectedId = editingItem.id;
    } else {
      // Create new
      const newItem: VaultItem = {
        ...itemData,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trashed: false,
      };
      updatedItems = [newItem, ...vaultData.items];
      newSelectedId = newItem.id;
    }

    const updatedVault = { ...vaultData, items: updatedItems, updatedAt: Date.now() };
    if (!await persistVault(updatedVault, masterPassword)) throw new Error('No se pudo guardar. Tus campos siguen aquí para reintentar.');
    if (!unlockedRef.current) return;
    setVaultData(updatedVault);
    showToast('Registro guardado', itemData.title);
    setSelectedItemId(newSelectedId);
    setIsItemEditorOpen(false);
    setEditingItem(null);
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: VaultSettings) => {
    if (!vaultData || !masterPassword) return;
    const updatedVault = { ...vaultData, settings: newSettings, updatedAt: Date.now() };
    if (!await persistVault(updatedVault, masterPassword)) return;
    if (!unlockedRef.current) return;
    setVaultData(updatedVault);
    showToast('Configuración Guardada', 'Preferencias actualizadas');
  };

  // Export Encrypted Backup
  const handleExportEncrypted = async () => {
    try { await writerRef.current!.flush(); } catch { return; }
    if (!encryptedPayload) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultName = `aegis-vault-backup-${dateStr}.aegis`;
    const payloadString = JSON.stringify(encryptedPayload, null, 2);

    if (window.electronAPI) {
      const res = await window.electronAPI.exportVault({ content: payloadString, defaultName });
      if (res.success && !res.canceled) {
        showToast('Respaldo Cifrado Exportado', 'Archivo guardado con éxito');
      } else if (!res.success) {
        showToast('No se pudo exportar', res.error, undefined, 'error');
      }
    } else {
      // Browser download fallback
      const blob = new Blob([payloadString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Respaldo Descargado', defaultName);
    }
  };

  // Export Decrypted JSON
  const handleExportDecrypted = async () => {
    if (!vaultData) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultName = `aegis-plain-backup-${dateStr}.json`;
    const jsonString = JSON.stringify(vaultData, null, 2);

    if (window.electronAPI) {
      const res = await window.electronAPI.exportVault({ content: jsonString, defaultName });
      if (res.success && !res.canceled) {
        showToast('Exportación Completada', 'Copia JSON sin cifrar guardada', undefined, 'warning');
      } else if (!res.success) {
        showToast('No se pudo exportar', res.error, undefined, 'error');
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Archivo Descargado', defaultName, undefined, 'warning');
    }
  };

  // Import Backup or JSON / CSV
  const handleImportFile = async () => {
    if (!vaultData || !masterPassword) return;

    if (window.electronAPI) {
      const res = await window.electronAPI.importVault();
      if (!unlockedRef.current || res.canceled) return;
      if (!res.success || !res.content) { showToast('No se pudo importar', res.error, undefined, 'error'); return; }
      setIsSettingsOpen(false);
      setPendingImport({ content: res.content, fileName: res.fileName || 'Copia de Aegis' });
    } else {
      showToast('Importación disponible en la aplicación instalada', undefined, undefined, 'info');
    }
  };

  const handleImportVault = async (imported: VaultData) => {
    if (!vaultData || !masterPassword || !unlockedRef.current) return false;
    const items = mergeImportedItems(vaultData.items, imported.items);
    const updatedVault = { ...vaultData, items, updatedAt: Date.now() };
    if (!await persistVault(updatedVault, masterPassword) || !unlockedRef.current) return false;
    setVaultData(updatedVault);
    setPendingImport(null);
    showToast('Copia importada', `${items.length - vaultData.items.length} registros nuevos`);
    return true;
  };

  // Change Master Password
  const handleChangeMasterPassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    if (!encryptedPayload || !vaultData) return false;

    // Verify current
    const isOk = await verifyMasterPassword(encryptedPayload, currentPass);
    if (!isOk) return false;

    // Re-encrypt
    // Remove the old wrapped credential before changing the vault password.
    if (window.electronAPI?.disableBiometric) {
      const result = await window.electronAPI.disableBiometric();
      if (!result.success) throw new Error('No se pudo desactivar la huella. Reintenta antes de cambiar la contraseña.');
      await refreshBiometric();
    }
    if (!await persistVault(vaultData, newPass)) throw new Error('No se pudo guardar la nueva contraseña. La contraseña anterior sigue vigente.');
    if (unlockedRef.current) setMasterPassword(newPass);
    showToast('Contraseña Maestra Actualizada', 'Toda tu bóveda ha sido re-cifrada con la nueva clave');
    return true;
  };

  // Filtered & Sorted Vault Items
  const filteredItems = useMemo(() => {
    if (!vaultData) return [];

    let list = vaultData.items.filter((item) => {
      // Trash filter
      if (filterCategory === 'trash') {
        return item.trashed;
      }
      if (item.trashed) return false;

      // Category filter
      if (filterCategory === 'favorites') return item.favorite;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;

      return true;
    });

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        (i.username && i.username.toLowerCase().includes(q)) ||
        (i.url && i.url.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    // Sort order
    return list.sort((a, b) => {
      if (sortOrder === 'title-asc') return a.title.localeCompare(b.title);
      if (sortOrder === 'date-desc') return b.updatedAt - a.updatedAt;
      if (sortOrder === 'strength-asc') {
        const strA = a.password ? evaluatePasswordStrength(a.password).entropy : 0;
        const strB = b.password ? evaluatePasswordStrength(b.password).entropy : 0;
        return strA - strB;
      }
      return 0;
    });
  }, [vaultData, filterCategory, searchQuery, sortOrder]);

  const selectedItem = useMemo(() => {
    if (!vaultData || !selectedItemId) return null;
    return vaultData.items.find((i) => i.id === selectedItemId) || null;
  }, [vaultData, selectedItemId]);

  // Counts for category badges
  const categoryCounts = useMemo(() => {
    if (!vaultData) return { all: 0, login: 0, card: 0, note: 0, identity: 0, server: 0, favorites: 0, trash: 0 };
    const nonTrash = vaultData.items.filter((i) => !i.trashed);
    return {
      all: nonTrash.length,
      login: nonTrash.filter((i) => i.category === 'login').length,
      card: nonTrash.filter((i) => i.category === 'card').length,
      note: nonTrash.filter((i) => i.category === 'note').length,
      identity: nonTrash.filter((i) => i.category === 'identity').length,
      server: nonTrash.filter((i) => i.category === 'server').length,
      favorites: nonTrash.filter((i) => i.favorite).length,
      trash: vaultData.items.filter((i) => i.trashed).length,
    };
  }, [vaultData]);

  // Mini health calculation
  const healthPercent = useMemo(() => {
    if (!vaultData) return 100;
    const withPass = vaultData.items.filter((i) => !i.trashed && i.password);
    if (withPass.length === 0) return 100;
    const weak = withPass.filter((i) => evaluatePasswordStrength(i.password!).score <= 1).length;
    return Math.max(0, Math.round(100 - (weak / withPass.length) * 50));
  }, [vaultData]);

  return (
    <div data-view={isPhone && selectedItemId ? 'detail' : 'list'} className="app-shell h-screen w-screen flex flex-col bg-[#191a1c] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Custom Frameless Window TitleBar */}
      <TitleBar
        isLocked={isLocked}
        onLockClick={handleLockVault}
        vaultItemCount={categoryCounts.all}
      />

      {/* 2. Main Content Layout */}
      {!isLocked && <div className="mobile-toolbar items-center justify-between gap-3 px-4 py-2 border-b border-stone-800">
        <button className="flex gap-2 items-center text-sm" onClick={() => selectedItemId ? setSelectedItemId(null) : setSidebarOpen(!sidebarOpen)} aria-label={selectedItemId ? 'Volver a la lista' : 'Abrir menú'}>{selectedItemId ? <ArrowLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}<span>{selectedItemId ? 'Mis registros' : 'Mi bóveda'}</span></button>
        <button className="primary-action p-2" aria-label="Añadir registro" onClick={() => { setEditingItem(null); setIsItemEditorOpen(true); }}><Plus className="w-5 h-5" /></button>
      </div>}
      {!isLocked && vaultData && <LegacyDemoReview items={vaultData.items} onMoveToTrash={handleTrashLegacyExamples} />}
      {sidebarOpen && !isLocked && <button className="sidebar-dismiss" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      {!isLocked && <div className={`flex-1 flex overflow-hidden ${pendingSaves ? "pointer-events-none" : ""}`} aria-busy={pendingSaves > 0}>
        {/* Left Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''} w-56 bg-[#202124] border-r border-[#323438] flex flex-col shrink-0 select-none`} onClick={event => { if ((event.target as HTMLElement).closest('button')) setSidebarOpen(false); }}>
          {/* New Item Primary Button */}
          <div className="p-3.5 border-b border-[#323438]">
            <button
              onClick={() => {
                setEditingItem(null);
                setIsItemEditorOpen(true);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg primary-action text-slate-950 font-semibold text-xs  transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo elemento</span>
            </button>
          </div>

          {/* Navigation Categories */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Categorías
            </div>

            <button
              onClick={() => setFilterCategory('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'all'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Key className="w-4 h-4 text-stone-300" />
                <span>Todos los elementos</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.all}</span>
            </button>

            <button
              onClick={() => setFilterCategory('login')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'login'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Globe className="w-4 h-4 text-stone-300" />
                <span>Inicios de Sesión</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.login}</span>
            </button>

            <button
              onClick={() => setFilterCategory('card')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'card'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Tarjetas Bancarias</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.card}</span>
            </button>

            <button
              onClick={() => setFilterCategory('note')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'note'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Notas Seguras</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.note}</span>
            </button>

            <button
              onClick={() => setFilterCategory('server')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'server'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Server className="w-4 h-4 text-stone-400" />
                <span>Servidores / SSH</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.server}</span>
            </button>

            <div className="pt-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Colecciones
            </div>

            <button
              onClick={() => setFilterCategory('favorites')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'favorites'
                  ? 'bg-stone-700/40 text-stone-200 font-semibold border border-stone-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Favoritos</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.favorites}</span>
            </button>

            <button
              onClick={() => setFilterCategory('trash')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                filterCategory === 'trash'
                  ? 'bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#292b2d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Papelera</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{categoryCounts.trash}</span>
            </button>

            {/* Tools Section */}
            <div className="pt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Herramientas
            </div>

            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#292b2d] transition"
            >
              <div className="flex items-center space-x-2.5">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span>Generador de Claves</span>
              </div>
            </button>

            <button
              onClick={() => setIsAuditOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#292b2d] transition"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Auditoría de Bóveda</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono border border-slate-700">
                {healthPercent}%
              </span>
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#323438] flex items-center justify-between">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleLockVault}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bloquear</span>
            </button>
          </div>
        </aside>

        {/* Middle Column: Items List */}
        <section className="app-list w-80 bg-[#1b1c1f] border-r border-[#323438] flex flex-col shrink-0">
          {/* Search & Sort Bar */}
          <div className="p-3.5 border-b border-[#323438] space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar contraseñas, usuarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#242529] border border-[#383a3e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-stone-400 transition"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>{filteredItems.length} {filteredItems.length === 1 ? 'registro' : 'registros'}</span>
              <div className="flex items-center space-x-1">
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="title-asc" className="bg-[#242529]">Nombre (A-Z)</option>
                  <option value="date-desc" className="bg-[#242529]">Recientes</option>
                  <option value="strength-asc" className="bg-[#242529]">Seguridad</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Search className="w-8 h-8 mb-2 stroke-1" />
                <p className="text-xs font-medium">{categoryCounts.all === 0 && filterCategory === 'all' && !searchQuery ? 'Tu bóveda está vacía' : 'No hay resultados'}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Añade un elemento o prueba otra búsqueda.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <VaultItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => setSelectedItemId(item.id)}
                  onToggleFavorite={(e) => handleToggleFavorite(e, item.id)}
                  onQuickCopyPassword={(e, pass) => handleQuickCopy(e, pass, 'pass', item.id)}
                  onQuickCopyUsername={(e, usr) => handleQuickCopy(e, usr, 'user', item.id)}
                  copiedId={quickCopiedId}
                />
              ))
            )}
          </div>
        </section>

        {/* Right Column: Item Inspection Pane */}
        <main className="app-detail flex-1 bg-[#191a1c] flex flex-col overflow-hidden">
          <VaultItemDetail
            key={selectedItem?.id || 'empty'}
            item={selectedItem}
            onEdit={() => {
              if (selectedItem) {
                setEditingItem(selectedItem);
                setIsItemEditorOpen(true);
              }
            }}
            onDelete={() => {
              if (selectedItem) {
                handleDeleteItem(selectedItem.id);
              }
            }}
            onToggleFavorite={() => {
              if (selectedItem) {
                handleToggleFavorite({ stopPropagation: () => {} } as any, selectedItem.id);
              }
            }}
            onCopy={(text, label) => handleCopyText(text, label)}
          />
        </main>
      </div>}

      {/* 3. Unlock or Setup Master Password Modal */}
      {isLocked && !isInitializing && !startupError && (
        <MasterPasswordModal
          isFirstTime={isFirstTime}
          onUnlock={handleUnlock}
          onCreateVault={handleCreateVault}
          onResetVault={handleResetVault}
          onBiometricUnlock={biometric?.enabled && biometric.available ? handleBiometricUnlock : undefined}
        />
      )}

      {/* 4. Item Editor Modal (Create / Edit) */}
      {pendingImport && !isLocked && <ImportVaultModal content={pendingImport.content} fileName={pendingImport.fileName} onClose={() => setPendingImport(null)} onImport={handleImportVault} />}
      {isItemEditorOpen && (
        <ItemEditorModal
          itemToEdit={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setIsItemEditorOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* 5. Advanced Password Generator Modal */}
      {isGeneratorOpen && (
        <PasswordGeneratorModal
          onClose={() => setIsGeneratorOpen(false)}
          onCopy={(pwd) => handleCopyText(pwd, 'Contraseña generada copiada')}
        />
      )}

      {/* 6. Security Health Audit Modal */}
      {isAuditOpen && vaultData && (
        <SecurityAuditModal
          items={vaultData.items}
          onClose={() => setIsAuditOpen(false)}
          onSelectItem={(item) => {
            setSelectedItemId(item.id);
            setEditingItem(item);
            setIsItemEditorOpen(true);
          }}
        />
      )}

      {/* 7. Settings Modal */}
      {isSettingsOpen && vaultData && (
        <SettingsModal
          settings={vaultData.settings}
          onUpdateSettings={handleUpdateSettings}
          onExportEncrypted={handleExportEncrypted}
          onExportDecrypted={handleExportDecrypted}
          onImportFile={handleImportFile}
          onChangeMasterPassword={() => {
            setIsSettingsOpen(false);
            setIsChangePasswordOpen(true);
          }}
          onClose={() => setIsSettingsOpen(false)}
          biometric={biometric}
          onToggleBiometric={handleToggleBiometric}
        />
      )}

      {/* 8. Change Master Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          onConfirm={handleChangeMasterPassword}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {(isInitializing || startupError) && <div className="flex-1 flex items-center justify-center p-8"><div className="max-w-md text-center space-y-4"><Shield className="w-8 h-8 mx-auto text-stone-400" /><h2 className="text-lg text-stone-100">{isInitializing ? 'Abriendo tu bóveda…' : 'No se pudo abrir la bóveda'}</h2>{startupError && <><p role="alert" className="text-sm text-stone-400">{startupError}</p><p className="text-xs text-stone-500">Tus archivos se conservan. No crees una bóveda nueva para solucionar este error.</p><button onClick={() => location.reload()} className="primary-action px-4 py-2">Reintentar</button></>}</div></div>}
      {!isLocked && <footer className="vault-status flex items-center justify-between px-5 py-2 text-xs border-t border-stone-800"><span>{pendingSaves ? 'Guardando cambios…' : saveError ? 'Último cambio sin guardar. Reintenta la operación.' : 'Todos los cambios guardados'}</span><span>Almacenamiento local · Bóveda cifrada</span></footer>}
      {!isLocked && <nav aria-label="Navegación principal" className="mobile-navigation">
        <button aria-label="Ver bóveda" aria-current={!isGeneratorOpen && !isAuditOpen && !isSettingsOpen ? 'page' : undefined} disabled={pendingSaves > 0} onClick={() => { setSelectedItemId(null); setSidebarOpen(false); }}><Key className="w-5 h-5" /><span>Bóveda</span></button>
        <button aria-label="Abrir generador" disabled={pendingSaves > 0} onClick={() => setIsGeneratorOpen(true)}><Wand2 className="w-5 h-5" /><span>Generar</span></button>
        <button aria-label="Revisar seguridad" disabled={pendingSaves > 0} onClick={() => setIsAuditOpen(true)}><Shield className="w-5 h-5" /><span>Seguridad</span></button>
        <button aria-label="Abrir ajustes" disabled={pendingSaves > 0} onClick={() => setIsSettingsOpen(true)}><Settings className="w-5 h-5" /><span>Ajustes</span></button>
      </nav>}
      {/* 9. Toast Notification Pill */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
export default App;

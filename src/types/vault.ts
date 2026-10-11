export type ItemCategory = 'login' | 'card' | 'note' | 'identity' | 'server';

export interface VaultItem {
  id: string;
  category: ItemCategory;
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  favorite?: boolean;
  trashed?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;

  // Credit card specific fields
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardPin?: string;

  // Identity specific fields
  fullName?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  address?: string;

  // Server / SSH fields
  host?: string;
  port?: string;
  privateKey?: string;

  // Extra custom fields
  customFields?: Array<{
    id: string;
    label: string;
    value: string;
    isSecret: boolean;
  }>;

  // Password history
  passwordHistory?: Array<{
    password: string;
    changedAt: number;
  }>;
}

export interface VaultData {
  version: number;
  createdAt: number;
  updatedAt: number;
  items: VaultItem[];
  categories?: string[];
  settings: VaultSettings;
}

export interface VaultSettings {
  autoLockMinutes: number; // 0 for never, or 1, 5, 15, 30, 60
  clipboardClearSeconds: number; // 15, 30, 60, 0
  theme: 'dark' | 'midnight' | 'cyber';
  showPasswordStrength: boolean;
  auditDismissedIds?: string[];
}

export interface EncryptedVaultPayload {
  version: number;
  salt: string; // Base64 PBKDF2 salt
  iv: string;   // Base64 AES-GCM IV
  cipherText: string; // Base64 encrypted payload
  iterations?: number; // Version 2 uses 600,000 PBKDF2-HMAC-SHA-256 rounds
  testHash?: string; // Legacy version 1 only; ignored during password verification
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean; // e.g. l, 1, I, O, 0
  mode: 'password' | 'passphrase' | 'pin';
  wordCount?: number;
  separator?: string;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 0=Muy Débil, 1=Débil, 2=Aceptable, 3=Fuerte, 4=Excelente
  label: string;
  entropy: number;
  feedback: string[];
  color: string;
  percent: number;
}

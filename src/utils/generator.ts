import { PasswordGeneratorOptions } from '../types/vault';
import WORDLIST from '../data/eff-wordlist.json';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const AMBIGUOUS = /[l1IO0]/g;


export function generatePassword(options: PasswordGeneratorOptions): string {
  if (options.mode === 'pin') {
    const len = Math.max(4, Math.min(12, options.length));
    return getRandomCharacters(NUMBERS, len);
  }

  if (options.mode === 'passphrase') {
    const count = Math.max(6, Math.min(10, Math.floor(options.wordCount || 6)));
    const sep = options.separator || '-';
    const words: string[] = [];

    for (let i = 0; i < count; i++) {
      const idx = randomIndex(WORDLIST.length);
      words.push(WORDLIST[idx]);
    }
    return words.join(sep);
  }

  let charset = '';
  const mandatoryChars: string[] = [];

  if (options.uppercase) {
    const set = options.avoidAmbiguous ? UPPERCASE.replace(AMBIGUOUS, '') : UPPERCASE;
    charset += set;
    mandatoryChars.push(getRandomCharacters(set, 1));
  }
  if (options.lowercase) {
    const set = options.avoidAmbiguous ? LOWERCASE.replace(AMBIGUOUS, '') : LOWERCASE;
    charset += set;
    mandatoryChars.push(getRandomCharacters(set, 1));
  }
  if (options.numbers) {
    const set = options.avoidAmbiguous ? NUMBERS.replace(AMBIGUOUS, '') : NUMBERS;
    charset += set;
    mandatoryChars.push(getRandomCharacters(set, 1));
  }
  if (options.symbols) {
    charset += SYMBOLS;
    mandatoryChars.push(getRandomCharacters(SYMBOLS, 1));
  }

  if (!charset) {
    charset = LOWERCASE + NUMBERS;
  }

  const remainingLength = Math.max(0, options.length - mandatoryChars.length);
  const remaining = getRandomCharacters(charset, remainingLength);

  // Combine and shuffle
  const combined = (mandatoryChars.join('') + remaining).split('');
  return shuffleArray(combined).join('');
}

function getRandomCharacters(charset: string, length: number): string {
  if (length <= 0) return '';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomIndex(charset.length)];
  }
  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomIndex(size: number): number {
  const limit = Math.floor(0x100000000 / size) * size;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % size;
}

export function passphraseEntropy(wordCount = 6): number {
  return Math.round(Math.max(6, Math.min(10, Math.floor(wordCount))) * Math.log2(WORDLIST.length));
}

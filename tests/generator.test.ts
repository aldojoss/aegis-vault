import { expect, it, vi } from 'vitest';
import { generatePassword, passphraseEntropy } from '../src/utils/generator';
import { evaluatePasswordStrength } from '../src/utils/strength';
import words from '../src/data/eff-wordlist.json';
const options = { mode: 'password' as const, length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true, avoidAmbiguous: true };

it('generates all required character categories without ambiguous characters', () => {
  const password = generatePassword(options);
  expect(password).toHaveLength(24);
  expect(password).toMatch(/[A-Z]/);
  expect(password).toMatch(/[a-z]/);
  expect(password).toMatch(/[0-9]/);
  expect(password).toMatch(/[^a-zA-Z0-9]/);
  expect(password).not.toMatch(/[l1IO0]/);
});
it('uses a complete wordlist and at least six independently selected words', () => {
  expect(new Set(words).size).toBe(7776);
  const phrase = generatePassword({ ...options, mode: 'passphrase', wordCount: 4 });
  expect(phrase.split('-')).toHaveLength(6);
  expect(phrase.split('-').every(word => words.includes(word))).toBe(true);
  expect(passphraseEntropy(6)).toBe(78);
});
it('rejects random values that would bias selection', () => {
  let calls = 0;
  const random = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
    (array as Uint32Array)[0] = calls++ === 0 ? 0xffffffff : 3;
    return array;
  });
  try {
    expect(generatePassword({ ...options, mode: 'pin', length: 4 })).toBe('3333');
    expect(calls).toBe(5);
  } finally { random.mockRestore(); }
});
it('does not label predictable passwords strong just because they are long', () => {
  expect(evaluatePasswordStrength('Password123456789!').score).toBe(1);
  expect(evaluatePasswordStrength('aaaaaaaaaaaaaaaaaaaa').score).toBe(1);
});

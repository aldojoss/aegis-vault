import { PasswordStrengthResult } from '../types/vault';

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Sin contraseña',
      entropy: 0,
      feedback: ['Introduce una contraseña'],
      color: '#64748b', // slate
      percent: 0,
    };
  }

  const length = password.length;
  let poolSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 32;

  // Bits of entropy: length * log2(poolSize)
  const entropy = Math.round(length * (poolSize > 0 ? Math.log2(poolSize) : 0));

  const feedback: string[] = [];

  if (length < 8) feedback.push('Longitud muy corta (mínimo 8 caracteres)');
  else if (length < 12) feedback.push('Recomendado al menos 12 caracteres para mayor seguridad');

  if (!hasUpper) feedback.push('Agrega letras mayúsculas');
  if (!hasLower) feedback.push('Agrega letras minúsculas');
  if (!hasNumber) feedback.push('Agrega números');
  if (!hasSymbol) feedback.push('Agrega símbolos especiales (!@#$)');

  // Check for obvious sequential patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Evita caracteres repetidos consecutivos');
  }
  if (/1234|abcd|qwer|asdf|password|1111/i.test(password)) {
    feedback.push('Evita patrones comunes o palabras predecibles');
  }

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let label = 'Muy Débil';
  let color = '#ef4444'; // red-500
  let percent = 15;

  if (entropy >= 80 && length >= 14 && hasLower && hasUpper && hasNumber && hasSymbol) {
    score = 4;
    label = 'Excelente';
    color = '#10b981'; // emerald-500
    percent = 100;
  } else if (entropy >= 60 && length >= 12) {
    score = 3;
    label = 'Fuerte';
    color = '#06b6d4'; // cyan-500
    percent = 75;
  } else if (entropy >= 40 && length >= 8) {
    score = 2;
    label = 'Aceptable';
    color = '#f59e0b'; // amber-500
    percent = 50;
  } else if (length >= 6) {
    score = 1;
    label = 'Débil';
    color = '#f97316'; // orange-500
    percent = 28;
  }

  if (/(.)\1{3,}/.test(password) || /1234|abcd|qwer|asdf|password|contrase[nñ]a/i.test(password)) {
    score = 1;
    label = 'Débil';
    color = '#c18b67';
    percent = 28;
  }

  return {
    score,
    label,
    entropy,
    feedback: feedback.slice(0, 3),
    color,
    percent,
  };
}

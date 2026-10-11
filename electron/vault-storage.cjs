const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function readVault(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.trim()) throw new Error('La bóveda está vacía o dañada. Conserva el archivo antes de recuperar una copia.');
  const payload = JSON.parse(content);
  if (![1, 2].includes(payload.version) || !payload.salt || !payload.iv || !payload.cipherText) {
    throw new Error('El archivo de bóveda está dañado o no es compatible.');
  }
  return content;
}

function saveVault(filePath, content) {
  if (typeof content !== 'string' || content.length === 0) throw new Error('No se puede guardar una bóveda vacía.');
  const payload = JSON.parse(content);
  if (![1, 2].includes(payload.version) || !payload.salt || !payload.iv || !payload.cipherText) {
    throw new Error('El contenido no es una bóveda cifrada.');
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    const descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
    try {
      fs.writeFileSync(descriptor, content, 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, `${filePath}.bak`);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

module.exports = { readVault, saveVault };

// Edge-compatible password hashing using Web Crypto API (PBKDF2)
// Replaces bcryptjs which requires Node.js crypto module

const ITERATIONS = 100000;
const HASH_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8 // bits
  );

  const saltB64 = arrayBufferToBase64(salt.buffer);
  const hashB64 = arrayBufferToBase64(hash);
  
  // Format: $pbkdf2$iterations$salt$hash
  return `$pbkdf2$${ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy bcrypt hashes (starts with $2a$ or $2b$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    // For migration: bcrypt hashes can't be verified on Edge
    // This will need a migration strategy — for now return false
    console.warn('[Auth] Legacy bcrypt hash detected. Please re-hash password.');
    return false;
  }

  const parts = storedHash.split('$');
  // Format: $pbkdf2$iterations$salt$hash → ['', 'pbkdf2', iterations, salt, hash]
  if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[2], 10);
  const salt = base64ToArrayBuffer(parts[3]);
  const expectedHash = parts[4];

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const hashB64 = arrayBufferToBase64(hash);
  return hashB64 === expectedHash;
}

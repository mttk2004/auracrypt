/**
 * Crypto Utils using native Web Crypto API
 * Implements PBKDF2 for key derivation and AES-GCM for encryption
 */

// A static salt for the demo. In production, this should be unique per user and stored in DB.
// Since the provided schema doesn't have a user_settings table, we use a constant app salt.
const APP_SALT = "AURACRYPT_WEB_APP_FIXED_SALT_V1"; 

function str2ab(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function ab2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash string using SHA-1 (Required for HIBP k-Anonymity)
 * Returns UPPERCASE Hex string
 */
export const digestSHA1 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

/**
 * Derives a CryptoKey from a text password using PBKDF2
 */
export const deriveKeyFromPassword = async (password: string): Promise<CryptoKey> => {
  const passwordBuffer = str2ab(password);
  const saltBuffer = str2ab(APP_SALT);

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable for session storage
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts text data using AES-GCM
 */
export const encryptData = async (
  plaintext: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = str2ab(plaintext);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  return {
    cipherText: arrayBufferToBase64(cipherBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

/**
 * Decrypts data using AES-GCM
 */
export const decryptData = async (
  cipherTextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> => {
  const cipherBuffer = base64ToArrayBuffer(cipherTextBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      cipherBuffer
    );
    return ab2str(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Failed to decrypt. Master password might be incorrect.");
  }
};

/**
 * Export key to string for Session Storage
 */
export const exportKeyToString = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
};

/**
 * Import key from string (Session Storage)
 */
export const importKeyFromString = async (keyStr: string): Promise<CryptoKey> => {
  const jwk = JSON.parse(keyStr);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};
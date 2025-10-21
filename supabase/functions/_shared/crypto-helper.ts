/**
 * Helper para criptografia simétrica de senhas temporárias
 * NOTA: Esta é uma implementação básica. Em produção, considere usar AES-GCM
 */

const ENCRYPTION_KEY = Deno.env.get('TEMP_PASSWORD_ENCRYPTION_KEY') || 'cotiz-temp-password-key-2025-change-in-production';

export async function encryptPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const key = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  
  // XOR simples para demo (em produção use AES-GCM via Web Crypto API)
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

export async function decryptPassword(encrypted: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ key[i % key.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

// utils/crypto.ts — Web Crypto API thật, chạy hoàn toàn trong trình duyệt

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
export const bufToHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');

export const bufToB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export const b64ToBuf = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

export const hexToBuf = (hex: string): ArrayBuffer => {
  const clean = hex.replace(/\s/g,'');
  const buf = new Uint8Array(clean.length / 2);
  for (let i = 0; i < buf.length; i++) buf[i] = parseInt(clean.slice(i*2,i*2+2),16);
  return buf.buffer;
};

export const strToBuf = (s: string) => new TextEncoder().encode(s).buffer;
export const bufToStr = (buf: ArrayBuffer) => new TextDecoder().decode(buf);

// ══════════════════════════════════════════════════════════════════
// AES-256-GCM
// ══════════════════════════════════════════════════════════════════
export interface AESEncryptResult {
  ciphertext: ArrayBuffer;   // encrypted data
  iv: Uint8Array;            // 12-byte nonce
  authTag: string;           // included in ciphertext (GCM appends 16 bytes)
  aesKeyRaw: ArrayBuffer;    // raw 256-bit key — to be encrypted by RSA
  aesKeyHex: string;         // human readable
  ivHex: string;
}

/** Sinh AES-256 key ngẫu nhiên */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt']);
}

/** Mã hóa ArrayBuffer bằng AES-256-GCM */
export async function aesEncrypt(data: ArrayBuffer, key?: CryptoKey): Promise<AESEncryptResult> {
  const aesKey = key ?? await generateAESKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    data,
  );

  const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey);

  return {
    ciphertext,
    iv,
    authTag: bufToHex(ciphertext).slice(-32), // last 16 bytes = auth tag
    aesKeyRaw,
    aesKeyHex: bufToHex(aesKeyRaw),
    ivHex: bufToHex(iv.buffer),
  };
}

/** Giải mã AES-256-GCM */
export async function aesDecrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array | ArrayBuffer,
  aesKeyRaw: ArrayBuffer,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv instanceof Uint8Array ? iv : new Uint8Array(iv), tagLength: 128 },
    key,
    ciphertext,
  );
}

// ══════════════════════════════════════════════════════════════════
// RSA-OAEP 2048
// ══════════════════════════════════════════════════════════════════
export interface RSAKeyPairResult {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyFingerprint: string;
}

/** Sinh cặp khóa RSA-OAEP 2048 */
export async function generateRsaKeyPair(keySize = 2048): Promise<RSAKeyPairResult> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: keySize, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
    true,
    ['encrypt','decrypt'],
  );

  const pubDer  = await crypto.subtle.exportKey('spki', pair.publicKey);
  const privDer = await crypto.subtle.exportKey('pkcs8', pair.privateKey);

  const pubPem  = derToPem(pubDer, 'PUBLIC KEY');
  const privPem = derToPem(privDer, 'PRIVATE KEY');

  const hashBuf = await crypto.subtle.digest('SHA-256', pubDer);
  const fingerprint = bufToHex(hashBuf).match(/.{2}/g)!.join(':').slice(0,47);

  return { publicKey: pair.publicKey, privateKey: pair.privateKey, publicKeyPem: pubPem, privateKeyPem: privPem, publicKeyFingerprint: fingerprint };
}

function derToPem(der: ArrayBuffer, label: string): string {
  const b64 = bufToB64(der).match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  return b64ToBuf(b64);
}

/** Import RSA public key từ PEM */
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki', pemToDer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['encrypt'],
  );
}

/** Import RSA private key từ PEM */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8', pemToDer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['decrypt'],
  );
}

/** Mã hóa AES key bằng RSA Public Key */
export async function rsaEncryptKey(aesKeyRaw: ArrayBuffer, publicKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, aesKeyRaw);
}

/** Giải mã AES key bằng RSA Private Key */
export async function rsaDecryptKey(encryptedKey: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedKey);
}

// ══════════════════════════════════════════════════════════════════
// INDEXEDDB — lưu private key
// ══════════════════════════════════════════════════════════════════
const DB_NAME = 'CloudSafeKeys', STORE = 'privateKeys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function storePrivateKey(keyId: string, key: CryptoKey) {
  const db = await openDB();
  return new Promise<void>((res,rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(key, keyId);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function loadPrivateKey(keyId: string): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((res,rej) => {
    const req = db.transaction(STORE,'readonly').objectStore(STORE).get(keyId);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
}

export async function deletePrivateKey(keyId: string) {
  const db = await openDB();
  return new Promise<void>((res,rej) => {
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(keyId);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ══════════════════════════════════════════════════════════════════
// HYBRID: encrypt + decrypt complete
// ══════════════════════════════════════════════════════════════════
export interface HybridEncryptResult {
  ciphertextB64: string;   // AES ciphertext (base64)
  encAesKeyB64: string;    // RSA-encrypted AES key (base64)
  ivHex: string;           // IV hex
  aesKeyHex: string;       // AES key hex (hiển thị, không lưu)
}

/** Mã hóa hoàn chỉnh: data + RSA public key → hybrid packet */
export async function hybridEncrypt(data: ArrayBuffer, publicKey: CryptoKey): Promise<HybridEncryptResult> {
  const aes = await aesEncrypt(data);
  const encAesKey = await rsaEncryptKey(aes.aesKeyRaw, publicKey);
  return {
    ciphertextB64: bufToB64(aes.ciphertext),
    encAesKeyB64: bufToB64(encAesKey),
    ivHex: aes.ivHex,
    aesKeyHex: aes.aesKeyHex,
  };
}

/** Giải mã hoàn chỉnh: hybrid packet + RSA private key → plaintext */
export async function hybridDecrypt(
  ciphertextB64: string,
  encAesKeyB64: string,
  ivHex: string,
  privateKey: CryptoKey,
): Promise<ArrayBuffer> {
  const aesKeyRaw = await rsaDecryptKey(b64ToBuf(encAesKeyB64), privateKey);
  return aesDecrypt(b64ToBuf(ciphertextB64), new Uint8Array(hexToBuf(ivHex)), aesKeyRaw);
}
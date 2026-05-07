// src/lib/crypto.js
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  if (!base64 || typeof base64 !== 'string') throw new Error('Invalid base64');
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPublicKey(base64Key) {
  return crypto.subtle.importKey("spki", base64ToBuffer(base64Key), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

export async function generateRSAKeyPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"]
  );
  const publicKey = bufferToBase64(await crypto.subtle.exportKey("spki", pair.publicKey));
  const privateKey = bufferToBase64(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return { publicKey, privateKey };
}

export async function encryptMessageForRecipient(plaintext, recipientPublicKeyBase64, senderPublicKeyBase64) {
  // Convertir le texte en UTF-8 (supporte les accents et emojis)
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(plaintext);
  
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt","decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintextBuffer);
  
  const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey);
  const recipientKey = await importPublicKey(recipientPublicKeyBase64);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientKey, aesKeyRaw);
  
  const senderKey = await importPublicKey(senderPublicKeyBase64);
  const encryptedKeyForSelf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderKey, aesKeyRaw);
  
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    encryptedKey: bufferToBase64(encryptedKey),
    encryptedKeyForSelf: bufferToBase64(encryptedKeyForSelf)
  };
}

export async function decryptMessage(payload, privateKeyBase64, isOwnMessage = false) {
  const privateKey = await crypto.subtle.importKey("pkcs8", base64ToBuffer(privateKeyBase64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  const encryptedKeyData = isOwnMessage ? payload.encryptedKeyForSelf : payload.encryptedKey;
  const aesKeyBuffer = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, base64ToBuffer(encryptedKeyData));
  const aesKey = await crypto.subtle.importKey("raw", aesKeyBuffer, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(payload.iv) },
    aesKey,
    base64ToBuffer(payload.ciphertext)
  );
  return new TextDecoder().decode(plain);
}
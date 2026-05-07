// src/lib/crypto.js
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPublicKey(base64Key) {
  return crypto.subtle.importKey("spki", base64ToArrayBuffer(base64Key), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

export async function generateRSAKeyPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"]
  );
  const publicKey = arrayBufferToBase64(await crypto.subtle.exportKey("spki", pair.publicKey));
  const privateKey = arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return { publicKey, privateKey };
}

export async function encryptMessageForRecipient(plaintext, recipientPublicKeyBase64, senderPublicKeyBase64) {
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
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    encryptedKey: arrayBufferToBase64(encryptedKey),
    encryptedKeyForSelf: arrayBufferToBase64(encryptedKeyForSelf)
  };
}

export async function decryptMessage(payload, privateKeyBase64, isOwnMessage = false) {
  const privateKey = await crypto.subtle.importKey("pkcs8", base64ToArrayBuffer(privateKeyBase64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  const encryptedKeyData = isOwnMessage ? payload.encryptedKeyForSelf : payload.encryptedKey;
  const aesKeyBuffer = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, base64ToArrayBuffer(encryptedKeyData));
  const aesKey = await crypto.subtle.importKey("raw", aesKeyBuffer, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(payload.iv) },
    aesKey,
    base64ToArrayBuffer(payload.ciphertext)
  );
  return new TextDecoder().decode(plain);
}
import { safeStorage, systemPreferences } from 'electron'

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function keychainWrap(plaintext: Buffer): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption not available on this system')
  }
  return safeStorage.encryptString(plaintext.toString('base64')).toString('base64')
}

export function keychainUnwrap(ciphertextB64: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption not available on this system')
  }
  const buf = Buffer.from(ciphertextB64, 'base64')
  const plainB64 = safeStorage.decryptString(buf)
  return Buffer.from(plainB64, 'base64')
}

export function canPromptTouchId(): boolean {
  try {
    return process.platform === 'darwin' && systemPreferences.canPromptTouchID()
  } catch {
    return false
  }
}

export async function promptTouchId(reason: string): Promise<boolean> {
  if (!canPromptTouchId()) return false
  try {
    await systemPreferences.promptTouchID(reason)
    return true
  } catch {
    return false
  }
}

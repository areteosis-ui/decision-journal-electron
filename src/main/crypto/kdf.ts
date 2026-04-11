import { hashRaw, Algorithm } from '@node-rs/argon2'
import { randomBytes } from 'node:crypto'

export interface KdfParams {
  algorithm: 'argon2id'
  memoryCost: number
  timeCost: number
  parallelism: number
  saltB64: string
}

export const DEFAULT_KDF_PARAMS = {
  memoryCost: 65536,
  timeCost: 4,
  parallelism: 2
} as const

export function newSalt(): string {
  return randomBytes(16).toString('base64')
}

export async function deriveKey(pin: string, params: KdfParams): Promise<Buffer> {
  const salt = Buffer.from(params.saltB64, 'base64')
  return hashRaw(Buffer.from(pin, 'utf8'), {
    algorithm: Algorithm.Argon2id,
    memoryCost: params.memoryCost,
    timeCost: params.timeCost,
    parallelism: params.parallelism,
    outputLen: 32,
    salt
  }) as Promise<Buffer>
}

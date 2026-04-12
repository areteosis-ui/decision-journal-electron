import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'

export interface ModelInfo {
  name: string
  label: string
  url: string
  sizeBytes: number
  sizeLabel: string
  description: string
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    name: 'tiny.en',
    label: 'Tiny',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    sizeBytes: 75_000_000,
    sizeLabel: '~75 MB',
    description: 'Fast, lightweight. Good for clear speech.'
  },
  {
    name: 'base.en',
    label: 'Base',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    sizeBytes: 142_000_000,
    sizeLabel: '~142 MB',
    description: 'Recommended. Good balance of speed and accuracy.'
  },
  {
    name: 'small.en',
    label: 'Small',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    sizeBytes: 466_000_000,
    sizeLabel: '~466 MB',
    description: 'Best accuracy. Needs at least 8 GB RAM.'
  }
]

export function modelDir(): string {
  return join(app.getPath('userData'), 'whisper')
}

export function modelPath(name: string): string {
  return join(modelDir(), `ggml-${name}.bin`)
}

export function partialPath(name: string): string {
  return join(modelDir(), `ggml-${name}.bin.part`)
}

export function isInstalled(name: string): boolean {
  return existsSync(modelPath(name))
}

export function listInstalled(): string[] {
  const dir = modelDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.startsWith('ggml-') && f.endsWith('.bin') && !f.endsWith('.bin.part'))
    .map((f) => f.replace(/^ggml-/, '').replace(/\.bin$/, ''))
}

export function getModelInfo(name: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.name === name)
}

import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

interface WhisperConfig {
  activeModel: string | null
}

function configPath(): string {
  return join(app.getPath('userData'), 'whisper', 'config.json')
}

export function loadConfig(): WhisperConfig {
  const p = configPath()
  if (!existsSync(p)) return { activeModel: null }
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return { activeModel: null }
  }
}

export function saveConfig(config: WhisperConfig): void {
  const p = configPath()
  writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8')
}

export function getActiveModel(): string | null {
  return loadConfig().activeModel
}

export function setActiveModel(name: string): void {
  saveConfig({ ...loadConfig(), activeModel: name })
}

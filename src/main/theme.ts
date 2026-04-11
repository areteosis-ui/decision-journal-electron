import { app, nativeTheme, BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { ThemeMode } from '@shared/ipc-contract'

const THEME_FILE = () => join(app.getPath('userData'), 'theme.json')

export async function loadThemePreference(): Promise<ThemeMode> {
  try {
    const raw = await fs.readFile(THEME_FILE(), 'utf8')
    const parsed = JSON.parse(raw) as { mode?: ThemeMode }
    if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system') {
      return parsed.mode
    }
  } catch {
    // ignore
  }
  return 'system'
}

export async function saveThemePreference(mode: ThemeMode): Promise<void> {
  await fs.writeFile(THEME_FILE(), JSON.stringify({ mode }), 'utf8')
}

export function applyThemeMode(mode: ThemeMode): void {
  nativeTheme.themeSource = mode
}

export function wireNativeThemeBroadcast(getWindow: () => BrowserWindow | null): void {
  nativeTheme.on('updated', () => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('theme:system-changed', nativeTheme.shouldUseDarkColors)
    }
  })
}

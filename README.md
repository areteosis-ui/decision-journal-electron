# Decision Journal

A local-first, fully offline, end-to-end encrypted decision journal for macOS. Record the decisions you make, revisit them months later to log the outcomes, and build a real picture of your own decision-making quality over time.

Inspired by [Farnam Street's decision journal](https://fs.blog/decision-journal/). Built by [Sina Meraji](https://github.com/sinameraji).

## Core promises

- **Zero network requests, ever.** The main process installs a blanket network kill-switch on the Electron session. All fonts and assets are bundled locally. There is no telemetry, no crash reporting, no auto-update.
- **Encrypted at rest.** Your journal lives in a SQLCipher-encrypted SQLite database. The database key is a random 256-bit master key that is double-wrapped: once by an Argon2id-derived key from your 6-digit PIN, and once more by the macOS Keychain via Electron's `safeStorage`. An attacker who copies your DB file off the disk cannot brute-force it without also having access to your login keychain.
- **PIN + optional Touch ID.** Unlock with your 6-digit numerical PIN. Touch ID is an opt-in convenience — the PIN is always the source of truth. **If you forget your PIN, your data is unrecoverable. There is no recovery flow by design.**

## Stack

- Electron 33 + electron-vite
- React 18 + TypeScript (renderer)
- Tailwind CSS with CSS-variable-driven light/dark theming
- `better-sqlite3-multiple-ciphers` (SQLCipher-compatible encrypted SQLite)
- `@node-rs/argon2` (Argon2id KDF)
- `zustand` for lightweight state
- `react-router` hash router
- Fraunces + Inter fonts, bundled via `@fontsource*` packages

## Running locally

```bash
npm install
npm run dev
```

First launch walks you through creating a 6-digit PIN. Two sample decisions (from the screenshots) are seeded into the encrypted DB so the UI is not empty while the app is still a boilerplate.

### Building an unsigned local DMG

You can produce an unsigned, un-notarized universal DMG on your own Mac with:

```bash
npm run dist:mac:local
```

The DMG lands in `release/`. It will run, but macOS Gatekeeper will show "cannot verify developer" the first time you open it — that is expected for locally-built binaries. Right-click the app → Open once, and macOS will remember your choice. **This is fine for dev/testing but is not how end users should get the app.** End users should download the notarized DMG from the [GitHub Releases page](https://github.com/sinameraji/decision-journal-electron/releases).

## Releasing (signed + notarized, via GitHub Actions)

Signing and notarization happen **in CI**, never on a laptop. Credentials live in GitHub repository secrets, so nothing sensitive ever touches the repo or a contributor's machine.

### One-time setup: GitHub secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | What it is |
|---|---|
| `MACOS_CERTIFICATE` | Base64-encoded Developer ID Application `.p12` file. Export from Keychain Access, then `base64 -i cert.p12 \| pbcopy`. |
| `MACOS_CERTIFICATE_PWD` | The password you set when exporting the `.p12`. |
| `APPLE_ID` | Your Apple ID email. |
| `APPLE_APP_SPECIFIC_PASSWORD` | Generated at [appleid.apple.com → App-Specific Passwords](https://appleid.apple.com). |
| `APPLE_TEAM_ID` | Your 10-character Apple Developer team identifier. |

### Cutting a release

```bash
# bump version in package.json first
git add package.json
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin main v0.1.0
```

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which:
1. Imports the Developer ID cert into an ephemeral keychain.
2. Runs `npm run dist:mac` → electron-builder builds a universal DMG, signs it with hardened runtime, and notarizes it with Apple.
3. Creates (or updates) a GitHub Release for the tag and uploads the DMG.
4. Deletes the ephemeral keychain.

Users then download `Decision Journal-<version>-universal.dmg` from the Release, double-click, drag to Applications, and open — no Gatekeeper prompt.

## Security notes

- **Key derivation**: Argon2id with `memoryCost=64 MiB`, `timeCost=4`, `parallelism=2`, 32-byte output, per-vault random salt. Tuned so derivation takes ~500ms on modern Macs — slow enough to neutralize offline brute force of a 6-digit PIN, fast enough for an acceptable unlock UX.
- **Master key**: 32 random bytes from Node `crypto.randomBytes`, used as the SQLCipher `PRAGMA key`.
- **Wrapping**: the master key is encrypted with AES-256-GCM under the PIN-derived key, then the ciphertext is further encrypted with Electron's `safeStorage` (which on macOS writes to the user's login keychain under `kSecAttrAccessibleWhenUnlocked`).
- **SQLCipher settings**: SHA-512 HMAC + SHA-512 PBKDF2 KDF for the cipher layer, 4096-byte pages.
- **Hardened runtime**: enabled in release builds. Entitlements are the minimum needed for the native SQLCipher binary (allow-jit, allow-unsigned-executable-memory, disable-library-validation). **No network entitlements are granted.**
- **Renderer hardening**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP, blocked `will-navigate` and `window.open`.
- **Cooldowns**: after 5 wrong PIN attempts, a 30s cooldown kicks in; each subsequent batch of 5 failures doubles the cooldown, capped at 10 minutes. Counter persists across relaunches in `vault.json`.

### Verifying the network lockdown yourself

With `npm run dev` running, open DevTools in the Electron window and try:

```js
await fetch('https://example.com')
```

You should see the request fail, and the main-process console will print `[network-kill-switch] blocked https://example.com/`.

### Verifying the DB is actually encrypted

1. Quit the app.
2. Copy `~/Library/Application Support/Decision Journal/decisions.db` anywhere.
3. `sqlite3 decisions.db "SELECT * FROM decisions;"` → you should see `Error: file is not a database`.

## Directory layout

```
src/
  main/           Electron main process (window, IPC, crypto, DB, theme)
    crypto/       Argon2id KDF, master-key vault, Keychain wrappers
    db/           Encrypted SQLite open + schema + seed
  preload/        contextBridge — the only surface the renderer can see
  shared/         IPC contract shared by main and renderer
  renderer/       React app (Vite)
    components/   Sidebar, TopBar, ThemeToggle, DecisionCard, PinPad, AppShell
    routes/       Unlock, Decisions, and stubs for New / Reviews / Analytics / Chat / Settings
    store/        Zustand stores for auth and theme
    styles/       globals.css (tokens + tailwind), fonts.css
build/            entitlements.mac.plist
.github/workflows/release.yml    Tag-triggered signed + notarized DMG
electron-builder.yml              Universal DMG, hardened runtime, notarize
electron.vite.config.ts           Main / preload / renderer build config
```

## Roadmap

This repository is the boilerplate only. Planned features:

- Full decision-capture flow (title, context, options considered, expected outcome, review date)
- Review flow to log actual outcomes against the original prediction
- Analytics: calibration, base-rate vs. actual, decision-quality trends
- **Local AI coach** via Ollama — chat with your past decisions, ask for second opinions, get bias checks, all running on-device with no network traffic
- Opportunity-cost analysis
- Game-theoretic tools for high-uncertainty, high-consequence choices

## License

MIT © Sina Meraji

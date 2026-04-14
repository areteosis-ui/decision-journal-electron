# Setting Up Syncthing Sync for Decision Journal

This guide explains how to sync your Decision Journal between your Mac mini (primary) and MacBook Air (secondary) using Syncthing. Syncthing is free, open-source, and peer-to-peer — no cloud account, no server, your data never touches a third-party.

> **What Syncthing sees**: only encrypted ciphertext files. Your PIN and the master key that encrypts your decisions never leave the device. Even if someone intercepted your Syncthing folder, they cannot read your data without your PIN.

---

## Part 1 — Set up Syncthing on both Macs

Do this on **both** your Mac mini and your MacBook Air.

### 1. Install Syncthing

```bash
brew install syncthing
```

Or download the macOS package from https://syncthing.net/downloads/

### 2. Start Syncthing as a background service (auto-starts on login)

```bash
brew services start syncthing
```

Verify it's running:

```bash
brew services list | grep syncthing
# should show: syncthing   started
```

### 3. Open the Syncthing web UI

Open your browser and go to: **http://127.0.0.1:8384**

You should see the Syncthing dashboard. Do this on both Macs.

---

## Part 2 — Create the shared folder on your Mac mini (primary)

### 4. Create the sync folder

In Terminal on your **Mac mini**:

```bash
mkdir -p ~/Syncthing/DecisionJournal
```

### 5. Add the folder in Syncthing

In the Syncthing web UI on your **Mac mini**:

1. Click **+ Add Folder**
2. Set **Folder Label** to: `Decision Journal`
3. Set **Folder ID** to: `decision-journal` (must match exactly on both devices — use lowercase with hyphen)
4. Set **Folder Path** to: `/Users/YOUR_USERNAME/Syncthing/DecisionJournal`
   (replace `YOUR_USERNAME` with your actual macOS username — run `whoami` in Terminal if unsure)
5. Leave all other settings at defaults
6. Click **Save**

The folder will show as "Unshared" for now — that's expected.

---

## Part 3 — Enable sync in the app on your Mac mini (primary)

### 6. Open Decision Journal on your Mac mini

1. Open the app and unlock with your PIN
2. Go to **Settings** → scroll down to **Sync (Syncthing)**
3. Toggle **Enable Syncthing sync** ON
4. Under **Sync folder**, confirm the path shows `~/Syncthing/DecisionJournal`
   - If the path is different, click **Change…** and navigate to the folder you created in step 4
5. Click **Export** to write your first snapshot to the sync folder

After clicking Export, these files will appear in `~/Syncthing/DecisionJournal/`:

```
vault.json                    ← your encrypted vault (portable, no keychain binding)
snapshot-<deviceId>.db        ← encrypted copy of your decisions database
meta-<deviceId>.json          ← device metadata (hostname, export timestamp)
```

Verify they exist:
```bash
ls -la ~/Syncthing/DecisionJournal/
```

---

## Part 4 — Connect your MacBook Air to Syncthing

Now you need to make the two Syncthing instances aware of each other.

### 7. Get the Device ID of your Mac mini

In the Syncthing UI on your **Mac mini**:
- Click **Actions** (top right menu) → **Show ID**
- Copy the full device ID string. It looks like:
  `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`

### 8. Add the Mac mini as a remote device on your MacBook Air

In the Syncthing web UI on your **MacBook Air** (http://127.0.0.1:8384):

1. Click **+ Add Remote Device**
2. Paste the Mac mini's device ID in the **Device ID** field
3. Set **Device Name** to: `Mac mini`
4. Click **Save**

### 9. Accept the connection on your Mac mini

Back on your **Mac mini's** Syncthing UI, a yellow notification should appear:
> "New Device" wants to connect — `[MacBook Air's device ID]`

Click **Add Device**, set a name (e.g. `MacBook Air`), click **Save**.

> If the notification doesn't appear within ~30 seconds, make sure both Macs are on the same network and Syncthing is running on both (`brew services list | grep syncthing`).

### 10. Share the Decision Journal folder with your MacBook Air

In the Syncthing UI on your **Mac mini**:

1. Find the **Decision Journal** folder in the left panel
2. Click **Edit** on that folder
3. Go to the **Sharing** tab
4. Check the checkbox next to **MacBook Air**
5. Click **Save**

### 11. Accept the shared folder on your MacBook Air

In the Syncthing UI on your **MacBook Air**, a notification will appear:
> "Mac mini" wants to share folder "Decision Journal" (decision-journal)

1. Click **Add**
2. Set the **Folder Path** to: `/Users/YOUR_USERNAME/Syncthing/DecisionJournal`
   (create the folder first if needed: `mkdir -p ~/Syncthing/DecisionJournal`)
3. Click **Save**

Syncthing will now sync the folder. Wait until both devices show **"Up to Date"** next to the Decision Journal folder before continuing. This usually takes under a minute on a local network.

---

## Part 5 — Set up Decision Journal on your MacBook Air (first time only)

### 12. Open Decision Journal on your MacBook Air

When you open the app for the first time, you will see the **setup screen** because no vault exists yet.

**Do NOT click "Create new vault"** — you need to import the existing vault from the sync folder.

### 13. Import from the Syncthing folder

Click **"Restore from backup"** (or "Import existing vault"):

1. Click **Restore…**
2. A folder picker will appear — navigate to: `~/Syncthing/DecisionJournal`
3. Select that folder and click **Open**
4. Enter your **PIN** (the same PIN you use on your Mac mini)
5. The app imports your vault and all your decisions

You should now see all your decisions from your Mac mini on your MacBook Air.

### 14. Enable sync on your MacBook Air

1. Go to **Settings** → **Sync (Syncthing)**
2. Toggle **Enable Syncthing sync** ON
3. Confirm the sync folder path shows `~/Syncthing/DecisionJournal`
4. Click **Export** to write your MacBook Air's first snapshot

Both devices now have snapshots in the shared folder and sync is fully configured.

---

## How sync works day-to-day

### Automatic (no action needed)

| Event | What happens |
|---|---|
| You save/edit/delete a decision | App waits 3 seconds (debounce), then exports a fresh encrypted snapshot to the sync folder. Syncthing transfers it to the other Mac automatically. |
| You unlock the app | App checks whether any other device has a newer snapshot and merges new/updated decisions silently in the background. |

### Manual controls (in Settings → Sync)

| Button | Purpose |
|---|---|
| **Export** | Writes a fresh snapshot right now (useful after coming back online) |
| **Merge** | Reads other devices' latest snapshots and merges immediately |

### Conflict resolution

Each field uses **last-write-wins** based on the `updated_at` timestamp. Whichever device saved a decision most recently wins. For a personal journal used solo, this is almost always correct — you'll rarely edit the same entry on both Macs simultaneously while offline.

### Deletions

Deletions are **intentionally not synced**. If you delete a decision on your Mac mini, it stays on your MacBook Air. This is a safety net — journal entries are valuable. To delete from both devices, delete on each separately.

---

## Troubleshooting

### "Sync directory not found" error in the app

The sync folder doesn't exist or Syncthing hasn't synced it yet. Check:
```bash
ls ~/Syncthing/DecisionJournal/
# should show vault.json, snapshot-*.db, meta-*.json
```
If the folder is empty, the Mac mini hasn't exported yet — go to Mac mini → Settings → Sync → Export.

### Syncthing shows "Out of Sync" or "Scanning"

Normal during initial sync or after a large transfer. Wait 1-2 minutes. If it stays stuck, check the Syncthing UI for specific error messages — usually a file permission issue fixable with:
```bash
chmod -R 700 ~/Syncthing/DecisionJournal/
```

### MacBook Air isn't picking up new decisions from Mac mini

1. Open Syncthing on both devices — confirm "Up to Date"
2. In the app on your MacBook Air → Settings → Sync → click **Merge**
3. Or lock and re-unlock the app — merge runs automatically on every unlock

### "Wrong key or corrupted file" during merge

The snapshot from the other device was encrypted with a different master key. This happens if the MacBook Air created its own vault instead of importing. Fix on MacBook Air:

1. Settings → **Restore from backup**
2. Navigate to `~/Syncthing/DecisionJournal`
3. Enter your PIN

This re-imports the correct vault and re-aligns the encryption keys. Your decisions won't be lost.

### Syncthing conflict files (`*.sync-conflict-*`)

Because each device writes to its **own** per-device file (`snapshot-<deviceId>.db`), Syncthing conflicts should never occur for snapshot files. If you see conflict files, they're safe to delete — they're just extra copies of encrypted snapshots.

### I changed my PIN — what do I do?

After changing your PIN on one device:
1. Go to Settings → Sync → click **Export** — this rewrites `vault.json` with the new PIN wrapping
2. On the other device: Settings → **Restore from backup** → navigate to `~/Syncthing/DecisionJournal` → enter the new PIN

---

## Security model

| File in sync folder | Contents | Sensitive? |
|---|---|---|
| `snapshot-<id>.db` | SQLCipher-encrypted database. Requires your master key to read. | Safe to expose — unreadable without PIN |
| `vault.json` | Master key wrapped with Argon2id-derived PIN key. | Safe to expose — unreadable without PIN |
| `meta-<id>.json` | Device ID, hostname, export timestamp | Not sensitive |

**Bottom line**: even if your Syncthing folder were compromised, an attacker sees only ciphertext. Breaking it requires brute-forcing your 6-digit PIN through Argon2id with 65,536 KB memory and 4 iterations — deliberately slow by design.

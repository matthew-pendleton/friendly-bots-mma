<<<<<<< HEAD
# 🥋 friendly-mma

Part of the **Friendly** bot suite — mock 1v1 fights with real consequences.

## Commands

| Command | Description |
|---|---|
| `/friendly-mma fight @user` | Challenge someone to a fight |
| `/friendly-mma help` | How the bot works |

---

## Setup

### 1. Install Node.js
https://nodejs.org — v18 or higher

### 2. Install dependencies
```bash
npm install
```

### 3. Create your Discord bot
1. Go to https://discord.com/developers/applications
2. **New Application** → give it a name (e.g. `friendly-mma`)
3. **Bot** tab → **Add Bot**
4. Enable these **Privileged Gateway Intents**:
   - ✅ Server Members Intent
5. Copy your **Bot Token**
6. Also copy your **Application ID** (shown on the General Information page)

### 4. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

### 5. Invite the bot
**OAuth2 → URL Generator:**
- Scopes: `bot`, `applications.commands`
- Bot Permissions:
  - ✅ Send Messages
  - ✅ Read Messages / View Channels
  - ✅ Moderate Members ← required for timeouts

Open the generated URL and add the bot to your server.

### 6. Role hierarchy
The bot's role must sit **above** any role you want to be timeout-able.
Admins and roles above the bot cannot be timed out — Discord limitation.

### 7. Run
```bash
node index.js
```

Slash commands register automatically on startup. They may take a few minutes to appear in Discord globally.

---

## Customization

In `index.js`:

| Constant | Default | Description |
|---|---|---|
| `MAX_HP` | `100` | Starting HP for both fighters |
| `TIMEOUT_MINUTES` | `5` | How long the loser is timed out |
| `ROUND_DELAY_MS` | `2000` | Delay between rounds (ms) |
| Miss chance | `0.15` | 15% — find `Math.random() < 0.15` |

Add or edit moves in the `MOVES` array — each needs a `name`, `damage: [min, max]`, and `flavor` string.

---

## Hosting (always-on)

| Option | Cost | Notes |
|---|---|---|
| Your PC | Free | Goes offline when PC is off |
| Render.com | Free tier | May spin down on inactivity |
| Railway.app | Free tier | Simple deploys |
| Hetzner VPS | ~€4/mo | Reliable, cheap |
| DigitalOcean | ~$5/mo | Easy setup |

---

*Friendly bot suite — each bot owns its own `/friendly-*` command namespace.*
=======
# friendly-bots-mma
Friendly suite of Discord Bots: Friendly MMA
>>>>>>> 9957cfe5830aabe7c57286fbedb85c892fa713be

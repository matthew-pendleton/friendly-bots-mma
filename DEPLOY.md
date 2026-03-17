# Deploying unfriendly-mma to a VPS

## What you'll end up with
- Bot running 24/7 on your VPS
- Automatically restarts if it crashes
- Automatically starts on VPS reboot
- Zero ongoing maintenance
- One-command updates via git

---

## 1. SSH into your VPS
```bash
ssh user@your-vps-ip
```

---

## 2. Install Node.js (v20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # should print v20.x.x
```

---

## 3. Install pm2 globally
```bash
sudo npm install -g pm2
```

---

## 4. Clone your repo
```bash
git clone https://github.com/yourusername/friendly-bots-mma.git ~/bots/unfriendly-mma
```

---

## 5. Install dependencies
```bash
cd ~/bots/unfriendly-mma
npm install
```

---

## 6. Create your .env file
```bash
nano .env
```
Paste in:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```
Save with `Ctrl+O`, exit with `Ctrl+X`.

> ⚠️ The .env file is gitignored and will never be in your repo.
> You create it manually on the VPS once and never touch it again.

---

## 7. Start the bot with pm2
```bash
pm2 start index.js --name unfriendly-mma
```

---

## 8. Save pm2 process list & enable startup
This makes pm2 (and your bot) survive a VPS reboot:
```bash
pm2 save
pm2 startup
```
`pm2 startup` will print a command — **copy and run it**. It looks like:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser
```

---

## Done. Your bot is live. 🥋

---

## Updating the bot
When you push changes to GitHub, pull and restart on the VPS:
```bash
cd ~/bots/unfriendly-mma
git pull
pm2 restart unfriendly-mma
```

That's all it takes — two commands.

---

## Useful pm2 commands

| Command | What it does |
|---|---|
| `pm2 status` | See if the bot is running |
| `pm2 logs unfriendly-mma` | View live logs |
| `pm2 restart unfriendly-mma` | Restart the bot |
| `pm2 stop unfriendly-mma` | Stop the bot |
| `pm2 delete unfriendly-mma` | Remove from pm2 |

---

## Adding future Friendly bots
Each new bot gets its own repo, its own clone, and its own pm2 process:
```bash
git clone https://github.com/yourusername/friendly-roulette.git ~/bots/friendly-roulette
cd ~/bots/friendly-roulette
npm install
nano .env  # add its token + client ID
pm2 start index.js --name friendly-roulette
pm2 save
```
All bots run independently on the same VPS, managed together via pm2.

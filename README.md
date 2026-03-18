# 🥋 unfriendly-mma

Part of the **Unfriendly** bot suite — mock 1v1 fights with optional timeout consequences.

## Commands

| Command | Description |
|---|---|
| `/unfriendly-mma fight @user` | Challenge someone to a fight |
| `/unfriendly-mma stats [@user]` | View fight stats |
| `/unfriendly-mma leaderboard` | Server rankings |
| `/unfriendly-mma help` | How the bot works |

---



## Customization

In `index.js`:

| Constant | Default | Description |
|---|---|---|
| `MAX_HP` | `100` | Starting HP for both fighters |
| `TIMEOUT_MINUTES` | `5` | How long the loser is timed out when winner chooses "Finish Them" (only if the server grants the bot **Moderate Members**) |
| `ROUND_DELAY_MS` | `1000` | Delay between rounds (ms) |

**Timeout is controlled by the server:** if the server grants the bot **Moderate Members**, the winner can choose to timeout the loser. If not, matches end without any timeout.

In `dialogue.js`: add or edit moves in the `MOVES` array — each needs a `name`, `damage: [min, max]`, and `flavor` string.

---



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
| `TIMEOUT_MINUTES` | `5` | How long the loser is timed out (when enabled) |
| `TIMEOUT_ENABLED` | `false` | Set `true` to actually timeout the loser when winner chooses "Finish Them" |
| `ROUND_DELAY_MS` | `1000` | Delay between rounds (ms) |

In `dialogue.js`: add or edit moves in the `MOVES` array — each needs a `name`, `damage: [min, max]`, and `flavor` string.

---



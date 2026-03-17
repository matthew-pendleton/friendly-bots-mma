// ── unfriendly-mma ───────────────────────────────────────────────────────────
// Part of the Friendly bot suite.
//
// App directory description:
//   Challenge any server member to a 1v1 MMA fight. Rounds play out
//   blow-by-blow with random moves, HP bars, and trash talk. Optional
//   timeout for the loser when winner chooses "Finish Them".
//
// Language:    English only
// DM support:  No (server-only)
// Status:      Playing: Unfriendly MMA
// ─────────────────────────────────────────────────────────────────────────────

const {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType,
} = require("discord.js");

require("dotenv").config();

const {
  CHALLENGE_TAUNTS,
  DECLINE_LINES,
  TIMEOUT_LINES,
} = require("./dialogue");

const { loadStats } = require("./stats");
const { createFightEngine } = require("./fight");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

// ── Active fight tracking (per user, not per pair) ───────────────────────────
const activeFighters = new Set();

function addFighters(...ids)    { ids.forEach(id => activeFighters.add(id)); }
function removeFighters(...ids) { ids.forEach(id => activeFighters.delete(id)); }
function isFighting(...ids)     { return ids.some(id => activeFighters.has(id)); }

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_HP               = 100;
const TIMEOUT_MINUTES      = 5;
const TIMEOUT_ENABLED      = false; // set true to actually timeout the loser when "Finish Them" is used
const ROUND_DELAY_MS       = 1000;
const CHALLENGE_TIMEOUT_MS = 60000;
// Fight flavor tuning (lower = less chatty)
const ANNOUNCER_EVERY_ROUNDS = 6;    // was 4
const AUDIENCE_CHANCE        = 0.10; // was 0.20
const META_CHANCE            = 0.02; // was 0.06
const POST_FIGHT_DECISION_MS = 10000;

const { runFight } = createFightEngine({
  MAX_HP,
  TIMEOUT_MINUTES,
  TIMEOUT_ENABLED,
  ROUND_DELAY_MS,
  ANNOUNCER_EVERY_ROUNDS,
  AUDIENCE_CHANCE,
  META_CHANCE,
  POST_FIGHT_DECISION_MS,
});

function pickFrom(arr, ...args) {
  return arr[Math.floor(Math.random() * arr.length)](...args);
}

// ── Slash command definitions ─────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("unfriendly-mma")
    .setDescription("Unfriendly MMA — mock 1v1 fights with real consequences 🥋")
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("fight")
        .setDescription("Challenge someone to a 1v1 MMA fight")
        .addUserOption((opt) =>
          opt.setName("opponent").setDescription("The person you want to fight").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("View fight stats for a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user to look up (defaults to you)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("leaderboard").setDescription("Show the server fight leaderboard")
    )
    .addSubcommand((sub) =>
      sub.setName("help").setDescription("How Unfriendly MMA works")
    ),
].map((cmd) => cmd.toJSON());

// ── Register slash commands ───────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registered globally.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

// ── Interaction handler ───────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {

  // ── Button: accept/decline challenge ─────────────────────────────────────
  if (interaction.isButton()) {
    const [action, challengerId, defenderId] = interaction.customId.split(":");

    if (!["mma_accept", "mma_decline"].includes(action)) return;

    if (interaction.user.id !== defenderId) {
      return interaction.reply({ content: "⚠️ This challenge isn't for you.", ephemeral: true });
    }

    if (action === "mma_decline") {
      const declineLine = pickFrom(DECLINE_LINES, challengerId, defenderId);
      await interaction.update({ content: declineLine, embeds: [], components: [] });
      removeFighters(challengerId, defenderId);
      return;
    }

    if (action === "mma_accept") {
      await interaction.update({
        content: `✅ <@${defenderId}> accepted the challenge! Let the fight begin! 💥`,
        embeds: [],
        components: [],
      });

      const challenger = await interaction.guild.members.fetch(challengerId);
      const defender   = await interaction.guild.members.fetch(defenderId);

      try {
        await runFight(interaction.channel, challenger, defender);
      } catch (err) {
        console.error("Fight error:", err);
        await interaction.channel.send("💥 Something went wrong mid-fight. The ref called it off.");
      } finally {
        removeFighters(challengerId, defenderId);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "unfriendly-mma") return;

  const sub = interaction.options.getSubcommand();

  // ── /unfriendly-mma help ───────────────────────────────────────────────────
  if (sub === "help") {
    return interaction.reply({
      content:
        `## 🥋 Unfriendly MMA\n` +
        `Challenge a server member to a mock MMA fight. The loser *might* get timed out.\n\n` +
        `**Commands**\n` +
        `\`/unfriendly-mma fight @user\` — challenge someone\n` +
        `\`/unfriendly-mma stats [@user]\` — view fight stats\n` +
        `\`/unfriendly-mma leaderboard\` — server rankings\n` +
        `\`/unfriendly-mma help\` — show this message\n\n` +
        `**How it works**\n` +
        `> Both fighters start at **${MAX_HP} HP**. Rounds alternate attacks until someone hits 0.\n` +
        `> Moves deal random damage. There's a 15% miss chance per round.\n` +
        (TIMEOUT_ENABLED
          ? `> If the winner chooses **Finish Them**, the loser is timed out for **${TIMEOUT_MINUTES} minutes**.\n\n`
          : `> **Timeout is currently disabled** (trial mode — no one gets muted).\n\n`) +
        `*Part of the **Friendly** bot suite.*`,
      ephemeral: true,
    });
  }

  // ── /unfriendly-mma stats ──────────────────────────────────────────────────
  if (sub === "stats") {
    const target     = interaction.options.getUser("user") ?? interaction.user;
    const stats      = loadStats();
    const userStats  = stats[target.id];

    if (!userStats || (userStats.wins === 0 && userStats.losses === 0)) {
      return interaction.reply({
        content: `📭 No fight history found for **${target.displayName ?? target.username}**.`,
        ephemeral: true,
      });
    }

    // Fetch current display name from Discord
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const displayName = member?.displayName ?? target.username;

    const total  = userStats.wins + userStats.losses;
    const ratio  = userStats.losses === 0
      ? userStats.wins.toFixed(2)
      : (userStats.wins / userStats.losses).toFixed(2);
    const winPct = ((userStats.wins / total) * 100).toFixed(1);

    // Build monospace-aligned stat rows
    const statRows = [
      ["🏆", "Wins",            String(userStats.wins)],
      ["💀", "Losses",          String(userStats.losses)],
      ["📊", "W/L Ratio",       ratio],
      ["🥊", "Total Fights",    String(total)],
      ["📈", "Win Rate",        `${winPct}%`],
    ];
    const labelW = Math.max(...statRows.map(r => r[1].length));
    const valueW = Math.max(...statRows.map(r => r[2].length));
    const statLines = statRows.map(([icon, label, value]) =>
      `${icon} \`${label.padEnd(labelW)}\`  \`${value.padStart(valueW)}\``
    ).join("\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setTitle(`🥋 ${displayName} — Fight Stats`)
          .setDescription(statLines),
      ],
    });
  }

  // ── /unfriendly-mma leaderboard ───────────────────────────────────────────
  if (sub === "leaderboard") {
    const stats = loadStats();

    // Build sorted top-10 with IDs preserved
    const top10 = Object.entries(stats)
      .filter(([, u]) => u.wins + u.losses > 0)
      .sort(([, a], [, b]) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const ratioA = a.losses === 0 ? a.wins : a.wins / a.losses;
        const ratioB = b.losses === 0 ? b.wins : b.wins / b.losses;
        return ratioB - ratioA;
      })
      .slice(0, 10);

    if (top10.length === 0) {
      return interaction.reply({ content: "📭 No fights recorded yet.", ephemeral: true });
    }

    // Bulk fetch all top-10 members in one API call, then build a lookup map
    const top10Ids = top10.map(([id]) => id);
    const fetchedMembers = await interaction.guild.members.fetch({ user: top10Ids }).catch(() => new Map());

    const medals = ["🥇", "🥈", "🥉"];
    const ranked = top10.map(([id, u], idx) => {
      const ratio  = u.losses === 0 ? u.wins.toFixed(2) : (u.wins / u.losses).toFixed(2);
      const member = fetchedMembers.get(id);
      const name   = member?.displayName ?? `Unknown (${id.slice(-4)})`;
      return { medal: medals[idx] ?? `${idx + 1}. `, name, wins: u.wins, losses: u.losses, ratio };
    });

    // Column widths
    const nameW  = Math.max(4, ...ranked.map(r => r.name.length));
    const winsW  = Math.max(1, ...ranked.map(r => String(r.wins).length));
    const lossW  = Math.max(1, ...ranked.map(r => String(r.losses).length));
    const ratioW = Math.max(5, ...ranked.map(r => r.ratio.length));

    const header = `${"RANK".padEnd(6)} ${"NAME".padEnd(nameW)}  ${"W".padStart(winsW)}  ${"L".padStart(lossW)}  ${"RATIO".padStart(ratioW)}`;
    const divider = "─".repeat(header.length);
    const tableRows = ranked.map((r, i) => {
      const rank = `${r.medal} ${String(i + 1).padEnd(2)}`.slice(0, 6);
      return `${rank} ${r.name.padEnd(nameW)}  ${String(r.wins).padStart(winsW)}  ${String(r.losses).padStart(lossW)}  ${r.ratio.padStart(ratioW)}`;
    });

    const table = "```\n" + header + "\n" + divider + "\n" + tableRows.join("\n") + "\n```";

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("🏆 Unfriendly MMA — Leaderboard")
          .setDescription(table),
      ],
    });
  }

  // ── /unfriendly-mma fight @user ───────────────────────────────────────────
  if (sub === "fight") {
    await interaction.deferReply();

    const opponent     = interaction.options.getMember("opponent");
    const opponentUser = interaction.options.getUser("opponent");

    if (!opponent || !opponentUser) {
      return interaction.editReply({ content: "❌ Couldn't find that user in this server." });
    }
    if (opponentUser.id === interaction.user.id) {
      return interaction.editReply({ content: "❌ You can't fight yourself... or can you? (You can't.)" });
    }
    if (opponentUser.bot) {
      return interaction.editReply({ content: "❌ Bots don't fight. We are pacifists. 🕊️" });
    }
    if (opponent.communicationDisabledUntil && opponent.communicationDisabledUntil > new Date()) {
      return interaction.editReply({ content: `⚠️ <@${opponent.id}> is currently timed out. Let them serve their time first.` });
    }

    // Timeout permission is optional: if the server doesn't grant Moderate Members,
    // the bot will still run fights (and just won't apply timeouts).

    if (isFighting(interaction.user.id, opponent.id)) {
      const who = activeFighters.has(interaction.user.id) ? "You are" : `<@${opponent.id}> is`;
      return interaction.editReply({ content: `⚠️ ${who} already in a fight. Wait for it to finish.` });
    }

    addFighters(interaction.user.id, opponent.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mma_accept:${interaction.user.id}:${opponent.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`mma_decline:${interaction.user.id}:${opponent.id}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
    );

    const taunt = pickFrom(CHALLENGE_TAUNTS, interaction.user.id, opponent.id);
    await interaction.editReply({
      content: `${taunt}\n\n<@${opponent.id}>, do you accept?`,
      components: [row],
    });

    // Auto-expire the challenge after 60s
    setTimeout(async () => {
      if (!isFighting(interaction.user.id, opponent.id)) return;
      removeFighters(interaction.user.id, opponent.id);
      try {
        await interaction.editReply({
          content: pickFrom(TIMEOUT_LINES, interaction.user.id, opponent.id),
          components: [],
        });
      } catch { /* message may already be gone */ }
    }, CHALLENGE_TIMEOUT_MS);
  }
  } catch (err) {
    console.error("Unhandled interaction error:", err);
    console.error("  Command:", interaction.commandName ?? interaction.customId ?? "unknown");
    console.error("  User:   ", interaction.user?.tag ?? "unknown");
    console.error("  Guild:  ", interaction.guild?.name ?? "null — bot may not be properly installed");
    try {
      const channelHint =
        interaction.channelId
          ? `\n\n**Channel**: <#${interaction.channelId}>`
          : "";

      // Common Discord permission errors:
      // 50001 = Missing Access (can't view channel / access resource)
      // 50013 = Missing Permissions (can see it, but can't do an action like send embeds)
      const code = err?.code;
      const isMissingAccess = code === 50001;
      const isMissingPerms  = code === 50013;

      const msg = (isMissingAccess || isMissingPerms)
        ? (
          `🚫 I can't do that here due to missing permissions.${channelHint}\n\n` +
          `Ask a server admin to grant me **View Channel**, **Send Messages**, and **Embed Links** in that channel.` +
          (isMissingAccess ? `\n\n(Discord error: **Missing Access**)` : `\n\n(Discord error: **Missing Permissions**)`)
        )
        : "💥 Something went wrong. If this keeps happening, let a server admin know.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    } catch { /* interaction may have already expired */ }
  }
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} is online.`);
  client.user.setActivity("Unfriendly MMA", { type: ActivityType.Playing });
  await registerCommands();
});

client.login(process.env.DISCORD_TOKEN);

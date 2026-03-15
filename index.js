// ── friendly-mma ─────────────────────────────────────────────────────────────
// Part of the Friendly bot suite.
//
// App directory description:
//   Challenge any server member to a 1v1 MMA fight. Rounds play out
//   blow-by-blow with random moves, HP bars, and trash talk. The loser
//   gets timed out. Simple as that.
//
// Language:    English only
// DM support:  No (server-only)
// Status:      Playing: Friendly MMA
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

const fs   = require("fs");
const path = require("path");

require("dotenv").config();

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
const ROUND_DELAY_MS       = 1000;
const CHALLENGE_TIMEOUT_MS = 60000;
const STATS_FILE           = path.join(__dirname, "stats.json");

// ── Stats persistence ─────────────────────────────────────────────────────────
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch { /* corrupt file — start fresh */ }
  return {};
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function recordResult(winnerId, winnerName, loserId, loserName) {
  const stats = loadStats();

  if (!stats[winnerId]) stats[winnerId] = { name: winnerName, wins: 0, losses: 0 };
  if (!stats[loserId])  stats[loserId]  = { name: loserName,  wins: 0, losses: 0 };

  stats[winnerId].name   = winnerName; // keep name fresh
  stats[loserId].name    = loserName;
  stats[winnerId].wins  += 1;
  stats[loserId].losses += 1;

  saveStats(stats);
}

// ── Move table ────────────────────────────────────────────────────────────────
const MOVES = [
  { name: "Jab",                damage: [5,  12], flavor: "snaps out a quick jab" },
  { name: "Cross",              damage: [8,  16], flavor: "lands a sharp cross" },
  { name: "Hook",               damage: [10, 20], flavor: "connects with a hook" },
  { name: "Uppercut",           damage: [12, 22], flavor: "drives an uppercut" },
  { name: "Body Shot",          damage: [8,  15], flavor: "digs a body shot in" },
  { name: "Head Kick",          damage: [15, 28], flavor: "launches a head kick 🦵" },
  { name: "Body Kick",          damage: [10, 18], flavor: "sweeps a body kick" },
  { name: "Low Kick",           damage: [6,  12], flavor: "chops a low kick to the leg" },
  { name: "Superman Punch",     damage: [14, 24], flavor: "flies in with a superman punch ✊" },
  { name: "Spinning Back Kick", damage: [18, 30], flavor: "spins and BLASTS a back kick 💥" },
  { name: "Takedown",           damage: [10, 18], flavor: "shoots in for a takedown 🤼" },
  { name: "Elbow Strike",       damage: [12, 20], flavor: "rips a nasty elbow" },
  { name: "Knee Strike",        damage: [11, 19], flavor: "drives a knee into the body" },
  { name: "Clinch Throw",       damage: [8,  16], flavor: "slings them off the clinch" },
  { name: "Ground & Pound",     damage: [15, 25], flavor: "rains down ground & pound 🥊" },
];

const MISS_FLAVOR = [
  "swings and MISSES — embarrassing",
  "telegraphs completely, dodged easily",
  "whiffs on the attempt",
  "slips on the canvas — yikes",
  "shoots for a takedown and faceplants 😬",
];

// ── Challenge flavor ──────────────────────────────────────────────────────────
const CHALLENGE_TAUNTS = [
  (c, d) => `👊 <@${c}> is tired of <@${d}>'s nonsense and wants to settle this the old fashioned way.`,
  (c, d) => `🐔 <@${c}> just called <@${d}> a coward to their face. Publicly. In front of everyone.`,
  (c, d) => `💅 <@${c}> looked <@${d}> dead in the eyes and said "you wouldn't last 30 seconds."`,
  (c, d) => `🤡 <@${c}> has formally declared <@${d}> the most punchable person in the server.`,
  (c, d) => `🪑 <@${c}> just threw a folding chair in <@${d}>'s direction. This is a challenge.`,
  (c, d) => `😤 <@${c}> has had ENOUGH of <@${d}> and is ready to do something about it.`,
  (c, d) => `🥩 <@${c}> called <@${d}>'s technique "embarrassing" and said they fight like a wet napkin.`,
  (c, d) => `🔔 DING DING. <@${c}> just stepped into <@${d}>'s mentions swinging.`,
  (c, d) => `🗑️ <@${c}> just dragged <@${d}> out of the trash and challenged them to a fight. Disrespectful.`,
  (c, d) => `💀 <@${c}> told <@${d}> to "catch these hands" and meant every word of it.`,
  (c, d) => `🎤 <@${c}> dropped the mic, picked it back up, and used it to challenge <@${d}>.`,
  (c, d) => `🧂 <@${c}> is SALTY and <@${d}> is the reason. Time to throw hands.`,
  (c, d) => `👀 <@${c}> has been staring at <@${d}> for the past 10 minutes. This is a challenge.`,
  (c, d) => `🐣 <@${c}> says <@${d}> fights like they're still in tutorial mode.`,
  (c, d) => `🚨 <@${c}> has issued a formal citation to <@${d}> for existing too confidently.`,
  (c, d) => `🎯 <@${c}> pointed directly at <@${d}> and said "you. cage. now."`,
  (c, d) => `😂 <@${c}> started laughing at <@${d}>'s fighting stance and now it's personal.`,
  (c, d) => `🩲 <@${c}> told <@${d}> their ground game is so bad it should be illegal.`,
  (c, d) => `🔥 <@${c}> just sent <@${d}> a one-word message: "fight." No punctuation. Dead serious.`,
  (c, d) => `🪤 <@${c}> has set a trap and <@${d}> is walking right into it.`,
];

const DECLINE_LINES = [
  (c, d) => `🐔 <@${d}> took one look at <@${c}> and said absolutely not. Cowardice lives here.`,
  (c, d) => `😂 <@${d}> declined. Apparently <@${c}> isn't worth the effort. Noted.`,
  (c, d) => `🏃 <@${d}> has left the building. <@${c}> stands alone in the cage, confused.`,
  (c, d) => `🧘 <@${d}> said they're "at peace" and refuse to engage. <@${c}> is fuming.`,
  (c, d) => `📵 <@${d}> saw the challenge notification and put their phone face down. Declined.`,
  (c, d) => `🩹 <@${d}> claims a prior injury. Very convenient. <@${c}> doesn't believe it for a second.`,
  (c, d) => `🤝 <@${d}> attempted to shake <@${c}>'s hand and walk away. Smooth. Cowardly, but smooth.`,
  (c, d) => `💅 <@${d}> said they just got their nails done and can't risk it right now.`,
];

const TIMEOUT_LINES = [
  (c, d) => `⏱️ <@${c}> challenged <@${d}>... but <@${d}> was too busy doing literally anything else. Challenge expired.`,
  (c, d) => `👻 <@${c}> threw down the gauntlet and <@${d}> just ghosted them. Embarrassing for everyone.`,
  (c, d) => `😴 <@${c}> issued a challenge and <@${d}> apparently fell asleep. Fight cancelled.`,
  (c, d) => `🗓️ <@${d}> has asked to reschedule for a time that works better for them. <@${c}> is not okay with this.`,
  (c, d) => `📺 <@${c}> is still waiting. <@${d}> is presumably watching TV. Challenge expired.`,
  (c, d) => `🤷 <@${c}> waited a full minute. <@${d}> said nothing. The cage sits empty.`,
  (c, d) => `🚶 <@${d}> walked away from <@${c}>'s challenge without saying a word. Absolutely ruthless.`,
  (c, d) => `💨 <@${d}> vanished into thin air. <@${c}> is left standing in the cage alone, looking silly.`,
];

function pickFrom(arr, ...args) {
  return arr[Math.floor(Math.random() * arr.length)](...args);
}

// ── Slash command definitions ─────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("friendly-mma")
    .setDescription("Friendly MMA — mock 1v1 fights with real consequences 🥋")
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
      sub.setName("help").setDescription("How Friendly MMA works")
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

// ── Utility helpers ───────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hpBar(name, hp, nameWidth, max = MAX_HP) {
  const filled = Math.round((hp / max) * 10);
  const empty  = 10 - filled;
  const bar    = "🟥".repeat(Math.max(0, filled)) + "⬜".repeat(Math.max(0, empty));
  const padded = name.padEnd(nameWidth, " ");
  return `❤️ \`${padded}\` ${bar} \`${hp}\``;
}

function buildFightEmbed({ title, log, fighters, color = 0xcc0000 }) {
  const nameWidth = Math.max(fighters[0].name.length, fighters[1].name.length);
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      log.map(l => `> ${l}`).join("\n") +
      "\n\u200B\n" +
      hpBar(fighters[0].name, fighters[0].hp, nameWidth) + "\n" +
      hpBar(fighters[1].name, fighters[1].hp, nameWidth)
    );
}

function pickMove() { return MOVES[Math.floor(Math.random() * MOVES.length)]; }
function isMiss()   { return Math.random() < 0.15; }
function sleep(ms)  { return new Promise((r) => setTimeout(r, ms)); }

// ── Fight engine ──────────────────────────────────────────────────────────────
async function runFight(channel, challenger, defender) {
  const fighters = [
    { member: challenger, hp: MAX_HP, name: challenger.displayName },
    { member: defender,   hp: MAX_HP, name: defender.displayName },
  ];

  const log = ["🎤 The fighters step into the cage..."];
  const embedTitle = `🥋 ${fighters[0].name} vs ${fighters[1].name}`;

  const fightMsg = await channel.send({
    embeds: [buildFightEmbed({ title: embedTitle, log, fighters })],
  });

  await sleep(ROUND_DELAY_MS);

  let round    = 1;
  let attacker = rand(0, 1);

  while (fighters[0].hp > 0 && fighters[1].hp > 0) {
    const atk = fighters[attacker];
    const def = fighters[attacker === 0 ? 1 : 0];

    let line;
    if (isMiss()) {
      const miss = MISS_FLAVOR[Math.floor(Math.random() * MISS_FLAVOR.length)];
      line = `💨 **Rnd ${round}** — **${atk.name}** ${miss}`;
    } else {
      const move = pickMove();
      const dmg  = rand(move.damage[0], move.damage[1]);
      def.hp = Math.max(0, def.hp - dmg);
      line = `🥊 **Rnd ${round}** — **${atk.name}** ${move.flavor} · **${move.name}** · **-${dmg} HP**`;
    }

    log.push(line);

    await fightMsg.edit({
      embeds: [buildFightEmbed({ title: embedTitle, log, fighters })],
    });

    await sleep(ROUND_DELAY_MS);

    if (fighters[0].hp <= 0 || fighters[1].hp <= 0) break;

    attacker = attacker === 0 ? 1 : 0;
    round++;
  }

  const loser  = fighters[0].hp <= 0 ? fighters[0] : fighters[1];
  const winner = fighters[0].hp <= 0 ? fighters[1] : fighters[0];

  // Record stats
  recordResult(winner.member.id, winner.name, loser.member.id, loser.name);

  // Final KO embed
  const nameWidth = Math.max(fighters[0].name.length, fighters[1].name.length);
  await fightMsg.edit({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`💀 Fight Over! 💀`)
        .setDescription(
          `> 🏆 **${winner.name}** wins by knockout!\n` +
          `> 😬 **${loser.name}** has been defeated.\n` +
          `\n\u200B\n` +
          hpBar(fighters[0].name, fighters[0].hp, nameWidth) + "\n" +
          hpBar(fighters[1].name, fighters[1].hp, nameWidth)
        ),
    ],
  });

  try {
    await loser.member.timeout(
      TIMEOUT_MINUTES * 60 * 1000,
      `Lost a Friendly MMA fight against ${winner.name}`
    );
    await channel.send(`🔇 <@${loser.member.id}> has been muted for ${TIMEOUT_MINUTES} minutes. Take the L.`);
  } catch {
    await channel.send(`⚠️ Couldn't time out <@${loser.member.id}> — they may be a mod or above my role. They escape justice... for now.`);
  }
}

// ── Interaction handler ───────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

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
  if (interaction.commandName !== "friendly-mma") return;

  const sub = interaction.options.getSubcommand();

  // ── /friendly-mma help ────────────────────────────────────────────────────
  if (sub === "help") {
    return interaction.reply({
      content:
        `## 🥋 Friendly MMA\n` +
        `Challenge a server member to a mock MMA fight. The loser gets timed out.\n\n` +
        `**Commands**\n` +
        `\`/friendly-mma fight @user\` — challenge someone\n` +
        `\`/friendly-mma stats [@user]\` — view fight stats\n` +
        `\`/friendly-mma leaderboard\` — server rankings\n` +
        `\`/friendly-mma help\` — show this message\n\n` +
        `**How it works**\n` +
        `> Both fighters start at **${MAX_HP} HP**. Rounds alternate attacks until someone hits 0.\n` +
        `> Moves deal random damage. There's a 15% miss chance per round.\n` +
        `> The loser is timed out for **${TIMEOUT_MINUTES} minutes** automatically.\n\n` +
        `*Part of the **Friendly** bot suite.*`,
      ephemeral: true,
    });
  }

  // ── /friendly-mma stats ───────────────────────────────────────────────────
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

    const total  = userStats.wins + userStats.losses;
    const ratio  = userStats.losses === 0
      ? userStats.wins.toFixed(2)
      : (userStats.wins / userStats.losses).toFixed(2);
    const winPct = ((userStats.wins / total) * 100).toFixed(1);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setTitle(`🥋 ${userStats.name} — Fight Stats`)
          .setDescription(
            `🏆 **Wins** \`${userStats.wins}\`\n` +
            `💀 **Losses** \`${userStats.losses}\`\n` +
            `📊 **W/L Ratio** \`${ratio}\`\n` +
            `🥊 **Total Fights** \`${total}\`\n` +
            `📈 **Win Rate** \`${winPct}%\``
          ),
      ],
    });
  }

  // ── /friendly-mma leaderboard ─────────────────────────────────────────────
  if (sub === "leaderboard") {
    const stats = loadStats();
    const entries = Object.values(stats)
      .filter(u => u.wins + u.losses > 0)
      .sort((a, b) => {
        // Sort by wins first, then by W/L ratio
        if (b.wins !== a.wins) return b.wins - a.wins;
        const ratioA = a.losses === 0 ? a.wins : a.wins / a.losses;
        const ratioB = b.losses === 0 ? b.wins : b.wins / b.losses;
        return ratioB - ratioA;
      })
      .slice(0, 10);

    if (entries.length === 0) {
      return interaction.reply({ content: "📭 No fights recorded yet.", ephemeral: true });
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = entries.map((u, i) => {
      const ratio  = u.losses === 0 ? u.wins.toFixed(2) : (u.wins / u.losses).toFixed(2);
      const medal  = medals[i] ?? `**${i + 1}.**`;
      return `${medal} **${u.name}** — \`${u.wins}W / ${u.losses}L\` · ratio \`${ratio}\``;
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("🏆 Friendly MMA — Leaderboard")
          .setDescription(rows.join("\n")),
      ],
    });
  }

  // ── /friendly-mma fight @user ─────────────────────────────────────────────
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

    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.editReply({
        content: "⚠️ I need the **Moderate Members** permission to time out the loser. Ask a server admin!",
      });
    }

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
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} is online.`);
  client.user.setActivity("Friendly MMA", { type: ActivityType.Playing });
  await registerCommands();
});

client.login(process.env.DISCORD_TOKEN);

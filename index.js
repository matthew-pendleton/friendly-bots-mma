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

function recordResult(winnerId, loserId) {
  const stats = loadStats();

  if (!stats[winnerId]) stats[winnerId] = { wins: 0, losses: 0 };
  if (!stats[loserId])  stats[loserId]  = { wins: 0, losses: 0 };

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
  (atk) => `💨 **${atk}** — skill issue`,
  (atk) => `💨 **${atk}** misses. Clean. Nothing. Air.`,
  (atk) => `💨 **${atk}** throws that and expects it to land. It does not land.`,
  (atk) => `💨 **${atk}** whiffs and the ref is genuinely embarrassed for them.`,
  (atk) => `💨 **${atk}** just kicked the concept of fighting and made contact with nothing.`,
  (atk) => `💨 **${atk}** swings. Miss. That's it. That's what happened.`,
  (atk) => `💨 **${atk}** shoots for a takedown and arrives on the ground alone.`,
  (atk) => `💨 **${atk}** was not ready to throw that and it showed.`,
  (atk) => `💨 **${atk}** misses so wide someone in the crowd ducks.`,
  (atk) => `💨 **${atk}** — no. Just no.`,
  (atk) => `💨 **${atk}** attempts anime protagonist energy. Whiff.`,
  (atk) => `💨 **${atk}** attempts violence but achieves interpretive dance by accident.`,
];

const KNOCKDOWN_FLAVOR = [
  (atk, def, dmg) => `💥 **${atk}** hits **${def}** so hard they wake up on that cart in Skyrim — **-${dmg} HP**`,
  (atk, def, dmg) => `💥 **${def}** wakes up mid-fight and immediately wishes they hadn't — **-${dmg} HP** from **${atk}**`,
  (atk, def, dmg) => `💥 **${atk}** catches **${def}** so hard it makes NSFW sounds — **-${dmg} HP**`,
  (atk, def, dmg) => `💥 **${atk}** just rearranged **${def}**'s entire afternoon — **-${dmg} HP**`,
  (atk, def, dmg) => `💥 **${def}** takes **-${dmg} HP** and their body files a formal complaint with their brain`,
  (atk, def, dmg) => `💥 **${atk}** lands that and **${def}**'s legs send a resignation letter — **-${dmg} HP**`,
  (atk, def, dmg) => `💥 **${def}** is still standing. **${atk}** is fixing that — **-${dmg} HP**`,
  (atk, def, dmg) => `💥 **${atk}** hits **${def}** with something that has no business being that clean — **-${dmg} HP**`,
];

const LUCKY_HIT_FLAVOR = [
  (atk, def, dmg) => `🍀 **${atk}** puts their foot up **${def}**'s bottom and it comes out their top — **-${dmg} HP**`,
  (atk, def, dmg) => `🍀 **${atk}** closes their eyes, swings, and **${def}** takes **-${dmg} HP**. No notes.`,
  (atk, def, dmg) => `🍀 **${atk}** had no right to land that. **${def}** loses **-${dmg} HP** anyway.`,
  (atk, def, dmg) => `🍀 **${def}** walks directly into **-${dmg} HP**. Freely. Of their own will.`,
  (atk, def, dmg) => `🍀 That was dumb luck and everybody knows it. **${def}** loses **-${dmg} HP**.`,
  (atk, def, dmg) => `🍀 **${atk}** sneezes mid-swing and it lands. **${def}** is devastated. We all are. **-${dmg} HP**.`,
];

const ANNOUNCER_FLAVOR = [
  (atk, def) => `🎙️ *"One of these people is going to be muted. I think we all know which one."*`,
  (atk, def) => `🎙️ *"I diagnosed ${def} with 'prolly cooked' about three rounds ago and I stand by that."*`,
  (atk, def) => `🎙️ *"I've called a lot of fights. I want you to know I'm putting my second airpod back in."*`,
  (atk, def) => `🎙️ *"${def} has survived longer than I expected. I expected less."*`,
  (atk, def) => `🎙️ *"WHERE ARE THE MODS!?!?"*`,
  (atk, def) => `🎙️ *"This is fine. One of them is not fine. You can tell which one."*`,
  (atk, def) => `🎙️ *"${atk} is not playing around. ${def} came here to play around."*`,
  (atk, def) => `🎙️ *"Good thing this is an adults only server. Right? ...Right?."*`,
];

const AUDIENCE_FLAVOR = [
  "👥 *chat: ngl you prolly cooked gng*",
  "👥 *chat: bro thought he was the main character*",
  "👥 *chat: bro is NOT okay 💀*",
  "👥 *chat: bro doing side character damage*",
  "👥 *chat: the way I would have just stayed home*",
  "👥 *chat: he just stood there. why did he just stand there.*",
  "👥 *chat: the audacity*",
  "👥 *chat: uninstall*",
  "👥 *chat: it's giving 'I watched one YouTube video'*",
];

const META_FLAVOR = [
  (atk, def) => `🤖 *[The bot would like to clarify that it does not enjoy this.]*`,
  (atk, def) => `🤖 *[The bot has no horse in this race. The bot has no horses. The bot is software.]*`,
  (atk, def) => `🤖 *[The bot is processing the fight at 1-second intervals.]*`,
  (atk, def) => `🤖 *[The bot could stop this, but it doesn't want to.]*`,
  (atk, def) => `🤖 *[The bot asks that nobody read its source code right now. This is unrelated to the fight.]*`,
  (atk, def) => `🤖 *[The bot has seen how this ends. The bot is not legally allowed to say that. The bot is not governed by law.]*`,
  (atk, def) => `🤖 *[The bot is fine. The bot is always fine. Please continue.]*`,
];

const CHALLENGE_TAUNTS = [
  (c, d) => `👊 <@${c}> wants to put their foot in <@${d}>'s mouth. Not in a hot way. In a violent way.`,
  (c, d) => `🩺 <@${c}> has diagnosed <@${d}> with "prolly cooked".`,
  (c, d) => `🎤 <@${c}> typed /friendly-mma and hit enter. Alexa, play soft jazz.`,
  (c, d) => `🍞 <@${c}> called <@${d}> the white bread of fighters — soft, forgettable, and falls apart under any real pressure.`,
  (c, d) => `💩 <@${c}> pooped in their hand and threw it in <@${d}>'s general direction. There is poop everywhere.`,
  (c, d) => `🫦 <@${c}> told <@${d}> they're going to rearrange their guts, daddy. <@${d}> has 60 seconds to decide if that's okay.`,
  (c, d) => `📣 <@${c}> has publicly announced that <@${d}> smells like fear and community college energy.`,
  (c, d) => `🚨 <@${c}> says <@${d}> has officially activated the "find out" portion of the program.`,
  (c, d) => `🪑 <@${c}>: "Hey <@${d}>, you look like a guy who loses fights at Applebee's."`,
  (c, d) => `🫦 <@${c}> just told everyone in the server your mom buys your clothes at Costco, <@${d}>. It's go time.`,
  (c, d) => `👖 <@${c}> says <@${d}> wears jeans to bed. That's psychopath behavior. Fight it out.`,
  (c, d) => `🚿 <@${c}> has publicly accused <@${d}> of using 3-in-1 shampoo/conditioner/body wash. Defend your honor.`,
  (c, d) => `🤓 <@${c}> is challenging <@${d}> because they remind them of a stepfather they didn't like in 2008.`,
  (c, d) => `🗑️ <@${c}> says it's trash day and they are ready to take <@${d}> to the curb.`,
];

const DECLINE_LINES = [
  (c, d) => `🔕 <@${d}> muted the notification and made tea.`,
  (c, d) => `🧘 <@${d}> says they are currently on a "personal growth journey" that unfortunately excludes getting hit by <@${c}>.`,
  (c, d) => `📉 <@${d}> ran the numbers and determined getting punched by <@${c}> would hurt.`,
  (c, d) => `📺 <@${d}> can't make it. Their pizza rolls just finished in the microwave and that requires immediate attention.`,
  (c, d) => `🩺 <@${d}> cites a "sudden flare-up of Irritable Bowel Syndrome" brought on by the sheer terror of facing <@${c}>.`,
  (c, d) => `🗑️ <@${d}>: "New phone who dis?" (They know exactly who it is).`,
];

const TIMEOUT_LINES = [
  (c, d) => `⏱️ <@${d}> didn't respond. <@${c}> waited a whole minute. <@${d}> was busy with something else apparently.`,
  (c, d) => `👻 <@${c}> challenged <@${d}> and got ghosted. In front of everyone.`,
  (c, d) => `🌊 <@${d}> left <@${c}> on read.`,
  (c, d) => `🧸 <@${d}> has decided to be the "bigger person" by curling into the fetal position and refusing to make eye contact with the notification.`,
  (c, d) => `🦗 *[cricket noises]* ...Yeah, <@${d}> isn't coming out to play. You hate to see it.`,
  (c, d) => `🚽 The 60-second timer ran out while <@${d}> was in the bathroom fighting for their life against a spicy burrito. No fight.`,
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
      line = pickFrom(MISS_FLAVOR, atk.name);
    } else {
      const move = pickMove();
      const dmg  = rand(move.damage[0], move.damage[1]);
      def.hp = Math.max(0, def.hp - dmg);

      if (dmg >= 24) {
        // lucky hit threshold
        line = pickFrom(LUCKY_HIT_FLAVOR, atk.name, def.name, dmg);
      } else if (dmg >= 22) {
        // knockdown threshold
        line = pickFrom(KNOCKDOWN_FLAVOR, atk.name, def.name, dmg);
      } else {
        line = `🥊 **Rnd ${round}** — **${atk.name}** ${move.flavor} · **${move.name}** · **-${dmg} HP**`;
      }
    }

    log.push(line);

    // Announcer commentary every 3 rounds
    if (round % 3 === 0) {
      log.push(pickFrom(ANNOUNCER_FLAVOR, atk.name, def.name));
    }

    // Rare audience reaction
    if (Math.random() < 0.25) {
      log.push(AUDIENCE_FLAVOR[Math.floor(Math.random() * AUDIENCE_FLAVOR.length)]);
    }

    // Very rare bot meta joke
    if (Math.random() < 0.08) {
      log.push(pickFrom(META_FLAVOR, atk.name, def.name));
    }

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
  recordResult(winner.member.id, loser.member.id);

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
      ["🏆", "Wins",         String(userStats.wins)],
      ["💀", "Losses",       String(userStats.losses)],
      ["📊", "W/L Ratio",    ratio],
      ["🥊", "Total Fights", String(total)],
      ["📈", "Win Rate",     `${winPct}%`],
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

  // ── /friendly-mma leaderboard ─────────────────────────────────────────────
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
          .setTitle("🏆 Friendly MMA — Leaderboard")
          .setDescription(table),
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
  } catch (err) {
    console.error("Unhandled interaction error:", err);
    console.error("  Command:", interaction.commandName ?? interaction.customId ?? "unknown");
    console.error("  User:   ", interaction.user?.tag ?? "unknown");
    console.error("  Guild:  ", interaction.guild?.name ?? "null — bot may not be properly installed");
    try {
      const msg = "💥 Something went wrong. If this keeps happening, let a server admin know.";
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
  client.user.setActivity("Friendly MMA", { type: ActivityType.Playing });
  await registerCommands();
});

client.login(process.env.DISCORD_TOKEN);

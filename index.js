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

require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

// ── Active fight tracking ─────────────────────────────────────────────────────
const activeFights = new Set();

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_HP          = 100;
const TIMEOUT_MINUTES = 5;
const ROUND_DELAY_MS  = 2000;
const CHALLENGE_TIMEOUT_MS = 60000; // 60s to accept/decline

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
          opt
            .setName("opponent")
            .setDescription("The person you want to fight")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("help")
        .setDescription("How Friendly MMA works")
    ),
].map((cmd) => cmd.toJSON());

// ── Register slash commands ───────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered globally.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hpBar(name, hp, max = MAX_HP) {
  const filled = Math.round((hp / max) * 10);
  const empty  = 10 - filled;
  const bar    = "🟥".repeat(Math.max(0, filled)) + "⬜".repeat(Math.max(0, empty));
  return `❤️ **${name}** ${bar} \`${hp}\``;
}

function buildFightEmbed({ title, log, fighters, color = 0xcc0000 }) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      log.map(l => `> ${l}`).join("\n") +
      "\n\u200B\n" +
      hpBar(fighters[0].name, fighters[0].hp) + "\n" +
      hpBar(fighters[1].name, fighters[1].hp)
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

  const LOG_SIZE = 4;
  const log = ["🎤 The fighters step into the cage..."];
  const embedTitle = `🥋 <@${challenger.id}> vs <@${defender.id}>`;

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
    if (log.length > LOG_SIZE) log.shift();

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

  // Final KO embed
  await fightMsg.edit({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`💀 Fight Over! 💀`)
        .setDescription(
          `> 🏆 **${winner.name}** wins by knockout!\n` +
          `> 😬 **${loser.name}** has been defeated.\n` +
          `\n\u200B\n` +
          hpBar(fighters[0].name, fighters[0].hp) + "\n" +
          hpBar(fighters[1].name, fighters[1].hp)
        ),
    ],
  });

  try {
    await loser.member.timeout(
      TIMEOUT_MINUTES * 60 * 1000,
      `Lost a Friendly MMA fight against ${winner.name}`
    );
    await channel.send(
      `🔇 <@${loser.member.id}> has been muted for ${TIMEOUT_MINUTES} minutes. Take the L.`
    );
  } catch {
    await channel.send(
      `⚠️ Couldn't time out <@${loser.member.id}> — they may be a mod or above my role. They escape justice... for now.`
    );
  }
}

// ── Interaction handler ───────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // ── Button: accept/decline challenge ─────────────────────────────────────
  if (interaction.isButton()) {
    const [action, challengerId, defenderId] = interaction.customId.split(":");

    if (!["mma_accept", "mma_decline"].includes(action)) return;

    // Only the challenged user can respond
    if (interaction.user.id !== defenderId) {
      return interaction.reply({ content: "⚠️ This challenge isn't for you.", ephemeral: true });
    }

    if (action === "mma_decline") {
      await interaction.update({
        content: `❌ <@${defenderId}> declined the challenge.`,
        embeds: [],
        components: [],
      });
      const fightKey = [challengerId, defenderId].sort().join("-");
      activeFights.delete(fightKey);
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
        const fightKey = [challengerId, defenderId].sort().join("-");
        activeFights.delete(fightKey);
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
        `\`/friendly-mma help\` — show this message\n\n` +
        `**How it works**\n` +
        `> Both fighters start at **${MAX_HP} HP**. Rounds alternate attacks until someone hits 0.\n` +
        `> Moves deal random damage. There's a 15% miss chance per round.\n` +
        `> The loser is timed out for **${TIMEOUT_MINUTES} minutes** automatically.\n\n` +
        `*Part of the **Friendly** bot suite.*`,
      ephemeral: true,
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

    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.editReply({
        content: "⚠️ I need the **Moderate Members** permission to time out the loser. Ask a server admin!",
      });
    }

    const fightKey = [interaction.user.id, opponent.id].sort().join("-");
    if (activeFights.has(fightKey)) {
      return interaction.editReply({
        content: "⚠️ These two are already fighting! Wait for the current bout to finish.",
      });
    }

    activeFights.add(fightKey);

    // Build accept/decline buttons
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

    await interaction.editReply({
      content: `🥋 <@${interaction.user.id}> has challenged <@${opponent.id}> to an MMA fight!\n<@${opponent.id}>, do you accept?`,
      components: [row],
    });

    // Auto-expire the challenge after 60s
    setTimeout(async () => {
      if (!activeFights.has(fightKey)) return; // already resolved
      activeFights.delete(fightKey);
      try {
        await interaction.editReply({
          content: `⏱️ <@${opponent.id}> didn't respond in time. Challenge expired.`,
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

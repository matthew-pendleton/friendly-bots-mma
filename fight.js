const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const {
  MOVES,
  MISS_FLAVOR,
  KNOCKDOWN_FLAVOR,
  ANNOUNCER_FLAVOR,
  AUDIENCE_FLAVOR,
  META_FLAVOR,
  FINISHERS,
} = require("./dialogue");

const { recordResult } = require("./stats");

function pickFrom(arr, ...args) {
  return arr[Math.floor(Math.random() * arr.length)](...args);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hpBar(name, hp, nameWidth, maxHp) {
  const filled = Math.round((hp / maxHp) * 10);
  const empty = 10 - filled;
  const bar = "🟥".repeat(Math.max(0, filled)) + "⬜".repeat(Math.max(0, empty));
  const padded = name.padEnd(nameWidth, " ");
  return `❤️ \`${padded}\` ${bar} \`${hp}\``;
}

const DESCRIPTION_LIMIT = 3800; // safe buffer under Discord's 4096 cap

function buildFightEmbed({ title, log, fighters, maxHp, color = 0xcc0000 }) {
  const nameWidth = Math.max(fighters[0].name.length, fighters[1].name.length);
  const hpLines =
    "\n\u200B\n" +
    hpBar(fighters[0].name, fighters[0].hp, nameWidth, maxHp) +
    "\n" +
    hpBar(fighters[1].name, fighters[1].hp, nameWidth, maxHp);

  const formatLine = (l) => {
    if (l.startsWith("🎙️") || l.startsWith("👥") || l.startsWith("🤖") || l.startsWith("🎤")) return `> ${l}`;
    return l;
  };

  // Trim oldest log lines if we're approaching the embed description limit
  let trimmedLog = [...log];
  while (trimmedLog.length > 1) {
    const desc = trimmedLog.map(formatLine).join("\n") + hpLines;
    if (desc.length <= DESCRIPTION_LIMIT) break;
    trimmedLog.shift();
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(trimmedLog.map(formatLine).join("\n") + hpLines);
}

function pickMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

function isMiss() {
  return Math.random() < 0.15;
}

function createFightEngine(config) {
  const {
    MAX_HP,
    TIMEOUT_MINUTES,
    ROUND_DELAY_MS,
    ANNOUNCER_EVERY_ROUNDS,
    AUDIENCE_CHANCE,
    META_CHANCE,
    POST_FIGHT_DECISION_MS,
  } = config;

  async function runFight(channel, challenger, defender) {
    const fighters = [
      { member: challenger, hp: MAX_HP, name: challenger.displayName },
      { member: defender, hp: MAX_HP, name: defender.displayName },
    ];

    const log = ["🎤 The fighters step into the cage..."];
    const embedTitle = `🥋 ${fighters[0].name} vs ${fighters[1].name}`;

    const fightMsg = await channel.send({
      embeds: [buildFightEmbed({ title: embedTitle, log, fighters, maxHp: MAX_HP })],
    });

    await sleep(ROUND_DELAY_MS);

    let attacker = rand(0, 1);
    let round = 1;

    while (fighters[0].hp > 0 && fighters[1].hp > 0) {
      const atk = fighters[attacker];
      const def = fighters[attacker === 0 ? 1 : 0];

      let line;
      if (isMiss()) {
        line = pickFrom(MISS_FLAVOR, atk.name);
      } else {
        const move = pickMove();
        const dmg = rand(move.damage[0], move.damage[1]);
        def.hp = Math.max(0, def.hp - dmg);

        if (dmg >= 22) {
          // Knockdown — special flavor text, no blockquote
          line = pickFrom(KNOCKDOWN_FLAVOR, atk.name, def.name, dmg);
        } else {
          line = `→ **${atk.name}** ${move.flavor} · **${move.name}** · \`-${dmg} HP\``;
        }
      }

      log.push(line);

      // Announcer commentary periodically
      if (ANNOUNCER_EVERY_ROUNDS > 0 && round % ANNOUNCER_EVERY_ROUNDS === 0) {
        log.push(pickFrom(ANNOUNCER_FLAVOR, atk.name, def.name));
      }

      // Audience reaction
      if (Math.random() < AUDIENCE_CHANCE) {
        log.push(AUDIENCE_FLAVOR[Math.floor(Math.random() * AUDIENCE_FLAVOR.length)]);
      }

      // Bot meta joke
      if (Math.random() < META_CHANCE) {
        log.push(pickFrom(META_FLAVOR, atk.name, def.name));
      }

      await fightMsg.edit({
        embeds: [buildFightEmbed({ title: embedTitle, log, fighters, maxHp: MAX_HP })],
      });

      await sleep(ROUND_DELAY_MS);

      if (fighters[0].hp <= 0 || fighters[1].hp <= 0) break;

      attacker = attacker === 0 ? 1 : 0;
      round++;
    }

    const loser = fighters[0].hp <= 0 ? fighters[0] : fighters[1];
    const winner = fighters[0].hp <= 0 ? fighters[1] : fighters[0];

    recordResult(winner.member.id, loser.member.id);

    const nameWidth = Math.max(fighters[0].name.length, fighters[1].name.length);
    const finalEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("💀 Fight Over! 💀")
      .setDescription(
        log
          .map((l) => {
            if (l.startsWith("🎙️") || l.startsWith("👥") || l.startsWith("🤖")) return `> ${l}`;
            return l;
          })
          .join("\n") +
          "\n\u200B\n" +
          hpBar(fighters[0].name, fighters[0].hp, nameWidth, MAX_HP) +
          "\n" +
          hpBar(fighters[1].name, fighters[1].hp, nameWidth, MAX_HP)
      );

    await fightMsg.edit({ embeds: [finalEmbed] });

    // Server admin controls timeout: only attempt it if the bot has Moderate Members in this server.
    const canModerate = !!channel.guild?.members?.me?.permissions?.has(PermissionsBitField.Flags.ModerateMembers);

    const decisionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mma_finish:${winner.member.id}:${loser.member.id}`)
        .setLabel("💀 Finish Them")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(false),
      new ButtonBuilder()
        .setCustomId(`mma_shake:${winner.member.id}:${loser.member.id}`)
        .setLabel("Shake hands")
        .setStyle(ButtonStyle.Secondary)
    );

    const decisionMsg = await channel.send({
      content: `🏆 <@${winner.member.id}>, your call. What happens to <@${loser.member.id}>?`,
      components: [decisionRow],
    });

    const resolveShakeHands = async (reason) => {
      await decisionMsg.edit({
        content: `🤝 Shake hands. No timeout. (${reason})`,
        components: [],
      });
    };

    try {
      const press = await decisionMsg.awaitMessageComponent({
        time: POST_FIGHT_DECISION_MS,
        filter: (i) => {
          const [action, winnerId, loserId] = i.customId.split(":");
          if (!["mma_finish", "mma_shake"].includes(action)) return false;
          if (winnerId !== winner.member.id || loserId !== loser.member.id) return false;
          if (i.user.id !== winner.member.id) {
            i.reply({ content: "⚠️ Only the winner can decide.", ephemeral: true }).catch(() => null);
            return false;
          }
          return true;
        },
      });

      const [action] = press.customId.split(":");

      if (action === "mma_shake") {
        await press.update({ content: `🤝 <@${winner.member.id}> chose mercy. Nobody gets timed out.`, components: [] });
        return;
      }

      await press.update({
        content: `💀 <@${winner.member.id}> said finish them. The ref is reaching for the timeout button...`,
        components: [],
      });

      const finisherLine = pickFrom(FINISHERS, winner.name, loser.name);
      const consequenceText = canModerate
        ? `**Consequence**: <@${loser.member.id}> gets timed out for **${TIMEOUT_MINUTES} minutes**.`
        : `**Consequence**: *(No timeout — this server hasn't granted me Moderate Members.)*`;
      const finisherEmbed = new EmbedBuilder()
        .setColor(0xcc0000)
        .setTitle("💀 FINISH THEM")
        .setDescription(`${finisherLine}\n\n${consequenceText}`);

      if (canModerate) {
        try {
          await loser.member.timeout(TIMEOUT_MINUTES * 60 * 1000, `Lost an Unfriendly MMA fight against ${winner.name}`);
          await channel.send({ embeds: [finisherEmbed] });
        } catch {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x808080)
                .setTitle("⚠️ Couldn't finish them")
                .setDescription(
                  `${finisherLine}\n\n` +
                  `Tried to time out <@${loser.member.id}>, but they may be a mod or above my role.`
                ),
            ],
          });
        }
      } else {
        await channel.send({ embeds: [finisherEmbed] });
      }
    } catch {
      await resolveShakeHands("no response in 10s");
    }
  }

  return { runFight };
}

module.exports = {
  createFightEngine,
};


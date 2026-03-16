// ── Fight dialogue tables ─────────────────────────────────────────────────────
// Content-only module: keep fight logic in `index.js`, and keep all copy here.

// Moves used for standard (non-miss) rounds.
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

// Used when a round "misses" (no damage dealt). Styled like a normal line with `miss`.
const MISS_FLAVOR = [
  (atk) => `**${atk}** — skill issue · \`miss\``,
  (atk) => `**${atk}** misses. Clean. Nothing. Air. · \`miss\``,
  (atk) => `**${atk}** throws that and expects it to land. It does not land. · \`miss\``,
  (atk) => `**${atk}** whiffs and the ref is genuinely embarrassed for them. · \`miss\``,
  (atk) => `**${atk}** just kicked the concept of fighting and made contact with nothing. · \`miss\``,
  (atk) => `**${atk}** swings. Miss. That's it. That's what happened. · \`miss\``,
  (atk) => `**${atk}** shoots for a takedown and arrives on the ground alone. · \`miss\``,
  (atk) => `**${atk}** was not ready to throw that and it showed. · \`miss\``,
  (atk) => `**${atk}** misses so wide someone in the crowd ducks. · \`miss\``,
  (atk) => `**${atk}** — no. Just no. · \`miss\``,
  (atk) => `**${atk}** attempts anime protagonist energy. Whiff. · \`miss\``,
  (atk) => `**${atk}** attempts violence but achieves interpretive dance by accident. · \`miss\``,
];

// Used on high-damage rounds (knockdown flavor line). Styled like a normal hit line.
const KNOCKDOWN_FLAVOR = [
  (atk, def, dmg) => `**${atk}** hits **${def}** so hard they wake up on that cart in Skyrim — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${def}** wakes up mid-fight and immediately wishes they hadn't — \`-${dmg} HP\` from **${atk}**`,
  (atk, def, dmg) => `**${atk}** catches **${def}** so hard it makes NSFW sounds — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${atk}** just rearranged **${def}**'s entire afternoon — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${def}** takes \`-${dmg} HP\` and their body files a formal complaint with their brain`,
  (atk, def, dmg) => `**${atk}** lands that and **${def}**'s legs send a resignation letter — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${def}** is still standing. **${atk}** is fixing that — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${atk}** hits **${def}** with something that has no business being that clean — \`-${dmg} HP\``,
];

// Used for very high-damage rounds, formatted like a normal hit line.
const LUCKY_HIT_FLAVOR = [
  (atk, def, dmg) => `→ **${atk}** puts their foot up **${def}**'s bottom and it comes out their top · \`-${dmg} HP\``,
  (atk, def, dmg) => `→ **${atk}** closes their eyes, swings, and **${def}** takes the hit. No notes. · \`-${dmg} HP\``,
  (atk, def, dmg) => `→ **${atk}** had no right to land that. **${def}** loses HP anyway. · \`-${dmg} HP\``,
  (atk, def, dmg) => `→ **${def}** walks directly into it. Freely. Of their own will. · \`-${dmg} HP\``,
  (atk, def, dmg) => `→ That was dumb luck and everybody knows it. **${def}** loses HP regardless. · \`-${dmg} HP\``,
  (atk, def, dmg) => `→ **${atk}** sneezes mid-swing and it lands. **${def}** is devastated. We all are. · \`-${dmg} HP\``,
];

// Periodic commentary sprinkled into the fight log.
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

// Random "chat messages" sprinkled into the fight log.
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

// Rare bot self-referential lines sprinkled into the fight log.
const META_FLAVOR = [
  (atk, def) => `🤖 *[The bot would like to clarify that it does not enjoy this.]*`,
  (atk, def) => `🤖 *[The bot has no horse in this race. The bot has no horses. The bot is software.]*`,
  (atk, def) => `🤖 *[The bot is processing the fight at 1-second intervals.]*`,
  (atk, def) => `🤖 *[The bot could stop this, but it doesn't want to.]*`,
  (atk, def) => `🤖 *[The bot asks that nobody read its source code right now. This is unrelated to the fight.]*`,
  (atk, def) => `🤖 *[The bot has seen how this ends. The bot is not legally allowed to say that. The bot is not governed by law.]*`,
  (atk, def) => `🤖 *[The bot is fine. The bot is always fine. Please continue.]*`,
];

// Used only if the winner selects "💀 Finish Them" after the KO.
const FINISHERS = [
  (w, l) => `💀 FINISH IT — **${w}** drops **${l}** with a *picture-perfect* head kick. It's done.`,
  (w, l) => `💀 FINISHER — **${w}** sleeps **${l}** with a left hook that should require a permit.`,
  (w, l) => `💀 FINISHER — **${w}** hits the takedown, mounts, and the ref saves **${l}** from the rest of it.`,
  (w, l) => `💀 FINISHER — **${w}** lands a flying knee. **${l}** immediately starts loading the respawn screen.`,
  (w, l) => `💀 FINISHER — **${w}** locks in a choke. **${l}** taps like they're trying to start a fire.`,
  (w, l) => `💀 FINISHER — **${w}** piles on ground & pound until the ref physically says "enough".`,
  (w, l) => `💀 FINISHER — **${w}** feints, then detonates an uppercut. **${l}** is spiritually absent.`,
  (w, l) => `💀 FINISHER — **${w}** lands an elbow in the clinch. **${l}** rethinks every decision since 2008.`,
];

// Used when a challenge is issued (shown publicly with accept/decline buttons).
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

// Used if the defender clicks "Decline".
const DECLINE_LINES = [
  (c, d) => `🔕 <@${d}> muted the notification and made tea.`,
  (c, d) => `🧘 <@${d}> says they are currently on a "personal growth journey" that unfortunately excludes getting hit by <@${c}>.`,
  (c, d) => `📉 <@${d}> ran the numbers and determined getting punched by <@${c}> would hurt.`,
  (c, d) => `📺 <@${d}> can't make it. Their pizza rolls just finished in the microwave and that requires immediate attention.`,
  (c, d) => `🩺 <@${d}> cites a "sudden flare-up of Irritable Bowel Syndrome" brought on by the sheer terror of facing <@${c}>.`,
  (c, d) => `🗑️ <@${d}>: "New phone who dis?" (They know exactly who it is).`,
];

// Used if the defender doesn't respond to a challenge within 60 seconds.
const TIMEOUT_LINES = [
  (c, d) => `⏱️ <@${d}> didn't respond. <@${c}> waited a whole minute. <@${d}> was busy with something else apparently.`,
  (c, d) => `👻 <@${c}> challenged <@${d}> and got ghosted. In front of everyone.`,
  (c, d) => `🌊 <@${d}> left <@${c}> on read.`,
  (c, d) => `🧸 <@${d}> has decided to be the "bigger person" by curling into the fetal position and refusing to make eye contact with the notification.`,
  (c, d) => `🦗 *[cricket noises]* ...Yeah, <@${d}> isn't coming out to play. You hate to see it.`,
  (c, d) => `🚽 The 60-second timer ran out while <@${d}> was in the bathroom fighting for their life against a spicy burrito. No fight.`,
];

module.exports = {
  MOVES,
  MISS_FLAVOR,
  KNOCKDOWN_FLAVOR,
  LUCKY_HIT_FLAVOR,
  ANNOUNCER_FLAVOR,
  AUDIENCE_FLAVOR,
  META_FLAVOR,
  FINISHERS,
  CHALLENGE_TAUNTS,
  DECLINE_LINES,
  TIMEOUT_LINES,
};


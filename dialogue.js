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
  (atk) => `**${atk}** doesn't have enough PP for this move! *classic, amirite??*. · \`miss\``,
  (atk) => `**${atk}** swings. It does not land. · \`miss\``,
  (atk) => `**${atk}** attempts anime protagonist energy. Whiff. · \`miss\``,
  (atk) => `**${atk}** attempts violence. · \`miss\``,
];

// Used on high-damage rounds (knockdown flavor line). Styled like a normal hit line.
const KNOCKDOWN_FLAVOR = [
  (atk, def, dmg) => `**${atk}** hits **${def}** so hard they wake up on that cart in Skyrim — \`-${dmg} HP\``,
  (atk, def, dmg) => `**${atk}** catches **${def}** so hard it makes NSFW sounds — \`-${dmg} HP\``,
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
  (w, l) => `💀 **FINISHER** — **${w}** uses **THUNDERBOLT**. *It’s super effective!* Oh fuck, they’re dead.`,
  (w, l) => `💀 **FINISHER** — **${w}** hits **${l}** with the 'Five Point Palm Exploding Heart Technique.' **${l}** takes three steps and their heart... well, explodes.`,
  (w, l) => `💀 **FINISHER** — **${w}** pulls out a strange black notebook, and starts writing furiously. **${l}** immediately drops, clutching their chest. *Cardiac arrest.* Who knew?`,
  (w, l) => `💀 **FINISHER** — *“My God! **${w}** has a bright red tortoise shell! Don't do it! For the love of everything, don't do it!”* **BOOM.** Direct impact. The referee is waving it off. **${l}** is... **${l}** is just *dust*. 🐢💥`,
  (w, l) => `💀 **BRUTALITY** — *“What is this?! **${w}** just rolled a massive steel oxygen tank into the cage! He’s trying to jam it into **${l}**’s mouth! NO! NO! Don’t tell me... **${w}** has a revolver! He shoots the tank! **KABOOM!** It is a slaughterhouse in there! **${l}** is scattered in pieces across the first three rows!”* 💥🦈`,
  (w, l) => `💀 **FINISHER** — *“Here comes **${w}**! **${w}** has the steel ch—wait. That’s not a chair. That's a... little black notebook? **${w}** just wrote... **${l}**'s name in it? ...Wait, **${l}** just dropped. Cardiac arrest! He’s clutching his chest! **${l}** is fading! A *HEART ATTACK*?! THIS IS NOT THE WAY I WANTED THIS MAIN EVENT TO END!”* 📓`,
  (w, l) => `💀 **BRUTALITY** — *“Look at **${w}**! While **${l}** was recovering, **${w}** just... *piled up* blocks of T-N-T in the corner? He's running wires! He has a lever! ...*“FOR THE LOVE OF JERRY LAWLER, NO!”* 💥*💥*💥 **${l}** has been atomized into blocky particles! **${w}** is standing there mining the referee! What am I witnessing?!”*`,
  (w, l) => `💀 **FINISHER** — *“**${w}** is powering up! He's yelling **some weeby nonsense**!! Good Lord, the entire arena is illuminating! **${w}** unleashes a beam of pure energy! **${l}** isn't just knocked out, **${l}** has been turned into a fine, glowing dust! He’s gone! There’s nothing left!”* 💥🌌`,
  (w, l) => `💀 **FINISHER** — *“**${w}** has found... a fire flower? In the middle of an MMA fight?! **${w}** eats it... and **${w}**'s mouth is glowing! No! No! Don’t you do it! He spits it! **A LIVING FIREBALL!** **${l}** has been engulfed! **${l}** is screaming! The referee is running away! **${l}** is a baked potato! This is insanity!”* 🔥🍄`,
  (w, l) => `💀 **FATALITY** — *“Here we go! **${w}** has **${l}** on the ropes... literally, the cage rope! **${w}** is wrapping it around **${l}**'s neck... **${w}** spins **${l}**... **THE BODY HAS SEPARATED!** **${w}** is holding **${l}**'s spinal cord like a trophy! *BY GOD, WHAT HAS HAPPENED TO OUR SPORT?!*”* 🩸🦴`,
  (w, l) => `💀 **BRUTALITY** — *“**${w}**... has an ancient gold box? It’s *the Ark of the Covenant*! He’s opening it! NO! NO! Don't look at it! *Don’t look at it, **${l}**!* ...Oh, good sweet heavens! **${l}** looked! **${l}**’s face is melting! The flesh! The eyeballs! **IT’S ALL RUNNING LIKE HOT WAX!** **${l}** has disintegrated into a puddle of goo! *WHY IS THIS OCCURRING IN OUR MAIN EVENT?!*”* 🕋🔥`,
  (w, l) => `💀 **BRUTALITY** — *“What in the actual fuck?! The arena gates are crashing down! That’s... that’s a full-grown Tyrannosaurus Rex! Where did **${w}** even— *GOOD GOD!* The beast has **${l}** by the midsection! The CRUNCH! That poor bastard has been bisected and swallowed in one bite!”* 🦖💥`,
  (w, l) => `💀 **BRUTALITY** — *“My God! **${w}** has snapped! **${w}** has grabbed a fire axe and is chopping down the cage door! For the love of Jerry Lawler, he’s through! NO! **THE AXE!** He just split **${l}**’s head vertically down the middle! This isn't wrestling! This is a horror movie! Someone stop this! **WHERE ARE THE MODS?!**”* 🪓🚪`,
  (w, l) => `💀 **FATALITY** — *“What is that glowing stick? Is that... is that an actual lightsaber?! For the love of everything, don't! **${w}** swings... *'By the rivers of Babylon!'* **${l}** has been perfectly cut in half! Vertically separated! The anatomy... **THE ANATOMY IS WRONG!** **${l}**’s insides are cartoon dust! What am I witnessing?!”* 🗡️🌌`,
  (w, l) => `💀 **FINISHER** — *“**${l}** lands a powerful roundhouse kick... but **${w}** just bent backward in slow motion?! What am I seeing? **${w}** dodged! They whisper 'My name... is **${w}**,'... **AND PUNCHES THEIR FIST DIRECTLY THROUGH **${l}**'S HEART!** **${w}**’s hand is on the other side! This is murder!”* 🖥️❤️`,
  (w, l) => `💀 **FINISHER** — *“My God! **${w}** has reached under the ring... that’s not a chair! That's an industrial staple gun! NO! Don’t you do it! He’s grabbed **${l}**’s nose! **CHUNQUE.** *Oh, the humanity!* He just stapled **${l}**’s nose directly to his own chest! **${l}** is screaming! **${w}** just got a three-count and is stapling a 'Property of **${w}**' sign to the canvas! It’s a tragedy!”* 🔫👃`,
  (w, l) => `💀 **FINISHER** — *“**${w}** just pulled out a vintage 1887 shotgun! **${w}** puts on a pair of sunglasses and says... 'Hasta la vista, **baby**.' He puts the barrel right in **${l}**'s face. *BLAM!* By god, there’s a metallic endoskeleton where **${l}** used to be! Was this entire fight staged?!”* 😎🔫`,

];

// Used when a challenge is issued (shown publicly with accept/decline buttons).
const CHALLENGE_TAUNTS = [
  (c, d) => `👊 <@${c}> wants to put their foot in <@${d}>'s mouth. Not in a hot way. In a violent way.`,
  (c, d) => `🩺 <@${c}> has diagnosed <@${d}> with "prolly cooked".`,
  (c, d) => `🎤 <@${c}> typed /unfriendly-mma and hit enter. Alexa, play soft jazz.`,
  (c, d) => `🍞 <@${c}> called <@${d}> the white bread of fighters — soft, forgettable, and falls apart under any real pressure.`,
  (c, d) => `💩 <@${c}> pooped in their hand and threw it in <@${d}>'s general direction. There is poop everywhere.`,
  (c, d) => `🫦 <@${c}> told <@${d}> they're going to rearrange their guts, daddy. <@${d}> has 60 seconds to decide if that's okay.`,
  (c, d) => `📣 <@${c}> has publicly announced that <@${d}> smells like fear and community college energy.`,
  (c, d) => `🚨 <@${c}> says <@${d}> has officially activated the "find out" portion of the program.`,
  (c, d) => `🪑 <@${c}> Hey <@${d}>, you look like a guy who loses fights at Applebee's.`,
  (c, d) => `🫦 <@${c}> just told everyone in the server your mom buys your clothes at Costco, <@${d}>. It's go time.`,
  (c, d) => `👖 <@${c}> says <@${d}> wears jeans to bed. That's psychopath behavior. Fight it out.`,
  (c, d) => `🚿 <@${c}> has publicly accused <@${d}> of using 3-in-1 shampoo/conditioner/body wash. Defend your honor.`,
  (c, d) => `🤓 <@${c}> is challenging <@${d}> because they remind them of a stepfather they didn't like in 2008.`,
  (c, d) => `🗑️ <@${c}> says it's trash day and they are ready to take <@${d}> to the curb.`,
  (c, d) => `🥣 <@${c}> is accusing <@${d}> of putting the milk in the bowl *before* the cereal. We can't have people like that in this server.`,
  (c, d) => `🤮 <@${c}> is accusing <@${d}> of dipping their pineapple and tuna pizza *into* a lukewarm glass of whole milk. This is unacceptable! This is outrageous! This is a cry for help or a fight!`,
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


const fs = require("fs");
const path = require("path");

const STATS_FILE = path.join(__dirname, "stats.json");

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    // corrupt file — start fresh
  }
  return {};
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function recordResult(winnerId, loserId) {
  const stats = loadStats();

  if (!stats[winnerId]) stats[winnerId] = { wins: 0, losses: 0 };
  if (!stats[loserId]) stats[loserId] = { wins: 0, losses: 0 };

  stats[winnerId].wins += 1;
  stats[loserId].losses += 1;

  saveStats(stats);
}

module.exports = {
  loadStats,
  recordResult,
};


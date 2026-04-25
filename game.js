"use strict";

// ----- Config ----------------------------------------------------
const SAVE_KEY = "deepSeaSalvage_v1";
const TICK_MS = 100;
const OFFLINE_CAP_HOURS = 8;
const BOOST_DURATION_MS = 10000;     // initial active duration on first click
const MAX_BOOST_DURATION_MS = 10000; // cap on remaining boost time (no stockpiling)
const BOOST_COOLDOWN_MS = 25000;     // cooldown AFTER boost ends (fixed)
const BOOST_EXTEND_MS = 500;         // each click during boost extends by this
const BOOST_SPEED_MULT = 3;
const BOOST_LOOT_MULT = 3;
const LOOT_INTERVAL_BASE = 6;        // seconds between attempts at sonar=1
const MAX_PICKS_PER_DIVE = 8;        // hard cap on items per dive
const LEVEL_BASE_COST = 20;
const LEVEL_COST_MULT = 1.55;
const TIER_BONUS = 0.20;             // +20% loot value per rank
const TIER_PICK_BONUS = 1;           // +1 max picks per dive per rank
const SUB_RANKS = [
  "Deckhand",       // 1
  "Salvager",       // 2
  "Captain",        // 3
  "Commodore",      // 4
  "Admiral",        // 5
  "Fleet Admiral",  // 6
  "Pirate King",    // 7
  "Sea Lord",       // 8
  "Leviathan",      // 9
  "Abyssal Mythic", // 10+
];
const PITY_LEGENDARY_DIVES = 50;
const ENCOUNTER_CHANCE = 0.12;

const LEVELS_PER_BIOME = 10;

const BIOMES = [
  { name: "Sunlit Reef",           color: "#7fc6e8", accent: "#aef0ff" },
  { name: "Twilight Wreck",        color: "#2a8fc4", accent: "#5fb0e0" },
  { name: "Midnight Trench",       color: "#0f3a5a", accent: "#7d90c8" },
  { name: "Abyssal Plain",         color: "#06223a", accent: "#9070cc" },
  { name: "Hadal Depths",          color: "#02131f", accent: "#c45050" },
  { name: "Lava Vents",            color: "#3a0a0a", accent: "#ff6633" },
  { name: "Bioluminescent Forest", color: "#1a0a3a", accent: "#c79bff" },
  { name: "Crystal Caverns",       color: "#0a3a4a", accent: "#a0e8ff" },
  { name: "Forgotten Temple",      color: "#3a2a0a", accent: "#ffcc66" },
  { name: "The Singularity",       color: "#0a0a0a", accent: "#aa55ff" },
];

// Loot table — weighted picks per biome. Scales ~4x per biome.
const LOOT = {
  "Sunlit Reef": [
    { icon: "🍾", name: "Plastic Bottle",    weight: 0.2, value: 1,    rarity: "common",   chance: 50 },
    { icon: "🪙", name: "Rusty Coin",        weight: 0.1, value: 3,    rarity: "common",   chance: 30 },
    { icon: "🎣", name: "Fishing Lure",      weight: 0.3, value: 8,    rarity: "uncommon", chance: 15 },
    { icon: "🕸",  name: "Tangled Net",       weight: 1.5, value: 18,   rarity: "uncommon", chance: 4 },
    { icon: "🍶", name: "Antique Bottle",    weight: 0.4, value: 60,   rarity: "rare",     chance: 1 },
  ],
  "Twilight Wreck": [
    { icon: "🪵", name: "Ship Plank",        weight: 1.2, value: 4,     rarity: "common",   chance: 47 },
    { icon: "⚙",  name: "Brass Fitting",     weight: 0.5, value: 12,    rarity: "common",   chance: 25 },
    { icon: "💰", name: "Pirate Doubloon",   weight: 0.1, value: 40,    rarity: "uncommon", chance: 18 },
    { icon: "📦", name: "Sealed Crate",      weight: 4,   value: 110,   rarity: "rare",     chance: 7 },
    { icon: "🧭", name: "Golden Compass",    weight: 0.6, value: 300,   rarity: "rare",     chance: 2 },
    { icon: "🗝",  name: "Captain's Chest",   weight: 8,   value: 1200,  rarity: "epic",     chance: 1 },
  ],
  "Midnight Trench": [
    { icon: "⚓", name: "Coral-Crusted Anchor", weight: 6,   value: 25,    rarity: "common",   chance: 48 },
    { icon: "💣", name: "Iron Cannon",          weight: 9,   value: 80,    rarity: "uncommon", chance: 30 },
    { icon: "⚫", name: "Black Pearl",          weight: 0.1, value: 250,   rarity: "rare",     chance: 10 },
    { icon: "🗿", name: "Sunken Idol",          weight: 4,   value: 750,   rarity: "epic",     chance: 10 },
    { icon: "💀", name: "Glowing Skull",        weight: 1,   value: 2400,  rarity: "legend",   chance: 2 },
  ],
  "Abyssal Plain": [
    { icon: "🪨", name: "Manganese Nodule",   weight: 2,   value: 130,    rarity: "common",   chance: 45 },
    { icon: "🦴", name: "Strange Vertebra",   weight: 1,   value: 400,    rarity: "uncommon", chance: 28 },
    { icon: "⛰",  name: "Black Smoker Shard", weight: 3,   value: 1100,   rarity: "rare",     chance: 12 },
    { icon: "🥚", name: "Fossilized Egg",     weight: 5,   value: 3200,   rarity: "epic",     chance: 12 },
    { icon: "💎", name: "Living Crystal",     weight: 0.4, value: 10000,  rarity: "legend",   chance: 3 },
  ],
  "Hadal Depths": [
    { icon: "🌑", name: "Pressure-Fused Ore",   weight: 4,   value: 500,    rarity: "common",   chance: 45 },
    { icon: "🦷", name: "Unknown Tooth",        weight: 0.5, value: 1600,   rarity: "uncommon", chance: 28 },
    { icon: "⬛", name: "Obsidian Tablet",      weight: 6,   value: 4500,   rarity: "rare",     chance: 12 },
    { icon: "❤",  name: "Bioluminescent Heart", weight: 2,   value: 13000,  rarity: "epic",     chance: 12 },
    { icon: "👁",  name: "The Whisper",          weight: 0.1, value: 40000,  rarity: "legend",   chance: 3 },
  ],
  "Lava Vents": [
    { icon: "🌋", name: "Magma Rock",        weight: 3,   value: 2000,    rarity: "common",   chance: 45 },
    { icon: "🔥", name: "Fire Crystal",      weight: 0.4, value: 6000,    rarity: "uncommon", chance: 28 },
    { icon: "🦎", name: "Salamander Egg",    weight: 1,   value: 18000,   rarity: "rare",     chance: 12 },
    { icon: "⚱",  name: "Magmaglass",        weight: 5,   value: 55000,   rarity: "epic",     chance: 12 },
    { icon: "🪶", name: "Phoenix Feather",   weight: 0.05,value: 170000,  rarity: "legend",   chance: 3 },
  ],
  "Bioluminescent Forest": [
    { icon: "🌿", name: "Glow Algae",        weight: 0.5, value: 8000,    rarity: "common",   chance: 45 },
    { icon: "🐟", name: "Lanternfish Skull", weight: 0.3, value: 25000,   rarity: "uncommon", chance: 28 },
    { icon: "💧", name: "Photonic Gel",      weight: 1,   value: 75000,   rarity: "rare",     chance: 12 },
    { icon: "🟣", name: "Prism Slime",       weight: 2,   value: 220000,  rarity: "epic",     chance: 12 },
    { icon: "🏮", name: "Eternal Lantern",   weight: 0.5, value: 700000,  rarity: "legend",   chance: 3 },
  ],
  "Crystal Caverns": [
    { icon: "🔷", name: "Geode Shard",       weight: 1,   value: 32000,   rarity: "common",   chance: 45 },
    { icon: "🔺", name: "Refraction Prism",  weight: 0.5, value: 100000,  rarity: "uncommon", chance: 28 },
    { icon: "💜", name: "Crystal Heart",     weight: 2,   value: 300000,  rarity: "rare",     chance: 12 },
    { icon: "💎", name: "Perfect Diamond",   weight: 0.1, value: 900000,  rarity: "epic",     chance: 12 },
    { icon: "⏳", name: "Time Crystal",      weight: 0.3, value: 2800000, rarity: "legend",   chance: 3 },
  ],
  "Forgotten Temple": [
    { icon: "🪙", name: "Gold Coin",         weight: 0.05,value: 130000,    rarity: "common",   chance: 45 },
    { icon: "🗿", name: "Idol Fragment",     weight: 1,   value: 400000,    rarity: "uncommon", chance: 28 },
    { icon: "👺", name: "Ceremonial Mask",   weight: 2,   value: 1200000,   rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Sun Crown",         weight: 3,   value: 3600000,   rarity: "epic",     chance: 12 },
    { icon: "📜", name: "Lost God Relic",    weight: 5,   value: 11000000,  rarity: "legend",   chance: 3 },
  ],
  "The Singularity": [
    { icon: "🌌", name: "Void Shard",        weight: 0.1, value: 500000,    rarity: "common",   chance: 45 },
    { icon: "⏱",  name: "Time Fragment",     weight: 0.05,value: 1600000,   rarity: "uncommon", chance: 28 },
    { icon: "🔮", name: "Paradox Stone",     weight: 1,   value: 4800000,   rarity: "rare",     chance: 12 },
    { icon: "⚛",  name: "Antimatter Sphere", weight: 5,   value: 14000000,  rarity: "epic",     chance: 12 },
    { icon: "👁‍🗨", name: "The Truth",          weight: 0.01,value: 44000000,  rarity: "legend",   chance: 3 },
  ],
};

// Upgrades — each level applies (curr * mult) + add and costs cost * costMult^level.
const UPGRADE_DEFS = [
  {
    id: "depth",
    name: "Hull Reinforcement",
    desc: "Max safe depth",
    stat: "maxDepth",
    base: 50, add: 40, mult: 1,
    baseCost: 25, costMult: 1.55,
    suffix: " m",
  },
  {
    id: "speed",
    name: "Thruster Tuning",
    desc: "Dive & ascent speed",
    stat: "speed",
    base: 10, add: 3, mult: 1.06,
    baseCost: 20, costMult: 1.5,
    suffix: " m/s",
  },
  {
    id: "cargo",
    name: "Cargo Hold",
    desc: "Cargo capacity",
    stat: "cargoMax",
    base: 4, add: 4, mult: 1.08,
    baseCost: 30, costMult: 1.6,
    suffix: " kg",
  },
  {
    id: "sonar",
    name: "Sonar Array",
    desc: "Find loot more often",
    stat: "sonar",
    base: 1, add: 0, mult: 1.18,
    baseCost: 60, costMult: 1.7,
    suffix: "x rate",
    fixed: 2,
  },
  {
    id: "value",
    name: "Appraiser",
    desc: "Higher sale value",
    stat: "valueMult",
    base: 1, add: 0, mult: 1.15,
    baseCost: 80, costMult: 1.75,
    suffix: "x value",
    fixed: 2,
  },
];

// ----- State -----------------------------------------------------
const defaultState = () => ({
  cash: 0,
  totalEarned: 0,
  level: 1,
  upgrades: { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 },
  sub: {
    depth: 0,
    targetDepth: 0,
    cargoKg: 0,
    cargoItems: [],
    mode: "idle", // idle | descending | ascending | selling
  },
  lastTick: Date.now(),
  lastHaul: [],
  boost: { activeUntil: 0, readyAt: 0 },
  // Lifetime stats
  totalDives: 0,
  totalItems: 0,
  boostsUsed: 0,
  rarityCounts: { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 },
  lifetimeItems: {},   // { itemName: count }
  achievements: {},    // { achId: unlockTimestamp }
  // Prestige
  pearls: 0,
  prestigeCount: 0,
  // Pity timer
  divesSinceLegendary: 0,
  // Per-dive encounter effects (cleared on dive end)
  encounterCargoMult: 1,
  encounterValueMult: 1,
  encounterLegendaryNext: false,
  // Bonus loot collected
  bonusCollected: 0,
  // Inventory of unopened chests (array of tier strings)
  inventory: [],
  chestsCollected: 0,
});

let state = load() || defaultState();
if (!state.boost) state.boost = { activeUntil: 0, readyAt: 0 };
if (state.level === undefined) state.level = 1;
if (state.totalDives === undefined) state.totalDives = 0;
if (state.totalItems === undefined) state.totalItems = 0;
if (state.boostsUsed === undefined) state.boostsUsed = 0;
if (!state.rarityCounts) state.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 };
if (!state.lifetimeItems) state.lifetimeItems = {};
if (!state.achievements) state.achievements = {};
if (state.prestigeCount === undefined) state.prestigeCount = 0;
// Migrate old pearl-based prestige to tier-based: 5 pearls = 1 tier (~25%).
if (state.pearls && state.pearls > 0) {
  state.prestigeCount += Math.floor(state.pearls / 5);
  state.pearls = 0;
}
if (state.divesSinceLegendary === undefined) state.divesSinceLegendary = 0;
if (state.encounterCargoMult === undefined) state.encounterCargoMult = 1;
if (state.encounterValueMult === undefined) state.encounterValueMult = 1;
if (state.encounterLegendaryNext === undefined) state.encounterLegendaryNext = false;
if (state.bonusCollected === undefined) state.bonusCollected = 0;
if (!state.inventory) state.inventory = [];
if (state.chestsCollected === undefined) state.chestsCollected = 0;

// ----- Persistence ----------------------------------------------
function save() {
  state.lastTick = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function reset() {
  if (!confirm("Reset all progress?")) return;
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  log("Save reset.");
  refreshUI();
}

// ----- Derived stats --------------------------------------------
function statValue(def, level) {
  let v = def.base;
  for (let i = 0; i < level; i++) v = v * def.mult + def.add;
  return v;
}

function upgradeCost(def, level) {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

function stats() {
  const s = {};
  for (const def of UPGRADE_DEFS) {
    s[def.stat] = statValue(def, state.upgrades[def.id]);
  }
  return s;
}

function currentBiome() {
  return BIOMES[biomeIndex(state.level || 1)];
}

function biomeIndex(level) {
  return Math.min(Math.floor(level / LEVELS_PER_BIOME), BIOMES.length - 1);
}

// ----- Encounters -----------------------------------------------
const ENCOUNTERS = [
  { id: "map",     icon: "🗺",  name: "Treasure Map",  desc: "All picks this dive are LEGENDARY!",
    apply: () => { state.encounterLegendaryNext = true; } },
  { id: "current", icon: "🌊",  name: "Lucky Current", desc: "Cargo capacity ×2 this dive!",
    apply: () => { state.encounterCargoMult = 2; } },
  { id: "mermaid", icon: "🧜",  name: "Mermaid's Kiss",desc: "2× sale value on this haul.",
    apply: () => { state.encounterValueMult = 2; } },
  { id: "crate",   icon: "📦",  name: "Lost Crate!",   desc: "A bonus item appears in your cargo.",
    apply: () => {
      const biome = currentBiome();
      const table = LOOT[biome.name];
      // Bias toward rare-or-better items.
      const candidates = table.filter(it => it.rarity !== "common");
      const bonus = candidates[Math.floor(Math.random() * candidates.length)] || table[0];
      state.sub.cargoItems.push({ ...bonus, biome: biome.name });
      state.sub.cargoKg += bonus.weight;
      state.totalItems += 1;
      state.lifetimeItems[bonus.name] = (state.lifetimeItems[bonus.name] || 0) + 1;
      state.rarityCounts[bonus.rarity] = (state.rarityCounts[bonus.rarity] || 0) + 1;
    } },
  { id: "shark",   icon: "🦈",  name: "Shark Attack!", desc: "A shark stole one of your items.",
    apply: () => { state.encounterShark = true; } },
];

function maybeTriggerEncounter() {
  if (Math.random() >= ENCOUNTER_CHANCE) return;
  const e = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
  e.apply();
  if (!suppressFx) showEncounterBanner(e);
  log(`${e.icon} ${e.name} — ${e.desc}`, "good");
}

function showEncounterBanner(e) {
  const ocean = $("ocean");
  if (!ocean) return;
  const banner = document.createElement("div");
  banner.className = "encounter-banner";
  banner.innerHTML = `<span class="enc-icon">${e.icon}</span><span class="enc-name">${e.name}</span><span class="enc-desc">${e.desc}</span>`;
  ocean.appendChild(banner);
  setTimeout(() => banner.remove(), 3000);
}

// ----- Prestige (rank tiers) ------------------------------------
function currentTier() { return (state.prestigeCount || 0) + 1; }
function rankName(tier) { return SUB_RANKS[Math.min(tier - 1, SUB_RANKS.length - 1)]; }
function tierLevelRequired(tier) {
  if (tier <= 1) return 0;
  // Quadratic so each tier needs deeper biomes; multiples of 10 to align with biome boundaries.
  // Tier 2: 30, 3: 60, 4: 110, 5: 180, 6: 270, 7: 380, 8: 510, 9: 660, 10: 830
  return (tier - 1) * (tier - 1) * 10 + 20;
}
function nextTierLevel() { return tierLevelRequired(currentTier() + 1); }
function canUpgradeSub() { return state.level >= nextTierLevel(); }

function prestigeMult() {
  return 1 + (state.prestigeCount || 0) * TIER_BONUS;
}

function effectiveMaxPicks() {
  return MAX_PICKS_PER_DIVE + (state.prestigeCount || 0) * TIER_PICK_BONUS;
}

function doPrestige() {
  if (!canUpgradeSub()) return;
  const nextTier = currentTier() + 1;
  const nextName = rankName(nextTier);
  const newPct = Math.round((state.prestigeCount + 1) * TIER_BONUS * 100);
  const newPicks = MAX_PICKS_PER_DIVE + (state.prestigeCount + 1) * TIER_PICK_BONUS;
  if (!confirm(`Promote to ${nextName}?\n\nForever:  +1 pickup per dive  (now ${newPicks}/dive)\n          +${newPct}% loot value  (now +${newPct}%)\n\nResets: level, cash, upgrades, dive history.\nKeeps: rank, achievements, codex.`)) return;
  state.prestigeCount = (state.prestigeCount || 0) + 1;
  // Reset progression
  state.cash = 0;
  state.totalEarned = 0;
  state.level = 1;
  state.upgrades = { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 };
  state.sub = { depth: 0, targetDepth: 0, cargoKg: 0, cargoItems: [], mode: "idle" };
  state.lastHaul = [];
  state.totalDives = 0;
  state.totalItems = 0;
  state.boostsUsed = 0;
  state.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 };
  state.divesSinceLegendary = 0;
  state.encounterCargoMult = 1;
  state.encounterValueMult = 1;
  state.encounterLegendaryNext = false;
  state.boost = { activeUntil: 0, readyAt: 0 };
  log(`⚙ Promoted to ${rankName(currentTier())}!`, "good");
  refreshUI();
  save();
}

// ----- Codex ----------------------------------------------------
function allLootItems() {
  const out = [];
  for (const biome of BIOMES) {
    const table = LOOT[biome.name] || [];
    for (const item of table) {
      out.push({ ...item, biome: biome.name });
    }
  }
  return out;
}

// ----- Achievements ---------------------------------------------
const ACHIEVEMENTS = [
  { id: "first_dive",    name: "First Dive",       desc: "Complete your first dive.",   icon: "🌊", check: (s) => s.totalDives >= 1 },
  { id: "ten_dives",     name: "Regular",          desc: "Complete 10 dives.",          icon: "🤿", check: (s) => s.totalDives >= 10 },
  { id: "hundred_dives", name: "Veteran Diver",    desc: "Complete 100 dives.",         icon: "⚓", check: (s) => s.totalDives >= 100 },
  { id: "first_rare",    name: "Lucky Strike",     desc: "Find a rare item.",           icon: "💎", check: (s) => (s.rarityCounts?.rare   || 0) >= 1 },
  { id: "first_epic",    name: "Epic Find",        desc: "Find an epic item.",          icon: "🔮", check: (s) => (s.rarityCounts?.epic   || 0) >= 1 },
  { id: "first_legend",  name: "Legendary",        desc: "Find a legendary item.",      icon: "✨", check: (s) => (s.rarityCounts?.legend || 0) >= 1 },
  { id: "ten_rare",      name: "Treasure Hunter",  desc: "Find 10 rare items.",         icon: "💠", check: (s) => (s.rarityCounts?.rare   || 0) >= 10 },
  { id: "items_100",     name: "Collector",        desc: "Salvage 100 items.",          icon: "📦", check: (s) => s.totalItems >= 100 },
  { id: "items_1000",    name: "Master Salvager",  desc: "Salvage 1,000 items.",        icon: "🏆", check: (s) => s.totalItems >= 1000 },
  { id: "earn_1k",       name: "Pocket Change",    desc: "Earn $1,000 lifetime.",       icon: "💵", check: (s) => s.totalEarned >= 1000 },
  { id: "earn_100k",     name: "High Roller",      desc: "Earn $100,000 lifetime.",     icon: "💰", check: (s) => s.totalEarned >= 100000 },
  { id: "earn_10m",      name: "Tycoon",           desc: "Earn $10M lifetime.",         icon: "🏦", check: (s) => s.totalEarned >= 10000000 },
  { id: "level_10",      name: "Getting Started",  desc: "Reach Level 10.",             icon: "⭐", check: (s) => s.level >= 10 },
  { id: "level_25",      name: "Devoted",          desc: "Reach Level 25.",             icon: "🌟", check: (s) => s.level >= 25 },
  { id: "level_50",      name: "Legendary Captain",desc: "Reach Level 50.",             icon: "👑", check: (s) => s.level >= 50 },
  { id: "biome_5",       name: "Biome Explorer",   desc: "Reach 5 different biomes.",   icon: "🗺", check: (s) => biomeIndex(s.level) >= 4 },
  { id: "singularity",   name: "End of the Map",   desc: "Reach The Singularity.",      icon: "🕳", check: (s) => biomeIndex(s.level) >= 9 },
  { id: "boost_10",      name: "Boost Tap",        desc: "Use boost 10 times.",         icon: "⚡", check: (s) => s.boostsUsed >= 10 },
  { id: "boost_100",     name: "Boost Junkie",     desc: "Use boost 100 times.",        icon: "🚀", check: (s) => s.boostsUsed >= 100 },
  { id: "bonus_first",   name: "Quick Hands",      desc: "Click your first bonus loot.",icon: "👆", check: (s) => (s.bonusCollected || 0) >= 1 },
  { id: "bonus_25",      name: "Sharp Eye",        desc: "Click 25 bonus loot drops.",  icon: "👁",  check: (s) => (s.bonusCollected || 0) >= 25 },
  { id: "chest_first",   name: "Hoarder",          desc: "Collect your first chest.",   icon: "📦", check: (s) => (s.chestsCollected || 0) >= 1 },
  { id: "chest_25",      name: "Treasure Hoard",   desc: "Collect 25 chests.",          icon: "🏴‍☠", check: (s) => (s.chestsCollected || 0) >= 25 },
];

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    if (a.check(state)) {
      state.achievements[a.id] = Date.now();
      if (!suppressFx) showAchievementToast(a);
    }
  }
}

function showAchievementToast(a) {
  const ocean = $("ocean");
  if (!ocean) return;
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="ach-tier">🏆 ACHIEVEMENT UNLOCKED</div>
    <div class="ach-row"><span class="ach-icon">${a.icon}</span><span class="ach-name">${a.name}</span></div>
    <div class="ach-desc">${a.desc}</div>
  `;
  ocean.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
  log(`🏆 Achievement: ${a.name}`, "good");
}

// Total money needed to reach a given level.
function levelCostCumulative(level) {
  if (level <= 1) return 0;
  // Geometric series sum: base + base*mult + base*mult^2 + ... + base*mult^(level-2)
  return Math.floor(LEVEL_BASE_COST * (Math.pow(LEVEL_COST_MULT, level - 1) - 1) / (LEVEL_COST_MULT - 1));
}

// ----- Loot ------------------------------------------------------
function rollLoot(biomeName) {
  const table = LOOT[biomeName];
  // Treasure Map encounter — force the highest-rarity tier this biome has.
  if (state.encounterLegendaryNext) {
    for (const tier of ["legend", "epic", "rare"]) {
      const pool = table.filter(i => i.rarity === tier);
      if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  // Pity timer — force legendary if too long without one.
  if (state.divesSinceLegendary >= PITY_LEGENDARY_DIVES) {
    const lg = table.filter(i => i.rarity === "legend");
    if (lg.length > 0) return lg[Math.floor(Math.random() * lg.length)];
  }
  const totalChance = table.reduce((a, b) => a + b.chance, 0);
  let r = Math.random() * totalChance;
  for (const item of table) {
    r -= item.chance;
    if (r <= 0) return item;
  }
  return table[0];
}

// ----- Game loop -------------------------------------------------
let lootCooldown = 0;
let suppressFx = false;

function tick(dtSec) {
  const s = stats();
  const sub = state.sub;
  const boosting = state.adminBoostAlwaysOn || Date.now() < state.boost.activeUntil;
  const speed = s.speed * (boosting ? BOOST_SPEED_MULT : 1);
  const sonar = s.sonar * (boosting ? BOOST_LOOT_MULT : 1);

  // Auto-start: if idle and we have any progress, dive again.
  if (sub.mode === "idle") {
    sub.mode = "descending";
    sub.targetDepth = s.maxDepth;
    sub.depth = 0;
    sub.cargoKg = 0;
    sub.cargoItems = [];
    sub.picksThisDive = 0;
    // Reset per-dive encounter effects, then maybe trigger a new one.
    state.encounterCargoMult = 1;
    state.encounterValueMult = 1;
    state.encounterLegendaryNext = false;
    state.encounterShark = false;
    if (!suppressFx) maybeTriggerEncounter();
  }

  if (sub.mode === "descending") {
    sub.depth += speed * dtSec;
    if (sub.depth >= s.maxDepth) {
      sub.depth = s.maxDepth;
    }

    const effCargoMax = s.cargoMax * (state.encounterCargoMult || 1);
    // Loot collection — slow base rate, scaled by sonar.
    lootCooldown -= dtSec;
    while (lootCooldown <= 0) {
      lootCooldown += LOOT_INTERVAL_BASE / sonar;
      tryCollect(s);
      if (sub.cargoKg >= effCargoMax || sub.depth >= s.maxDepth) break;
    }

    if (sub.cargoKg >= effCargoMax || sub.depth >= s.maxDepth) {
      sub.mode = "ascending";
    }
    return;
  }

  if (sub.mode === "ascending") {
    sub.depth -= speed * 1.5 * dtSec; // ascent slightly faster
    if (sub.depth <= 0) {
      sub.depth = 0;
      sellCargo(s);
      sub.mode = "idle";
    }
    return;
  }
}

function tryCollect(s) {
  const sub = state.sub;
  if (sub.picksThisDive >= effectiveMaxPicks()) return;
  const effCargoMax = s.cargoMax * (state.encounterCargoMult || 1);
  if (sub.cargoKg >= effCargoMax) return;
  const biome = currentBiome();
  const item = rollLoot(biome.name);
  // Don't overflow: skip if too heavy and cargo isn't empty.
  if (sub.cargoKg + item.weight > effCargoMax && sub.cargoKg > 0) return;
  sub.cargoKg += item.weight;
  sub.cargoItems.push({ ...item, biome: biome.name });
  sub.picksThisDive = (sub.picksThisDive || 0) + 1;
  state.totalItems += 1;
  state.lifetimeItems[item.name] = (state.lifetimeItems[item.name] || 0) + 1;
  state.rarityCounts[item.rarity] = (state.rarityCounts[item.rarity] || 0) + 1;
  if (!suppressFx) {
    spawnLootFx(item);
    log(`${item.icon} ${item.name}`, item.rarity);
  }
  checkAchievements();
}

function spawnLootFx(item) {
  const ocean = $("ocean");
  const sub = $("sub");
  if (!ocean || !sub) return;
  const oceanRect = ocean.getBoundingClientRect();
  const subRect = sub.getBoundingClientRect();
  const cx = subRect.left - oceanRect.left + subRect.width / 2;
  const cy = subRect.top - oceanRect.top + subRect.height / 2;

  // Spawn the loot dot somewhere around/below the sub.
  const angle = Math.random() * Math.PI; // 0..PI (lower hemisphere bias below)
  const dist = 70 + Math.random() * 90;
  const sx = cx + Math.cos(angle) * dist;
  const sy = cy + Math.abs(Math.sin(angle)) * dist + 20;

  const dot = document.createElement("div");
  dot.className = `loot-fx rarity-${item.rarity}`;
  dot.style.left = `${sx}px`;
  dot.style.top = `${sy}px`;
  dot.style.setProperty("--dx", `${cx - sx}px`);
  dot.style.setProperty("--dy", `${cy - sy}px`);
  ocean.appendChild(dot);
  setTimeout(() => dot.remove(), 650);

  // Floating item label rises from the sub.
  const pop = document.createElement("div");
  pop.className = `value-pop rarity-${item.rarity}`;
  pop.textContent = `${item.icon || ""} ${item.name}`.trim();
  pop.style.left = `${cx}px`;
  pop.style.top = `${cy - 12}px`;
  ocean.appendChild(pop);
  setTimeout(() => pop.remove(), 1200);

  // Rare-find celebration: banner at top + screen flash for rare/epic/legend.
  if (item.rarity === "rare" || item.rarity === "epic" || item.rarity === "legend") {
    spawnRareBanner(item);
    if (item.rarity === "epic" || item.rarity === "legend") {
      flashScreen(item.rarity);
    }
  }

  // Sub flash: restart animation.
  sub.classList.remove("collecting");
  void sub.offsetWidth;
  sub.classList.add("collecting");
}

function spawnRareBanner(item) {
  const ocean = $("ocean");
  if (!ocean) return;
  const banner = document.createElement("div");
  banner.className = `rare-banner rarity-${item.rarity}`;
  const tier =
    item.rarity === "legend" ? "✦ LEGENDARY ✦" :
    item.rarity === "epic"   ? "✦ EPIC FIND ✦" :
                               "✦ Rare Find ✦";
  banner.innerHTML = `<span class="tier">${tier}</span><span class="name">${item.name}</span>`;
  ocean.appendChild(banner);
  setTimeout(() => banner.remove(), 2000);
}

function flashScreen(rarity) {
  const ocean = $("ocean");
  if (!ocean) return;
  const flash = document.createElement("div");
  flash.className = `screen-flash flash-${rarity}`;
  ocean.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

function spawnSaleItems(haul) {
  if (!haul || haul.length === 0) return;
  const ocean = $("ocean");
  if (!ocean) return;
  // Sort by value desc, cap to 5 to avoid spam.
  const sorted = [...haul].sort((a, b) => b.value - a.value).slice(0, 5);
  sorted.forEach((it, idx) => {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = `sold-item rarity-${it.rarity}`;
      el.style.top = `${18 + idx * 30}px`;
      el.innerHTML = `<span class="sold-name">${it.icon || ""} ${it.name} ×${it.count}</span><span class="sold-val">+$${fmt(it.value)}</span>`;
      ocean.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    }, idx * 110);
  });
}

function bumpCash() {
  const el = document.querySelector(".cash");
  if (!el) return;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

function spawnCashPop(delta) {
  const wrap = document.querySelector(".cash-wrap");
  if (!wrap) return;
  const pop = document.createElement("div");
  pop.className = "cash-pop";
  pop.textContent = `+$${fmt(delta)}`;
  wrap.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);
}

function spawnSaleBurst(amount) {
  if (suppressFx) return;
  const ocean = $("ocean");
  if (!ocean) return;
  const burst = document.createElement("div");
  burst.className = "sale-burst";
  burst.innerHTML = `<span class="label">HAUL SOLD</span><span class="amount">+$${fmt(amount)}</span>`;
  ocean.appendChild(burst);
  setTimeout(() => burst.remove(), 1700);
}

function sellCargo(s) {
  let items = state.sub.cargoItems;
  // Shark encounter — drop one random item before sale.
  if (state.encounterShark && items.length > 0) {
    const idx = Math.floor(Math.random() * items.length);
    items.splice(idx, 1);
  }
  if (items.length === 0) {
    log("Empty haul.");
    state.totalDives += 1;
    state.divesSinceLegendary += 1;
    return;
  }
  const valueMult = s.valueMult * prestigeMult() * (state.encounterValueMult || 1);
  let total = 0;
  let gotLegendary = false;
  const summary = {};
  for (const it of items) {
    if (it.rarity === "legend") gotLegendary = true;
    const v = Math.ceil(it.value * valueMult);
    total += v;
    if (!summary[it.name]) summary[it.name] = { count: 0, value: 0, rarity: it.rarity, icon: it.icon };
    summary[it.name].count += 1;
    summary[it.name].value += v;
  }
  state.cash += total;
  state.totalEarned += total;
  state.totalDives += 1;
  state.divesSinceLegendary = gotLegendary ? 0 : state.divesSinceLegendary + 1;
  state.lastHaul = Object.entries(summary).map(([name, v]) => ({
    name, count: v.count, value: v.value, rarity: v.rarity, icon: v.icon,
  }));

  // Level up — driven by total money earned.
  const startLevel = state.level;
  const prevBiomeIdx = biomeIndex(state.level);
  while (state.level < 200 && state.totalEarned >= levelCostCumulative(state.level + 1)) {
    state.level += 1;
  }
  const levelsGained = state.level - startLevel;
  const newBiomeIdx = biomeIndex(state.level);

  log(`Sold haul for $${fmt(total)}.`, "good");
  if (levelsGained > 0) log(`⭐ Level up! Now Lv ${state.level}.`, "good");
  if (newBiomeIdx !== prevBiomeIdx && !suppressFx) {
    log(`🌊 Now exploring ${BIOMES[newBiomeIdx].name}!`, "good");
  }
  spawnSaleBurst(total);
  if (!suppressFx) spawnSaleItems(state.lastHaul);
  checkAchievements();
}

// ----- Offline catch-up ------------------------------------------
function catchUpOffline() {
  const now = Date.now();
  const elapsedMs = Math.min(now - state.lastTick, OFFLINE_CAP_HOURS * 3600 * 1000);
  if (elapsedMs < 5000) return;

  const seconds = elapsedMs / 1000;
  // Simulate in 1s steps; cap iterations.
  const steps = Math.min(Math.floor(seconds), 60 * 60 * OFFLINE_CAP_HOURS);
  suppressFx = true;
  for (let i = 0; i < steps; i++) tick(1);
  suppressFx = false;

  const mins = Math.floor(seconds / 60);
  log(`Welcome back — caught up ${mins} min of diving.`, "good");
}

// ----- UI --------------------------------------------------------
const $ = (id) => document.getElementById(id);

function fmt(n) {
  if (n < 1000) return n.toFixed(0);
  if (n < 1e6)  return (n / 1e3).toFixed(2) + "K";
  if (n < 1e9)  return (n / 1e6).toFixed(2) + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2) + "B";
  return (n / 1e12).toFixed(2) + "T";
}

const upgradeRows = {};

function buildUpgrades() {
  const root = $("upgrades");
  root.innerHTML = "";
  for (const def of UPGRADE_DEFS) {
    const row = document.createElement("div");
    row.className = "upgrade";
    row.innerHTML = `
      <div class="info">
        <div class="name">${def.name} <span class="muted lvl">Lv 0</span></div>
        <div class="meta"></div>
      </div>
      <button>$0</button>
    `;
    const btn = row.querySelector("button");
    btn.addEventListener("click", () => buy(def.id));
    upgradeRows[def.id] = {
      lvl: row.querySelector(".lvl"),
      meta: row.querySelector(".meta"),
      btn,
    };
    root.appendChild(row);
  }
}

function updateUpgrades() {
  for (const def of UPGRADE_DEFS) {
    const row = upgradeRows[def.id];
    if (!row) continue;
    const lvl = state.upgrades[def.id];
    const cost = upgradeCost(def, lvl);
    const curr = statValue(def, lvl);
    const next = statValue(def, lvl + 1);
    const fixed = def.fixed ?? 0;
    row.lvl.textContent = `Lv ${lvl}`;
    row.meta.textContent = `${def.desc}: ${curr.toFixed(fixed)}${def.suffix} → ${next.toFixed(fixed)}${def.suffix}`;
    const costText = `$${fmt(cost)}`;
    if (row.btn.textContent !== costText) row.btn.textContent = costText;
    const disabled = state.cash < cost;
    if (row.btn.disabled !== disabled) row.btn.disabled = disabled;
  }
}

function buy(id) {
  const def = UPGRADE_DEFS.find((d) => d.id === id);
  const lvl = state.upgrades[id];
  const cost = upgradeCost(def, lvl);
  if (state.cash < cost) return;
  state.cash -= cost;
  state.upgrades[id] += 1;
  log(`Upgraded ${def.name} → Lv ${state.upgrades[id]}.`, "good");
  updateUpgrades();
}

function buildCodex() {
  const root = $("codex");
  if (!root) return;
  root.innerHTML = "";
  for (const biome of BIOMES) {
    const header = document.createElement("div");
    header.className = "codex-biome-row";
    header.style.gridColumn = "1 / -1";
    header.textContent = biome.name;
    root.appendChild(header);
    const table = LOOT[biome.name] || [];
    for (const item of table) {
      const cell = document.createElement("div");
      cell.className = `codex-cell rarity-${item.rarity}`;
      cell.dataset.itemName = item.name;
      cell.dataset.itemIcon = item.icon || "?";
      cell.title = `${item.icon || ""} ${item.name} (${item.rarity})`;
      cell.innerHTML = `<span class="codex-icon">?</span><span class="codex-count"></span>`;
      root.appendChild(cell);
    }
  }
}

function updateCodex() {
  const total = allLootItems().length;
  let found = 0;
  document.querySelectorAll(".codex-cell").forEach((cell) => {
    const name = cell.dataset.itemName;
    const count = state.lifetimeItems[name] || 0;
    if (count > 0) {
      cell.classList.add("found");
      cell.querySelector(".codex-icon").textContent = cell.dataset.itemIcon;
      cell.querySelector(".codex-count").textContent = count > 99 ? "99+" : count;
      cell.title = `${cell.dataset.itemIcon} ${name} — found ${count}×`;
      found += 1;
    }
  });
  const counter = $("codexCount");
  if (counter) counter.textContent = `${found}/${total}`;
}

function updatePrestigeUI() {
  const tier = currentTier();
  const nextTier = tier + 1;
  const reqLevel = nextTierLevel();
  const ready = canUpgradeSub();
  const pct = Math.round((prestigeMult() - 1) * 100);
  const subTierEl = $("subTier");
  const nextEl = $("nextTierInfo");
  const multEl = $("prestigeMult");
  const btn = $("prestigeBtn");
  if (subTierEl) subTierEl.textContent = rankName(tier);
  const picksEl = $("prestigePicks");
  if (picksEl) picksEl.textContent = effectiveMaxPicks();
  if (multEl) multEl.textContent = `+${pct}%`;
  if (nextEl) {
    nextEl.textContent = ready
      ? `${rankName(nextTier)} — ready!`
      : `${rankName(nextTier)} @ Lv ${reqLevel}`;
  }
  const badge = $("prestigeBadge");
  if (badge) badge.textContent = pct > 0 ? `LOOT +${pct}%` : "";
  if (btn) {
    btn.disabled = !ready;
    btn.textContent = ready ? `Promote to ${rankName(nextTier)}` : "Upgrade Sub";
  }
}

// ----- Background creatures ------------------------------------
const CREATURES_PER_BIOME = {
  "Sunlit Reef":           ["🐠", "🐟", "🐙"],
  "Twilight Wreck":        ["🐡", "🦑", "🦀"],
  "Midnight Trench":       ["🐙", "🦞", "🐚"],
  "Abyssal Plain":         ["🦐", "🦑", "🐡"],
  "Hadal Depths":          ["🦑", "🐙"],
  "Lava Vents":            ["🦀", "🐠"],
  "Bioluminescent Forest": ["🪼", "🦑"],
  "Crystal Caverns":       ["🐚", "🐡"],
  "Forgotten Temple":      ["🐟", "🐠"],
  "The Singularity":       ["🪼", "🌀"],
};

// Reveal popup used by bonus loot clicks (and other reward moments).
function showItemReveal(item, value, tierLabel) {
  const ocean = $("ocean");
  if (!ocean) return;
  const reveal = document.createElement("div");
  reveal.className = `item-reveal rarity-${item.rarity}`;
  reveal.innerHTML = `
    <div class="reveal-tier">${tierLabel || item.rarity.toUpperCase()}</div>
    <div class="reveal-icon">${item.icon || "✨"}</div>
    <div class="reveal-name">${item.name}</div>
    <div class="reveal-value">+$${fmt(value)}</div>
  `;
  ocean.appendChild(reveal);
  setTimeout(() => reveal.remove(), 2700);
}

// ----- Treasure chests + inventory ------------------------------
const CHEST_TIERS = {
  bronze: {
    name: "Bronze Chest", icon: "📦",
    rarities: ["uncommon", "rare"],
    rarityWeights: { rare: 65, uncommon: 35 },
    items: 2, valueMult: 1.5,
  },
  silver: {
    name: "Silver Chest", icon: "📦",
    rarities: ["rare", "epic"],
    rarityWeights: { epic: 65, rare: 35 },
    items: 3, valueMult: 2.0,
  },
  gold: {
    name: "Gold Chest", icon: "📦",
    rarities: ["epic", "legend"],
    rarityWeights: { legend: 70, epic: 30 },
    items: 4, valueMult: 3.0,
  },
};

function spawnTreasureChest() {
  const ocean = $("ocean");
  if (!ocean) return;
  const r = Math.random();
  let tier;
  if (r < 0.05)      tier = "gold";
  else if (r < 0.30) tier = "silver";
  else               tier = "bronze";
  const def = CHEST_TIERS[tier];

  const el = document.createElement("div");
  el.className = `treasure-chest tier-${tier}`;
  el.textContent = def.icon;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.top  = `${15 + Math.random() * 45}%`;

  let collected = false;
  const removeTimer = setTimeout(() => { if (!collected) el.remove(); }, 12000);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (collected) return;
    collected = true;
    clearTimeout(removeTimer);
    state.inventory.push(tier);
    state.chestsCollected = (state.chestsCollected || 0) + 1;
    log(`${def.icon} ${def.name} added to inventory!`, "good");
    el.classList.add("fading");
    setTimeout(() => el.remove(), 500);
    checkAchievements();
  }, { once: true });
  ocean.appendChild(el);
}

function scheduleTreasure() {
  const delay = 60000 + Math.random() * 80000; // 60-140s
  setTimeout(() => {
    spawnTreasureChest();
    scheduleTreasure();
  }, delay);
}

function rollChestItem(def) {
  const biome = currentBiome();
  const table = LOOT[biome.name] || [];
  // Pick rarity first using tier-biased weights.
  const weights = def.rarityWeights;
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * totalW;
  let chosen = Object.keys(weights)[0];
  for (const [rar, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) { chosen = rar; break; }
  }
  // Find items of that rarity; fall back to other tier rarities, then anything.
  let pool = table.filter(it => it.rarity === chosen);
  if (pool.length === 0) {
    for (const fallback of def.rarities) {
      pool = table.filter(it => it.rarity === fallback);
      if (pool.length > 0) break;
    }
  }
  if (pool.length === 0) pool = table;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function openChest(tier) {
  const def = CHEST_TIERS[tier];
  if (!def) return;
  const idx = state.inventory.indexOf(tier);
  if (idx < 0) return;
  state.inventory.splice(idx, 1);

  const s = stats();
  const baseMult = s.valueMult * prestigeMult() * def.valueMult;
  const rolled = [];
  let totalValue = 0;
  for (let i = 0; i < def.items; i++) {
    const item = rollChestItem(def);
    if (!item) continue;
    const value = Math.ceil(item.value * baseMult);
    rolled.push({ item, value });
    totalValue += value;
    state.cash += value;
    state.totalEarned += value;
    state.totalItems += 1;
    state.lifetimeItems[item.name] = (state.lifetimeItems[item.name] || 0) + 1;
    state.rarityCounts[item.rarity] = (state.rarityCounts[item.rarity] || 0) + 1;
    log(`${def.icon} ${item.icon} ${item.name} +$${fmt(value)}`, "good");
  }
  if (rolled.length === 0) return;
  // Show the highest-rarity (or highest-value) item with the chest's total payout.
  const best = rolled.reduce((a, b) => (b.value > a.value ? b : a)).item;
  showItemReveal(best, totalValue, `${def.icon} ${def.name} (${rolled.length} items)`);
  checkAchievements();
}

let inventorySig = null;
let inventoryDelegated = false;
function renderInventory() {
  const root = $("chestTray");
  if (!root) return;
  if (!inventoryDelegated) {
    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".chest-btn");
      if (!btn) return;
      const tier = btn.dataset.tier;
      if (tier) openChest(tier);
    });
    inventoryDelegated = true;
  }
  const counts = { bronze: 0, silver: 0, gold: 0 };
  for (const t of (state.inventory || [])) counts[t] = (counts[t] || 0) + 1;
  const sig = `${counts.gold}|${counts.silver}|${counts.bronze}`;
  if (sig === inventorySig) return;
  inventorySig = sig;
  root.innerHTML = "";
  for (const tier of ["gold", "silver", "bronze"]) {
    if (!counts[tier]) continue;
    const def = CHEST_TIERS[tier];
    const btn = document.createElement("button");
    btn.className = `chest-btn tier-${tier}`;
    btn.dataset.tier = tier;
    btn.title = `${def.name} ×${counts[tier]} — click to open`;
    btn.innerHTML = `${def.icon}<span class="chest-btn-count">${counts[tier] > 1 ? counts[tier] : ""}</span>`;
    root.appendChild(btn);
  }
}

function biomeAvgValue(biomeName) {
  const table = LOOT[biomeName] || [];
  let total = 0, weight = 0;
  for (const it of table) {
    total += it.value * it.chance;
    weight += it.chance;
  }
  return weight > 0 ? total / weight : 1;
}

function spawnBonusLoot() {
  const ocean = $("ocean");
  if (!ocean) return;
  // Weighted rarity: rare 75%, epic 20%, legendary 5%.
  const r = Math.random();
  let rarity, icon, name, mult;
  if (r < 0.05)      { rarity = "legend"; icon = "🧜"; name = "Mermaid's Treasure"; mult = 60; }
  else if (r < 0.25) { rarity = "epic";   icon = "🪼"; name = "Glowing Jellyfish";  mult = 20; }
  else               { rarity = "rare";   icon = "🐚"; name = "Pearl Shell";        mult = 8; }

  const biome = currentBiome();
  const value = Math.ceil(biomeAvgValue(biome.name) * mult * prestigeMult());

  const el = document.createElement("div");
  el.className = `bonus-loot rarity-${rarity}`;
  el.textContent = icon;
  // Avoid edges; keep clear of boost button (bottom-left) and activity log (bottom-right).
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.top  = `${15 + Math.random() * 45}%`;

  let collected = false;
  const lifetime = 9000;
  const removeTimer = setTimeout(() => { if (!collected) el.remove(); }, lifetime);

  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (collected) return;
    collected = true;
    clearTimeout(removeTimer);
    state.cash += value;
    state.totalEarned += value;
    state.bonusCollected = (state.bonusCollected || 0) + 1;
    showItemReveal({ icon, name, rarity }, value, `BONUS ${rarity.toUpperCase()}`);
    log(`${icon} ${name}! +$${fmt(value)}`, "good");
    el.classList.add("fading");
    setTimeout(() => el.remove(), 600);
    checkAchievements();
  }, { once: true });

  ocean.appendChild(el);
}

function scheduleBonus() {
  const delay = 25000 + Math.random() * 50000; // 25-75s
  setTimeout(() => {
    spawnBonusLoot();
    scheduleBonus();
  }, delay);
}

function spawnCreature() {
  const ocean = $("ocean");
  if (!ocean) return;
  const biome = currentBiome();
  const pool = CREATURES_PER_BIOME[biome.name] || ["🐟"];
  const emoji = pool[Math.floor(Math.random() * pool.length)];
  const c = document.createElement("div");
  c.className = "creature" + (Math.random() < 0.5 ? " flip" : "");
  c.textContent = emoji;
  c.style.top = `${15 + Math.random() * 70}%`;
  c.style.left = "0";
  c.style.fontSize = `${18 + Math.random() * 16}px`;
  c.style.animationDuration = `${15 + Math.random() * 18}s`;
  ocean.appendChild(c);
  setTimeout(() => c.remove(), 35000);
}

function buildAchievements() {
  const root = $("achievements");
  if (!root) return;
  root.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const row = document.createElement("div");
    row.className = "achievement";
    row.id = `ach-${a.id}`;
    row.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>
    `;
    root.appendChild(row);
  }
}

function updateAchievements() {
  let unlocked = 0;
  for (const a of ACHIEVEMENTS) {
    const el = document.getElementById(`ach-${a.id}`);
    if (!el) continue;
    if (state.achievements[a.id]) {
      el.classList.add("unlocked");
      unlocked += 1;
    }
  }
  const counter = $("achCount");
  if (counter) counter.textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
}

function updateLifetime() {
  const rarePlus = (state.rarityCounts.rare || 0) + (state.rarityCounts.epic || 0) + (state.rarityCounts.legend || 0);
  $("lifeEarned").textContent = fmt(state.totalEarned);
  $("lifeItems").textContent  = fmt(state.totalItems);
  $("lifeDives").textContent  = fmt(state.totalDives);
  $("lifeBoosts").textContent = fmt(state.boostsUsed);
  $("lifeRare").textContent   = fmt(rarePlus);
  $("lifeBonus").textContent  = fmt(state.bonusCollected || 0);
}

function renderActiveEffect() {
  const el = $("activeEffect");
  if (!el) return;
  let text = "", cls = "", tip = "";
  if (state.encounterLegendaryNext) {
    text = "🗺  TREASURE MAP — All picks LEGENDARY";
    cls = "eff-map";
    tip = "Treasure Map\n\nEvery item collected on this dive is forced to the highest-rarity tier available in this biome. Lasts the entire dive.";
  } else if ((state.encounterValueMult || 1) > 1) {
    text = `🧜  MERMAID'S KISS — ${state.encounterValueMult}× value`;
    cls = "eff-kiss";
    tip = `Mermaid's Kiss\n\nEvery item from this dive sells for ${state.encounterValueMult}× its normal price. Stacks with Appraiser and Prestige.`;
  } else if ((state.encounterCargoMult || 1) > 1) {
    text = `🌊  LUCKY CURRENT — ${state.encounterCargoMult}× cargo`;
    cls = "eff-current";
    tip = `Lucky Current\n\nCargo capacity is ${state.encounterCargoMult}× higher this dive — carry more weight before surfacing.`;
  }
  if (text && state.sub.mode !== "idle") {
    el.style.display = "block";
    el.className = `active-effect ${cls}`;
    el.textContent = text;
    el.title = tip;
  } else {
    el.style.display = "none";
    el.removeAttribute("title");
  }
}

function renderCurrentCargo() {
  const ul = $("currentCargo");
  if (!ul) return;
  const items = state.sub.cargoItems;
  if (!items || items.length === 0) {
    ul.innerHTML = `<li class="muted">Empty</li>`;
    return;
  }
  const s = stats();
  const valueMult = s.valueMult * prestigeMult() * (state.encounterValueMult || 1);
  const grouped = {};
  for (const it of items) {
    if (!grouped[it.name]) grouped[it.name] = { count: 0, rarity: it.rarity, value: 0, icon: it.icon };
    grouped[it.name].count += 1;
    grouped[it.name].value += Math.ceil(it.value * valueMult);
  }
  ul.innerHTML = Object.entries(grouped)
    .map(([name, g]) =>
      `<li class="rarity-${g.rarity}"><span>${g.icon || ""} ${name} ×${g.count}</span><span>$${fmt(g.value)}</span></li>`
    )
    .join("");
}

function renderHaul() {
  const ul = $("lastHaul");
  if (!state.lastHaul || state.lastHaul.length === 0) {
    ul.innerHTML = `<li class="muted">Nothing yet.</li>`;
    return;
  }
  ul.innerHTML = state.lastHaul
    .sort((a, b) => b.value - a.value)
    .map(
      (i) => `<li class="rarity-${i.rarity}">
        <span>${i.icon || ""} ${i.name} ×${i.count}</span><span>$${fmt(i.value)}</span>
      </li>`
    )
    .join("");
}

let lastBiomeName = null;
function updateBiomeColor(biome) {
  if (biome.name === lastBiomeName) return;
  const first = lastBiomeName !== null;
  lastBiomeName = biome.name;
  document.documentElement.style.setProperty("--biome-color", biome.color);
  document.documentElement.style.setProperty("--biome-accent", biome.accent);
  if (first && !suppressFx) {
    showBiomeBanner(biome);
    flashBiome(biome);
  }
}

function showBiomeBanner(biome) {
  const ocean = $("ocean");
  if (!ocean) return;
  // Drop any in-flight biome banners so a new one isn't buried by the old one.
  ocean.querySelectorAll(".biome-banner").forEach((el) => el.remove());
  const banner = document.createElement("div");
  banner.className = "biome-banner";
  banner.style.color = biome.accent;
  banner.innerHTML = `<span class="biome-prefix">⟜  ENTERING  ⟝</span><span class="biome-title">${biome.name}</span>`;
  ocean.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
}

function flashBiome(biome) {
  const ocean = $("ocean");
  if (!ocean) return;
  ocean.querySelectorAll(".biome-flash").forEach((el) => el.remove());
  const flash = document.createElement("div");
  flash.className = "biome-flash";
  flash.style.background = `radial-gradient(circle at center, ${biome.accent}88 0%, ${biome.accent}22 40%, transparent 75%)`;
  ocean.appendChild(flash);
  setTimeout(() => flash.remove(), 1300);
}

let lastMarkerDepth = -1;
function renderDepthMarkers(maxDepth) {
  if (maxDepth === lastMarkerDepth) return;
  lastMarkerDepth = maxDepth;
  const root = $("depthMarkers");
  root.innerHTML = "";
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const m = document.createElement("div");
    m.className = "marker";
    m.style.top = `${(i / steps) * 100}%`;
    m.textContent = `${Math.floor((maxDepth * i) / steps)} m`;
    root.appendChild(m);
  }
}

function activateBoost() {
  const now = Date.now();
  if (now < state.boost.activeUntil) {
    // Active: extend by 0.5s, capped so remaining never exceeds 10s.
    const maxEnd = now + MAX_BOOST_DURATION_MS;
    const newEnd = Math.min(state.boost.activeUntil + BOOST_EXTEND_MS, maxEnd);
    if (newEnd > state.boost.activeUntil) {
      state.boost.activeUntil = newEnd;
      state.boost.readyAt = newEnd + BOOST_COOLDOWN_MS;
      spawnBoostTapCue("+0.5s");
    } else {
      spawnBoostTapCue("MAX");
    }
  } else if (now >= state.boost.readyAt) {
    // Ready: fresh activation.
    state.boost.activeUntil = now + BOOST_DURATION_MS;
    state.boost.readyAt = state.boost.activeUntil + BOOST_COOLDOWN_MS;
    state.boostsUsed += 1;
    log("⚡ Boost engaged!", "good");
    checkAchievements();
  }
  // Cooldown: clicks ignored.
}

function spawnBoostTapCue(text) {
  const btn = $("boostBtn");
  const ocean = $("ocean");
  if (!btn || !ocean) return;
  const r = btn.getBoundingClientRect();
  const o = ocean.getBoundingClientRect();
  const cue = document.createElement("div");
  cue.className = "boost-tap-cue";
  cue.textContent = text;
  cue.style.left = `${r.left - o.left + r.width / 2}px`;
  cue.style.top = `${r.top - o.top - 4}px`;
  ocean.appendChild(cue);
  setTimeout(() => cue.remove(), 600);
}

function updateBoostUI() {
  const now = Date.now();
  const btn = $("boostBtn");
  const cd = $("boostCooldown");
  const sub = $("sub");
  const active = state.adminBoostAlwaysOn || now < state.boost.activeUntil;
  const cooling = !state.adminBoostAlwaysOn && now < state.boost.readyAt;

  sub.classList.toggle("boosted", active);
  btn.classList.toggle("active", active);

  if (active) {
    btn.disabled = false;
    if (state.adminBoostAlwaysOn) {
      btn.querySelector(".boost-label").textContent = `ADMIN BOOST ON`;
      cd.style.width = `100%`;
    } else {
      const remaining = (state.boost.activeUntil - now) / 1000;
      btn.querySelector(".boost-label").textContent = `BOOSTING ${remaining.toFixed(1)}s`;
      cd.style.width = `${(remaining / (BOOST_DURATION_MS / 1000)) * 100}%`;
    }
  } else if (cooling) {
    btn.disabled = true;
    const remaining = (state.boost.readyAt - now) / 1000;
    btn.querySelector(".boost-label").textContent = `Cooldown ${remaining.toFixed(1)}s`;
    cd.style.width = `${100 - (remaining / (BOOST_COOLDOWN_MS / 1000)) * 100}%`;
  } else {
    btn.disabled = false;
    btn.querySelector(".boost-label").textContent = "⚡ BOOST";
    cd.style.width = "100%";
  }
}

let prevCash = state.cash;
function refreshUI() {
  const s = stats();
  if (state.cash !== prevCash) {
    const delta = state.cash - prevCash;
    if (delta > 0 && !suppressFx) spawnCashPop(delta);
    if (delta > 0) bumpCash();
    prevCash = state.cash;
  }
  $("cash").textContent = fmt(state.cash);
  $("depth").textContent = Math.floor(state.sub.depth);
  $("maxDepth").textContent = Math.floor(s.maxDepth);
  $("cargo").textContent = state.sub.cargoKg.toFixed(1);
  $("cargoMax").textContent = s.cargoMax.toFixed(0);
  $("status").textContent =
    state.sub.mode === "descending" ? "Diving"
    : state.sub.mode === "ascending" ? "Surfacing"
    : "Surface";
  const biome = currentBiome();
  const hl = $("headerLevel");  if (hl) hl.textContent = state.level;
  const hb = $("headerBiome");  if (hb) hb.textContent = biome.name;
  const subEl = $("sub");
  if (subEl) {
    const stage = String(Math.min(currentTier(), 10));
    if (subEl.dataset.stage !== stage) subEl.dataset.stage = stage;
  }
  const nb = $("nextBiomeInfo");
  if (nb) {
    const nextIdx = biomeIndex(state.level) + 1;
    const nextBiome = BIOMES[nextIdx];
    const nextLevel = nextIdx * LEVELS_PER_BIOME; // first level in next biome (Lv 10, 20, 30...)
    nb.innerHTML = nextBiome
      ? `Next: <strong>${nextBiome.name}</strong> @ Lv ${nextLevel}`
      : `Deepest biome reached`;
  }

  // Money progress bar to next level.
  const cumPrev = levelCostCumulative(state.level);
  const cumNext = levelCostCumulative(state.level + 1);
  const progressed = Math.max(0, state.totalEarned - cumPrev);
  const needed = Math.max(1, cumNext - cumPrev);
  $("levelMoney").textContent = fmt(Math.min(progressed, needed));
  $("levelMoneyMax").textContent = fmt(needed);
  $("levelBar").style.width = `${Math.min(100, (progressed / needed) * 100)}%`;

  $("cargoBar").style.width = `${(state.sub.cargoKg / s.cargoMax) * 100}%`;
  updateBiomeColor(biome);

  // Sub vertical position.
  const sub = $("sub");
  const pct = Math.min(state.sub.depth / s.maxDepth, 1);
  // 4% (surface) to 96% (max)
  sub.style.top = `${4 + pct * 92}%`;

  updateUpgrades();
  renderActiveEffect();
  renderCurrentCargo();
  renderInventory();
  renderHaul();
  updateLifetime();
  updateAchievements();
  updateCodex();
  updatePrestigeUI();
  renderDepthMarkers(s.maxDepth);
  updateBoostUI();
}

const LOG_LIFETIME_MS = 5000;
const LOG_FADE_MS = 2000;

function log(msg, kind) {
  const root = $("log");
  const line = document.createElement("div");
  line.className = "log-line";
  const colors = {
    good:     "var(--good)",
    common:   "#b8c6d2",
    uncommon: "var(--good)",
    rare:     "var(--accent)",
    epic:     "#c79bff",
    legend:   "var(--gold)",
  };
  if (colors[kind]) line.style.borderColor = colors[kind];
  if (kind === "legend") line.style.boxShadow = "0 0 10px rgba(255,200,80,0.4)";
  line.textContent = msg;
  root.prepend(line);
  // Each line ages out independently — new logs don't reset its timer.
  setTimeout(() => {
    if (line.parentNode && !line.classList.contains("fading")) {
      line.classList.add("fading");
      setTimeout(() => line.remove(), LOG_FADE_MS);
    }
  }, LOG_LIFETIME_MS);
  // Hard cap to keep the stack tight if many fire fast.
  while (root.childElementCount > 10) root.lastChild.remove();
}

// ----- Bubbles (eye candy) --------------------------------------
function spawnBubble() {
  const ocean = $("ocean");
  const b = document.createElement("div");
  b.className = "bubble";
  const size = 4 + Math.random() * 8;
  b.style.width = b.style.height = `${size}px`;
  b.style.left = `${Math.random() * 100}%`;
  b.style.animationDuration = `${6 + Math.random() * 6}s`;
  ocean.appendChild(b);
  setTimeout(() => b.remove(), 12000);
}

// ----- Boot ------------------------------------------------------
$("resetBtn").addEventListener("click", reset);
$("boostBtn").addEventListener("click", activateBoost);
$("prestigeBtn").addEventListener("click", doPrestige);
$("adminCashBtn").addEventListener("click", () => {
  state.cash += 1000000;
  state.totalEarned += 1000000;
  log(`[admin] +$1,000,000.`);
  refreshUI();
});
$("adminBoostBtn").addEventListener("click", () => {
  state.adminBoostAlwaysOn = !state.adminBoostAlwaysOn;
  $("adminBoostBtn").textContent = `Boost: ${state.adminBoostAlwaysOn ? "ON" : "OFF"} (admin)`;
  log(`[admin] Always-boost ${state.adminBoostAlwaysOn ? "enabled" : "disabled"}.`);
  refreshUI();
});
// Restore button label on load.
if (state.adminBoostAlwaysOn) $("adminBoostBtn").textContent = "Boost: ON (admin)";
$("adminLvlBtn").addEventListener("click", () => {
  const prevBiomeIdx = biomeIndex(state.level);
  state.level += 10;
  state.totalEarned = Math.max(state.totalEarned, levelCostCumulative(state.level));
  const newBiomeIdx = biomeIndex(state.level);
  log(`[admin] Now Lv ${state.level}.`);
  if (newBiomeIdx !== prevBiomeIdx) {
    log(`🌊 Now exploring ${BIOMES[newBiomeIdx].name}!`, "good");
  }
  checkAchievements();
  refreshUI();
});

// Collapsible sidebar panels.
const PANEL_KEY = "deepSeaPanels_v1";
const panelState = (() => {
  try { return JSON.parse(localStorage.getItem(PANEL_KEY) || "{}"); }
  catch { return {}; }
})();
const PANEL_DEFAULT_OPEN = new Set(["Submersible", "Upgrades", "Current", "Inventory"]);
document.querySelectorAll(".panel").forEach((panel) => {
  const h2 = panel.querySelector("h2");
  if (!h2) return;
  const key = h2.textContent.trim().split(/\s+/)[0];
  // Use stored state if set, otherwise default-open list.
  const stored = panelState[key];
  const collapsed = stored === undefined ? !PANEL_DEFAULT_OPEN.has(key) : stored;
  if (collapsed) panel.classList.add("collapsed");
  h2.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    panelState[key] = panel.classList.contains("collapsed");
    localStorage.setItem(PANEL_KEY, JSON.stringify(panelState));
  });
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    activateBoost();
  }
});

buildUpgrades();
buildAchievements();
buildCodex();
catchUpOffline();
checkAchievements();
refreshUI();

setInterval(() => {
  tick(TICK_MS / 1000);
  refreshUI();
}, TICK_MS);

setInterval(save, 3000);
setInterval(spawnBubble, 800);
setInterval(spawnCreature, 6000);
scheduleBonus();
scheduleTreasure();
window.addEventListener("beforeunload", save);

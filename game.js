"use strict";

// ----- Config ----------------------------------------------------
// Event support: pages can set window.EVENT_CONFIG before loading this script
// to swap themed data tables, save scope, and a countdown. See event.html.
const EVENT = (typeof window !== "undefined" && window.EVENT_CONFIG) || null;
const EVENT_KEY = (EVENT && EVENT.eventKey) || "";
const EVENT_END = (EVENT && EVENT.endAt) || 0;
const EVENT_NAME = (EVENT && EVENT.name) || "";
function eventEnded() { return EVENT_END > 0 && Date.now() >= EVENT_END; }

const SAVE_KEY = (EVENT && EVENT.saveKey) || "deepSeaSalvage_v1";
// Supabase (publishable/anon key — fine to ship in client; RLS controls writes).
const SUPABASE_URL = "https://tppirwsigzjhbmrixetf.supabase.co";
const SUPABASE_KEY = "sb_publishable_wI2pKiS0TznsBVUq8hKIOA_iIXXfhEF";
// Honor-system gate for the admin panel — change this string if you share the
// site with anyone you don't want poking at +$1M / +10 Lv / always-on boost.
const ADMIN_PASSWORD = "800813504";
const TICK_MS = 100;
const OFFLINE_CAP_HOURS = 8;
const BOOST_DURATION_MS = 10000;     // initial active duration on first click
const MAX_BOOST_DURATION_MS = 10000; // cap on remaining boost time (no stockpiling)
const BOOST_COOLDOWN_MS = 25000;     // cooldown AFTER boost ends (fixed)
const BOOST_EXTEND_MS = 1000;        // each click during boost extends by this
const BOOST_SPEED_MULT = 3;
const BOOST_LOOT_MULT = 3;
const LOOT_INTERVAL_BASE = 6;        // seconds between attempts at sonar=1
const LEVEL_BASE_COST = 20;
const LEVEL_COST_MULT = 1.55;
const TIER_RARITY_UPGRADE = 0.03;    // +3% per rank chance to bump a roll's rarity tier
const SUB_RANKS = (EVENT && EVENT.subRanks) || [
  "Deckhand",          // 1
  "Salvager",          // 2
  "Captain",           // 3
  "Commodore",         // 4
  "Admiral",           // 5
  "Fleet Admiral",     // 6
  "Pirate King",       // 7
  "Sea Lord",          // 8
  "Leviathan",         // 9
  "Abyssal Mythic",    // 10
  "Voidfarer",         // 11
  "Mirrorwalker",      // 12
  "Echo Warden",       // 13
  "Constant Keeper",   // 14
  "Numbered Saint",    // 15
  "Recursion Lord",    // 16
  "Loop Sovereign",    // 17
  "Heat-Death Herald", // 18
  "Photon Inverter",   // 19
  "Antichron",         // 20
  "Quantum Captain",   // 21
  "Probability Prince",// 22
  "Mandelbrot Mystic", // 23
  "Fractal Marquis",   // 24
  "Imaginary Imperator",//25
  "Convergence Conqueror",//26
  "Asymptote Archon",  // 27
  "Limit Liege",       // 28
  "Halt Hierarch",     // 29
  "Frozen Pharaoh",    // 30
  "Thoughtsmith",      // 31
  "Ideationist",       // 32
  "Concept Caesar",    // 33
  "Truth-bearer",      // 34
  "Reasonkeeper",      // 35
  "Logic-Sovereign",   // 36
  "Identity Czar",     // 37
  "Self-Referent",     // 38
  "Fixed-Point Saint", // 39
  "Bracket Mystic",    // 40
  "Edge of Knowing",   // 41
  "Final Arbiter",     // 42
  "Ur-Captain",        // 43
  "Apex of Salvage",   // 44
  "Ascended",          // 45
  "Beyond Rank",       // 46
  "Nameless",          // 47
  "Pre-Form",          // 48
  "First-Made",        // 49
  "The Salvager",      // 50+
];
const PITY_LEGENDARY_DIVES = 50;
const LEVELS_PER_BIOME = 10;

const BIOMES = (EVENT && EVENT.biomes) || [
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
  { name: "The Void",              color: "#08001a", accent: "#5500aa" },
  { name: "Mirror Sea",            color: "#101820", accent: "#c8d8e8" },
  { name: "Echo Trench",           color: "#0a1a2a", accent: "#7fc6e8" },
  { name: "Dream Currents",        color: "#1a0a3a", accent: "#ff9ac4" },
  { name: "Antimatter Reef",       color: "#100020", accent: "#a050ff" },
  { name: "Ghost Tides",           color: "#0a0a18", accent: "#aacccc" },
  { name: "Astral Plane",          color: "#1a0a4a", accent: "#ffd870" },
  { name: "Cosmic Maw",            color: "#200008", accent: "#ff5566" },
  { name: "Source",                color: "#0a2a3a", accent: "#80ffd0" },
  { name: "End of Time",           color: "#000000", accent: "#ffffff" },
];

// Loot table — weighted picks per biome. Scales ~4x per biome.
const LOOT = (EVENT && EVENT.loot) || {
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
  "The Void": [
    { icon: "🕳",  name: "Void Pearl",         weight: 0.1, value: 2000000,         rarity: "common",   chance: 45 },
    { icon: "⚫", name: "Null Crystal",       weight: 0.5, value: 6400000,         rarity: "uncommon", chance: 28 },
    { icon: "🔇", name: "Forgotten Echo",     weight: 1,   value: 19000000,        rarity: "rare",     chance: 12 },
    { icon: "✴",  name: "Black Star",         weight: 4,   value: 56000000,        rarity: "epic",     chance: 12 },
    { icon: "👑", name: "Shadow Crown",       weight: 0.05,value: 175000000,       rarity: "legend",   chance: 3 },
  ],
  "Mirror Sea": [
    { icon: "🪞", name: "Reflected Glass",    weight: 0.5, value: 8000000,         rarity: "common",   chance: 45 },
    { icon: "💍", name: "Twin Pearl",         weight: 0.3, value: 25000000,        rarity: "uncommon", chance: 28 },
    { icon: "🔷", name: "Refraction Core",    weight: 2,   value: 75000000,        rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Mirror Crown",       weight: 5,   value: 220000000,       rarity: "epic",     chance: 12 },
    { icon: "🌗", name: "The Other Side",     weight: 0.1, value: 700000000,       rarity: "legend",   chance: 3 },
  ],
  "Echo Trench": [
    { icon: "🔔", name: "Resonance Stone",    weight: 1,   value: 32000000,        rarity: "common",   chance: 45 },
    { icon: "🎶", name: "Echo Crystal",       weight: 0.5, value: 100000000,       rarity: "uncommon", chance: 28 },
    { icon: "🪸", name: "Whisper Coral",      weight: 3,   value: 300000000,       rarity: "rare",     chance: 12 },
    { icon: "🛎",  name: "Soundless Bell",     weight: 6,   value: 900000000,       rarity: "epic",     chance: 12 },
    { icon: "🌀", name: "The Last Echo",      weight: 0.2, value: 2800000000,      rarity: "legend",   chance: 3 },
  ],
  "Dream Currents": [
    { icon: "💤", name: "Sleeping Coral",     weight: 0.5, value: 130000000,       rarity: "common",   chance: 45 },
    { icon: "🌙", name: "Dream Pearl",        weight: 1,   value: 400000000,       rarity: "uncommon", chance: 28 },
    { icon: "🛏",  name: "Subconscious Spire", weight: 4,   value: 1200000000,      rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Lucid Crown",        weight: 5,   value: 3600000000,      rarity: "epic",     chance: 12 },
    { icon: "💭", name: "Reverie",            weight: 0.05,value: 11000000000,     rarity: "legend",   chance: 3 },
  ],
  "Antimatter Reef": [
    { icon: "💥", name: "Annihilator Shard",  weight: 1,   value: 500000000,       rarity: "common",   chance: 45 },
    { icon: "⚛",  name: "Anti-Pearl",         weight: 0.5, value: 1600000000,      rarity: "uncommon", chance: 28 },
    { icon: "🌐", name: "Negation Field",     weight: 3,   value: 4800000000,      rarity: "rare",     chance: 12 },
    { icon: "🔘", name: "Sphere of Unbeing",  weight: 6,   value: 14000000000,     rarity: "epic",     chance: 12 },
    { icon: "0",  name: "Zero",               weight: 0.01,value: 44000000000,     rarity: "legend",   chance: 3 },
  ],
  "Ghost Tides": [
    { icon: "👻", name: "Ectoplasm Vial",     weight: 0.5, value: 2000000000,      rarity: "common",   chance: 45 },
    { icon: "🐚", name: "Spectral Shell",     weight: 1,   value: 6000000000,      rarity: "uncommon", chance: 28 },
    { icon: "🦴", name: "Phantom Bone",       weight: 3,   value: 18000000000,     rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Wraith Crown",       weight: 5,   value: 56000000000,     rarity: "epic",     chance: 12 },
    { icon: "🪦", name: "The Departed",       weight: 0.1, value: 175000000000,    rarity: "legend",   chance: 3 },
  ],
  "Astral Plane": [
    { icon: "🌟", name: "Star Petal",         weight: 0.5, value: 8000000000,      rarity: "common",   chance: 45 },
    { icon: "💖", name: "Constellation Heart",weight: 0.3, value: 25000000000,     rarity: "uncommon", chance: 28 },
    { icon: "🌌", name: "Galaxy Pearl",       weight: 2,   value: 75000000000,     rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Nebula Crown",       weight: 5,   value: 220000000000,    rarity: "epic",     chance: 12 },
    { icon: "♾",  name: "The Cosmos",         weight: 0.1, value: 700000000000,    rarity: "legend",   chance: 3 },
  ],
  "Cosmic Maw": [
    { icon: "🦷", name: "Tooth of Eternity",  weight: 1,   value: 32000000000,     rarity: "common",   chance: 45 },
    { icon: "🍖", name: "Hunger Stone",       weight: 0.5, value: 100000000000,    rarity: "uncommon", chance: 28 },
    { icon: "👁",  name: "Devourer's Eye",     weight: 3,   value: 300000000000,    rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Maw Crown",          weight: 6,   value: 900000000000,    rarity: "epic",     chance: 12 },
    { icon: "🐲", name: "The All-Eater",      weight: 0.05,value: 2800000000000,   rarity: "legend",   chance: 3 },
  ],
  "Source": [
    { icon: "💧", name: "Primordial Drop",    weight: 0.1, value: 130000000000,    rarity: "common",   chance: 45 },
    { icon: "🥚", name: "Origin Pearl",       weight: 1,   value: 400000000000,    rarity: "uncommon", chance: 28 },
    { icon: "🪸", name: "First Coral",        weight: 4,   value: 1200000000000,   rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Source Crown",       weight: 5,   value: 3600000000000,   rarity: "epic",     chance: 12 },
    { icon: "🌱", name: "Genesis",            weight: 0.05,value: 11000000000000,  rarity: "legend",   chance: 3 },
  ],
  "End of Time": [
    { icon: "💧", name: "Final Tear",         weight: 0.1, value: 500000000000,    rarity: "common",   chance: 45 },
    { icon: "🌅", name: "Last Light",         weight: 0.05,value: 1600000000000,   rarity: "uncommon", chance: 28 },
    { icon: "🚪", name: "Closing Stone",      weight: 1,   value: 4800000000000,   rarity: "rare",     chance: 12 },
    { icon: "Ω",  name: "Omega Crown",        weight: 5,   value: 14000000000000,  rarity: "epic",     chance: 12 },
    { icon: "⏳", name: "The End",            weight: 0.01,value: 44000000000000,  rarity: "legend",   chance: 3 },
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
    // Bigger starting capacity (10 kg → fits a couple of items immediately)
    // and slightly faster early growth so the bar isn't constantly choking
    // a new player. Mult stays at 1.04 so late-game still doesn't explode
    // (L100 ≈ 1.7k kg) — infinite progression, just kinder up front.
    base: 10, add: 3, mult: 1.05,
    // Cheap and flat-ramp on purpose — Cargo Hold's job is to fit one more
    // dive's worth of loot, not gate progression. Was 30/×1.6 originally.
    // Capped at L50 ≈ 743 kg — beyond that even a Treasure-Map / Lucky-
    // Current / boosted dive can't realistically fill the bar, so further
    // upgrades just waste cash. UI shows "MAX" once the cap is reached.
    baseCost: 8, costMult: 1.4,
    suffix: " kg",
    maxLevel: 50,
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
    base: 1, add: 0, mult: 1.10,
    baseCost: 80, costMult: 1.75,
    suffix: "x value",
    fixed: 2,
  },
];

// ----- State -----------------------------------------------------
const defaultState = () => ({
  cash: 0,
  totalEarned: 0,
  xp: 0,
  level: 1,
  upgrades: { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 },
  sub: {
    depth: 0,
    targetDepth: 0,
    cargoKg: 0,
    cargoItems: [],
    cargoGrouped: {},   // { itemName: { count, totalValue, rarity, icon } }
    cargoTotalValue: 0,
    mode: "idle", // idle | descending | ascending | selling
  },
  lastTick: Date.now(),
  lastHaul: [],
  boost: { activeUntil: 0, readyAt: 0 },
  // Lifetime stats
  totalDives: 0,
  totalItems: 0,
  boostsUsed: 0,
  // Real time spent with the page open and ticking (ms). Distinct from
  // wall-clock-since-first-launch — this only accumulates while the game
  // is actually running, including offline catch-up.
  timePlayedMs: 0,
  rarityCounts: { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 },
  lifetimeItems: {},   // { itemName: count }
  achievements: {},    // { achId: unlockTimestamp }
  achievementsClaimed: {},
  // Prestige
  pearls: 0,
  pearlsV2: true,
  prestigeCount: 0,
  // Pity timer
  divesSinceLegendary: 0,
  // Encounter effects (15s timers; expire naturally)
  encounterCargoUntil: 0,
  // Per-pickup multiplier while Lucky Current is active. Default 2×; event
  // bonuses with `cargoMult` override.
  encounterCargoAmt: 2,
  // Spring Bloom Chest Frenzy: bursts chests rapidly until this expires.
  // Persisted so a reload mid-frenzy resumes the spawn chain.
  chestFrenzyUntil: 0,
  // Number of chests still owed a "guaranteed 3 legendary picks" payload.
  // Incremented when a chest is collected during a frenzy; decremented
  // when one is opened. Lets the bonus follow the chest into inventory
  // even though state.inventory itself only stores tier strings.
  frenzyChestsPending: 0,
  encounterValueUntil: 0,
  // Magnitude of the active value bonus (default 2× for Mermaid's Kiss; the
  // event's Butterfly Kiss bumps this to 3×).
  encounterValueAmt: 2,
  // Slot-bonus XP multiplier (Butterfly Kiss carries one; Mermaid's Kiss
  // doesn't). Same expiration semantics as the value bonus.
  encounterXpUntil: 0,
  encounterXpAmt: 1,
  encounterLegendaryUntil: 0,
  sharkSlowUntil: 0,
  // Lucky Current is now dive-scoped: thisDive applies during the current dive,
  // nextDive is queued for the next dive that starts.
  cargoBoostThisDive: false,
  cargoBoostNextDive: false,
  // Bonus loot collected
  bonusCollected: 0,
  // Slot hits per tier (mini, minor, major, jackpot)
  slotHits: { mini: 0, minor: 0, major: 0, jackpot: 0 },
  // Persistent timestamp for the next slot spin (ms epoch)
  nextSpinAt: 0,
  // Inventory of unopened chests (array of tier strings)
  inventory: [],
  chestsCollected: 0,
  // Leaderboard identity (anon UUID + display name)
  playerId: null,
  displayName: "",
});

let state = load() || defaultState();
// Defensive defaults — old saves or partial-load states sometimes miss
// fields the tick loop relies on. Without sub.mode the dive cycle never
// auto-starts and the sub stays pinned at the surface.
if (!state.sub) state.sub = { depth: 0, targetDepth: 0, cargoKg: 0, cargoItems: [], cargoGrouped: {}, cargoTotalValue: 0, mode: "idle" };
if (!state.sub.mode) state.sub.mode = "idle";
if (state.sub.depth === undefined) state.sub.depth = 0;
if (state.sub.cargoKg === undefined) state.sub.cargoKg = 0;
if (!state.sub.cargoItems) state.sub.cargoItems = [];
if (!state.boost) state.boost = { activeUntil: 0, readyAt: 0 };
if (state.level === undefined) state.level = 1;
// XP is the new level driver. Pre-XP saves: carry over their lifetime cash
// as XP so their existing level is preserved.
if (state.xp === undefined) state.xp = state.totalEarned || 0;
if (state.totalDives === undefined) state.totalDives = 0;
if (state.timePlayedMs === undefined) state.timePlayedMs = 0;
if (state.totalItems === undefined) state.totalItems = 0;
if (state.boostsUsed === undefined) state.boostsUsed = 0;
if (!state.rarityCounts) state.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 };
if (!state.lifetimeItems) state.lifetimeItems = {};
if (!state.achievements) state.achievements = {};
if (!state.achievementsClaimed) state.achievementsClaimed = {};
if (state.prestigeCount === undefined) state.prestigeCount = 0;
// One-time migration: previous tier system gave +20% loot value per rank.
// New system: pearls give +0.5% each. Convert existing tier bonus to 20 pearls/rank.
if (!state.pearlsV2) {
  state.pearls = (state.prestigeCount || 0) * 20;
  state.pearlsV2 = true;
}
if (state.pearls === undefined) state.pearls = 0;
if (state.divesSinceLegendary === undefined) state.divesSinceLegendary = 0;
if (state.encounterCargoUntil === undefined) state.encounterCargoUntil = 0;
if (state.encounterCargoAmt   === undefined) state.encounterCargoAmt   = 2;
if (state.chestFrenzyUntil    === undefined) state.chestFrenzyUntil    = 0;
if (state.frenzyChestsPending === undefined) state.frenzyChestsPending = 0;
if (state.encounterValueUntil === undefined) state.encounterValueUntil = 0;
if (state.encounterValueAmt   === undefined) state.encounterValueAmt   = 2;
if (state.encounterXpUntil    === undefined) state.encounterXpUntil    = 0;
if (state.encounterXpAmt      === undefined) state.encounterXpAmt      = 1;
if (state.encounterLegendaryUntil === undefined) state.encounterLegendaryUntil = 0;
if (state.cargoBoostThisDive === undefined) state.cargoBoostThisDive = false;
if (state.cargoBoostNextDive === undefined) state.cargoBoostNextDive = false;
// Clear obsolete dive-scoped fields from older saves.
delete state.encounterCargoMult;
delete state.encounterValueMult;
delete state.encounterLegendaryNext;
if (state.bonusCollected === undefined) state.bonusCollected = 0;
if (!state.slotHits) state.slotHits = { mini: 0, minor: 0, major: 0, jackpot: 0 };
if (!state.nextSpinAt) state.nextSpinAt = Date.now() + 15000;
if (!state.inventory) state.inventory = [];
if (state.chestsCollected === undefined) state.chestsCollected = 0;
if (state.playerId === undefined) state.playerId = null;
if (state.displayName === undefined) state.displayName = "";
// Cargo aggregator — saves before this fix don't have it; rebuild from cargoItems if needed.
if (!state.sub.cargoGrouped) {
  state.sub.cargoGrouped = {};
  state.sub.cargoTotalValue = 0;
  if (state.sub.cargoItems && state.sub.cargoItems.length > 0) {
    for (const it of state.sub.cargoItems) {
      const g = state.sub.cargoGrouped[it.name] || { count: 0, totalValue: 0, rarity: it.rarity, icon: it.icon };
      g.count += 1;
      g.totalValue += it.soldValue || 0;
      state.sub.cargoGrouped[it.name] = g;
      state.sub.cargoTotalValue += it.soldValue || 0;
    }
  }
}

// ----- Persistence ----------------------------------------------
// JSON.stringify of the full state (cargoItems can hold 500+ entries during a
// long Treasure Map dive) is the most expensive thing the periodic timer does.
// Defer to an idle callback so it never lands inside an animation frame; the
// 1s timeout ensures it still runs on busy tabs. Callers that need the write
// to happen before navigation pass `immediate=true`.
const _hasIdleCb = typeof requestIdleCallback === "function";
function save(immediate) {
  if (resetting) return;
  state.lastTick = Date.now();
  if (immediate || !_hasIdleCb) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
    return;
  }
  requestIdleCallback(() => {
    if (resetting) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }, { timeout: 1000 });
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

// ----- Save export / import ------------------------------------
// Manual backup so a player who can't or doesn't want to use cloud save
// can still move their progress between browsers / origins (e.g., when
// the site moves domain) and not lose progress if localStorage gets
// cleared. Pairs with the cloud-save flow in initAuth/pushCloudSave.
function exportSaveFile() {
  const payload = {
    save_key: SAVE_KEY,
    state: state,
    exported_at: new Date().toISOString(),
    version: 1,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${SAVE_KEY}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  log("⬇ Save downloaded.", "good");
}

function importSaveFromText(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { return { ok: false, msg: "File isn't valid JSON." }; }
  // Accept either {state, save_key, ...} from exportSaveFile, or a bare state object.
  const importedState = (parsed && parsed.state) ? parsed.state : parsed;
  if (!importedState || typeof importedState !== "object" || importedState.cash === undefined) {
    return { ok: false, msg: "File doesn't look like a save." };
  }
  const fromKey = parsed && parsed.save_key;
  if (fromKey && fromKey !== SAVE_KEY) {
    if (!confirm(`This save is from "${fromKey}", but you're loading it into "${SAVE_KEY}".\n\nLoad anyway?`)) {
      return { ok: false, msg: "Cancelled." };
    }
  }
  if (!confirm("Replace your current save with the imported one?\n\nYour current progress here will be overwritten.")) {
    return { ok: false, msg: "Cancelled." };
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(importedState)); }
  catch (e) { return { ok: false, msg: "Couldn't write to localStorage: " + e.message }; }
  // Reload so all the boot-time defaults / migrations re-run on the new state.
  location.reload();
  return { ok: true };
}

let resetting = false;
async function reset() {
  if (!confirm("Reset EVERYTHING? Rank, pearls, cash, upgrades, achievements, codex, dive history — all wiped. This cannot be undone.")) return;
  resetting = true;
  // Wipe cloud save first (otherwise it'd restore on next anonymous sign-in)
  // and sign out so reload starts a fresh anon session.
  if (supaClient && authUser) {
    try {
      // Only delete THIS scope's cloud save — Reset on the event page must
      // not nuke the main game's save and vice versa.
      await fetch(`${SUPABASE_URL}/rest/v1/saves?user_id=eq.${authUser.id}&save_key=eq.${encodeURIComponent(SAVE_KEY)}`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${authToken()}` },
      });
    } catch {}
    // Sign out only on the main game — event page reset shouldn't drop the
    // user's identity since their main save is still tied to that auth user.
    if (!EVENT) {
      try { await supaClient.auth.signOut(); } catch {}
    }
  }
  localStorage.clear();
  location.reload();
}

// ----- Derived stats --------------------------------------------
function statValue(def, level) {
  // Clamp at maxLevel so players who upgraded past the cap before it was
  // tightened (Cargo Hold L50) don't keep an inflated stat.
  const lvl = def.maxLevel ? Math.min(level, def.maxLevel) : level;
  let v = def.base;
  for (let i = 0; i < lvl; i++) v = v * def.mult + def.add;
  return v;
}

function upgradeCost(def, level) {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

// stats() is called every tick (and again every refresh). statValue iterates
// `level` times per upgrade, so at high levels this adds up. Cache the result
// keyed on the upgrades signature; invalidate when buy/prestige/reset mutate
// the upgrades object. NOTE: callers must treat the returned object as
// read-only — every caller currently does.
let _statsCache = null;
let _statsCacheKey = "";

function stats() {
  const u = state.upgrades;
  const key = `${u.depth}|${u.speed}|${u.cargo}|${u.sonar}|${u.value}`;
  if (key === _statsCacheKey && _statsCache) return _statsCache;
  const s = {};
  for (const def of UPGRADE_DEFS) {
    s[def.stat] = statValue(def, u[def.id]);
  }
  _statsCache = s;
  _statsCacheKey = key;
  return s;
}

function currentBiome() {
  return BIOMES[biomeIndex(state.level || 1)];
}

function biomeIndex(level) {
  return Math.min(Math.floor(level / LEVELS_PER_BIOME), BIOMES.length - 1);
}

// ----- Encounters -----------------------------------------------
function valueEncounterMult()      { return Date.now() < (state.encounterValueUntil     || 0) ? (state.encounterValueAmt || 2) : 1; }
function cargoEncounterMult()      { return Date.now() < (state.encounterCargoUntil     || 0) ? (state.encounterCargoAmt || 2) : 1; }
function xpEncounterMult()         { return Date.now() < (state.encounterXpUntil        || 0) ? (state.encounterXpAmt    || 1) : 1; }
function legendaryEncounterActive(){ return Date.now() < (state.encounterLegendaryUntil || 0); }

// Every encounter (good or bad) now comes from the Salvage Slot — no more
// per-dive random rolls.
function showEncounterBanner(e) {
  const ocean = $("ocean");
  if (!ocean) return;
  const banner = document.createElement("div");
  banner.className = "encounter-banner" + (e.kind === "hazard" ? " hazard" : "");
  banner.innerHTML = `<span class="enc-icon">${e.icon}</span><span class="enc-name">${e.name}</span><span class="enc-desc">${e.desc}</span>`;
  ocean.appendChild(banner);
  setTimeout(() => banner.remove(), 3000);
}

// ----- Prestige (rank tiers) ------------------------------------
function currentTier() { return (state.prestigeCount || 0) + 1; }
function rankName(tier) { return SUB_RANKS[Math.min(tier - 1, SUB_RANKS.length - 1)]; }
function tierLevelRequired(tier) {
  if (tier <= 1) return 0;
  // Linear: first promotion at Lv 10, then 20, 30, ...
  return (tier - 1) * 10;
}
function nextTierLevel() { return tierLevelRequired(currentTier() + 1); }
function canUpgradeSub() { return state.level >= nextTierLevel(); }

function prestigeMult() {
  return 1 + (state.pearls || 0) * 0.005;
}

function pendingPearls() {
  return Math.floor(Math.sqrt(Math.max(0, state.totalEarned) / 10000));
}

function rarityUpgradeChance() {
  return (state.prestigeCount || 0) * TIER_RARITY_UPGRADE;
}

function doPrestige() {
  if (!canUpgradeSub()) return;
  const nextTier = currentTier() + 1;
  const nextName = rankName(nextTier);
  const earned = pendingPearls();
  const newPearls = (state.pearls || 0) + earned;
  const earnedPct = (earned * 0.5).toFixed(1).replace(/\.0$/, "");
  const totalPct = (newPearls * 0.5).toFixed(1).replace(/\.0$/, "");
  const newRarityPct = Math.round((state.prestigeCount + 1) * TIER_RARITY_UPGRADE * 100);
  if (!confirm(`Promote to ${nextName}?\n\nBank ${earned} pearls (+${earnedPct}% loot value)\nTotal: ${newPearls} pearls (+${totalPct}% loot value)\nForever: +3% rarity upgrade chance per roll (now ${newRarityPct}%)\n\nResets: level, cash, upgrades, dive history.\nKeeps: rank, pearls, achievements, codex.`)) return;
  state.pearls = newPearls;
  state.prestigeCount = (state.prestigeCount || 0) + 1;
  // Reset progression
  state.cash = 0;
  state.totalEarned = 0;
  state.xp = 0;
  state.level = 1;
  state.upgrades = { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 };
  state.sub = { depth: 0, targetDepth: 0, cargoKg: 0, cargoItems: [], cargoGrouped: {}, cargoTotalValue: 0, mode: "idle", lingerStart: 0 };
  state.lastHaul = [];
  // Wipe pinned dive-loot rows AND chest-haul flyouts so the post-promote
  // sub starts visually empty — otherwise the player saw the pre-promote
  // pile of loot still on screen and felt like they were leveling off it.
  clearDiveLoot();
  const _chestHaulRoot = $("chestHaul");
  if (_chestHaulRoot) _chestHaulRoot.innerHTML = "";
  // Force the cargo + haul UI panels to rebuild from the now-empty state.
  _cargoSig = null;
  _haulRef  = undefined;
  state.totalDives = 0;
  state.totalItems = 0;
  state.boostsUsed = 0;
  state.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 };
  state.divesSinceLegendary = 0;
  state.encounterCargoUntil = 0;
  state.encounterCargoAmt = 2;
  state.chestFrenzyUntil = 0;
  state.frenzyChestsPending = 0;
  state.encounterValueUntil = 0;
  state.encounterValueAmt = 2;
  state.encounterXpUntil = 0;
  state.encounterXpAmt = 1;
  state.encounterLegendaryUntil = 0;
  state.cargoBoostThisDive = false;
  state.cargoBoostNextDive = false;
  state.sharkSlowUntil = 0;
  state.boost = { activeUntil: 0, readyAt: 0 };
  log(`⚙ Promoted to ${rankName(currentTier())}!`, "good");
  refreshUI();
  save();
  leaderboardSync(true);
  renderLeaderboard();
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
const ACHIEVEMENTS = (EVENT && EVENT.achievements) || [
  // Dives
  { id: "first_dive",    name: "First Dive",       desc: "Complete your first dive.",   icon: "🌊", reward: 50,        check: (s) => s.totalDives >= 1 },
  { id: "ten_dives",     name: "Regular",          desc: "Complete 10 dives.",          icon: "🤿", reward: 250,       check: (s) => s.totalDives >= 10 },
  { id: "hundred_dives", name: "Veteran Diver",    desc: "Complete 100 dives.",         icon: "⚓", reward: 10000,     check: (s) => s.totalDives >= 100 },
  { id: "dives_500",     name: "Career Diver",     desc: "Complete 500 dives.",         icon: "🌀", reward: 100000,    check: (s) => s.totalDives >= 500 },
  { id: "dives_1000",    name: "Submariner",       desc: "Complete 1,000 dives.",       icon: "🚢", reward: 1000000,   check: (s) => s.totalDives >= 1000 },
  { id: "dives_5000",    name: "Lifer",            desc: "Complete 5,000 dives.",       icon: "♒", reward: 50000000,  check: (s) => s.totalDives >= 5000 },

  // Items
  { id: "items_100",     name: "Collector",        desc: "Salvage 100 items.",          icon: "📦", reward: 1000,      check: (s) => s.totalItems >= 100 },
  { id: "items_1000",    name: "Master Salvager",  desc: "Salvage 1,000 items.",        icon: "🏆", reward: 25000,     check: (s) => s.totalItems >= 1000 },
  { id: "items_5k",      name: "Stockpile",        desc: "Salvage 5,000 items.",        icon: "📚", reward: 250000,    check: (s) => s.totalItems >= 5000 },
  { id: "items_25k",     name: "Warehouse",        desc: "Salvage 25,000 items.",       icon: "🏬", reward: 5000000,   check: (s) => s.totalItems >= 25000 },
  { id: "items_100k",    name: "Trove",            desc: "Salvage 100,000 items.",      icon: "🗃", reward: 100000000, check: (s) => s.totalItems >= 100000 },

  // Rarity finds
  { id: "first_rare",    name: "Lucky Strike",     desc: "Find a rare item.",           icon: "💎", reward: 100,       check: (s) => (s.rarityCounts?.rare   || 0) >= 1 },
  { id: "ten_rare",      name: "Treasure Hunter",  desc: "Find 10 rare items.",         icon: "💠", reward: 2500,      check: (s) => (s.rarityCounts?.rare   || 0) >= 10 },
  { id: "rare_50",       name: "Lucky Streak",     desc: "Find 50 rare items.",         icon: "🔹", reward: 25000,     check: (s) => (s.rarityCounts?.rare   || 0) >= 50 },
  { id: "rare_500",      name: "Rare Collector",   desc: "Find 500 rare items.",        icon: "🔷", reward: 1000000,   check: (s) => (s.rarityCounts?.rare   || 0) >= 500 },
  { id: "first_epic",    name: "Epic Find",        desc: "Find an epic item.",          icon: "🔮", reward: 1000,      check: (s) => (s.rarityCounts?.epic   || 0) >= 1 },
  { id: "epic_10",       name: "Epic Cache",       desc: "Find 10 epic items.",         icon: "💜", reward: 50000,     check: (s) => (s.rarityCounts?.epic   || 0) >= 10 },
  { id: "epic_100",      name: "Epic Seeker",      desc: "Find 100 epic items.",        icon: "🟣", reward: 5000000,   check: (s) => (s.rarityCounts?.epic   || 0) >= 100 },
  { id: "first_legend",  name: "Legendary",        desc: "Find a legendary item.",      icon: "✨", reward: 10000,     check: (s) => (s.rarityCounts?.legend || 0) >= 1 },
  { id: "legend_5",      name: "Mythic",           desc: "Find 5 legendary items.",     icon: "🌟", reward: 250000,    check: (s) => (s.rarityCounts?.legend || 0) >= 5 },
  { id: "legend_25",     name: "Mythkeeper",       desc: "Find 25 legendary items.",    icon: "💫", reward: 5000000,   check: (s) => (s.rarityCounts?.legend || 0) >= 25 },
  { id: "legend_100",    name: "Mythhunter",       desc: "Find 100 legendary items.",   icon: "🌠", reward: 100000000, check: (s) => (s.rarityCounts?.legend || 0) >= 100 },

  // Earnings
  { id: "earn_1k",       name: "Pocket Change",    desc: "Earn $1,000 lifetime.",       icon: "🪙", reward: 500,       check: (s) => s.totalEarned >= 1000 },
  { id: "earn_100k",     name: "High Roller",      desc: "Earn $100,000 lifetime.",     icon: "💵", reward: 25000,     check: (s) => s.totalEarned >= 100000 },
  { id: "earn_1m",       name: "Millionaire",      desc: "Earn $1M lifetime.",          icon: "💰", reward: 250000,    check: (s) => s.totalEarned >= 1000000 },
  { id: "earn_10m",      name: "Tycoon",           desc: "Earn $10M lifetime.",         icon: "🏦", reward: 2500000,   check: (s) => s.totalEarned >= 10000000 },
  { id: "earn_100m",     name: "Magnate",          desc: "Earn $100M lifetime.",        icon: "💼", reward: 25000000,  check: (s) => s.totalEarned >= 100000000 },
  { id: "earn_1b",       name: "Billionaire",      desc: "Earn $1B lifetime.",          icon: "🏛", reward: 250000000, check: (s) => s.totalEarned >= 1000000000 },
  { id: "earn_1t",       name: "Trillion-Dollar",  desc: "Earn $1T lifetime.",          icon: "🪐", reward: 25000000000, check: (s) => s.totalEarned >= 1000000000000 },

  // Levels
  { id: "level_10",      name: "Getting Started",  desc: "Reach Level 10.",             icon: "⭐", reward: 2500,      check: (s) => s.level >= 10 },
  { id: "level_25",      name: "Devoted",          desc: "Reach Level 25.",             icon: "🌟", reward: 25000,     check: (s) => s.level >= 25 },
  { id: "level_50",      name: "Legendary Captain",desc: "Reach Level 50.",             icon: "👑", reward: 250000,    check: (s) => s.level >= 50 },
  { id: "level_75",      name: "Decorated",        desc: "Reach Level 75.",             icon: "🎖", reward: 1000000,   check: (s) => s.level >= 75 },
  { id: "level_100",     name: "Centurion",        desc: "Reach Level 100.",            icon: "💯", reward: 25000000,  check: (s) => s.level >= 100 },
  { id: "level_150",     name: "Beyond",           desc: "Reach Level 150.",            icon: "🚀", reward: 250000000, check: (s) => s.level >= 150 },
  { id: "level_200",     name: "Limit Reached",    desc: "Reach Level 200.",            icon: "♾",  reward: 1000000000,check: (s) => s.level >= 200 },

  // Biomes
  { id: "biome_twilight",  name: "Twilight Diver",      desc: "Reach Twilight Wreck.",        icon: "🚢", reward: 1000,       check: (s) => biomeIndex(s.level) >= 1 },
  { id: "biome_midnight",  name: "Trench Diver",        desc: "Reach Midnight Trench.",       icon: "🌊", reward: 5000,       check: (s) => biomeIndex(s.level) >= 2 },
  { id: "biome_abyssal",   name: "Abyssal Visitor",     desc: "Reach Abyssal Plain.",         icon: "🦴", reward: 25000,      check: (s) => biomeIndex(s.level) >= 3 },
  { id: "biome_hadal",     name: "Hadal Explorer",      desc: "Reach Hadal Depths.",          icon: "🌑", reward: 100000,     check: (s) => biomeIndex(s.level) >= 4 },
  { id: "biome_5",         name: "Biome Explorer",      desc: "Reach 5 different biomes.",    icon: "🗺", reward: 250000,     check: (s) => biomeIndex(s.level) >= 4 },
  { id: "biome_lava",      name: "Vent Walker",         desc: "Reach Lava Vents.",            icon: "🌋", reward: 500000,     check: (s) => biomeIndex(s.level) >= 5 },
  { id: "biome_biolum",    name: "Forest Wanderer",     desc: "Reach Bioluminescent Forest.", icon: "🌿", reward: 2500000,    check: (s) => biomeIndex(s.level) >= 6 },
  { id: "biome_crystal",   name: "Crystal Cartographer",desc: "Reach Crystal Caverns.",       icon: "🔷", reward: 12500000,   check: (s) => biomeIndex(s.level) >= 7 },
  { id: "biome_temple",    name: "Templar",             desc: "Reach Forgotten Temple.",      icon: "🗿", reward: 50000000,   check: (s) => biomeIndex(s.level) >= 8 },
  { id: "singularity",     name: "End of the Map",      desc: "Reach The Singularity.",       icon: "🕳", reward: 250000000,            check: (s) => biomeIndex(s.level) >= 9 },
  { id: "biome_void",      name: "Beyond the Map",      desc: "Reach The Void.",              icon: "🕳", reward: 1000000000,           check: (s) => biomeIndex(s.level) >= 10 },
  { id: "biome_mirror",    name: "Through the Glass",   desc: "Reach the Mirror Sea.",        icon: "🪞", reward: 5000000000,           check: (s) => biomeIndex(s.level) >= 11 },
  { id: "biome_echo",      name: "Echo Walker",         desc: "Reach the Echo Trench.",       icon: "🎶", reward: 25000000000,          check: (s) => biomeIndex(s.level) >= 12 },
  { id: "biome_dream",     name: "Dreamer",             desc: "Reach the Dream Currents.",    icon: "💭", reward: 100000000000,         check: (s) => biomeIndex(s.level) >= 13 },
  { id: "biome_antimatter",name: "Unbeing",             desc: "Reach the Antimatter Reef.",   icon: "⚛", reward: 500000000000,         check: (s) => biomeIndex(s.level) >= 14 },
  { id: "biome_ghost",     name: "Ghost Diver",         desc: "Reach the Ghost Tides.",       icon: "👻", reward: 2500000000000,        check: (s) => biomeIndex(s.level) >= 15 },
  { id: "biome_astral",    name: "Astral Traveler",     desc: "Reach the Astral Plane.",      icon: "🌟", reward: 10000000000000,       check: (s) => biomeIndex(s.level) >= 16 },
  { id: "biome_cosmic",    name: "Devoured",            desc: "Reach the Cosmic Maw.",        icon: "🐲", reward: 50000000000000,       check: (s) => biomeIndex(s.level) >= 17 },
  { id: "biome_source",    name: "Origin",              desc: "Reach Source.",                icon: "🌱", reward: 250000000000000,      check: (s) => biomeIndex(s.level) >= 18 },
  { id: "biome_end",       name: "The End",             desc: "Reach the End of Time.",       icon: "⏳", reward: 1000000000000000,     check: (s) => biomeIndex(s.level) >= 19 },

  // Pearls
  { id: "pearls_50",     name: "Pearl Diver",      desc: "Bank 50 pearls.",             icon: "🔮", reward: 50000,     check: (s) => (s.pearls || 0) >= 50 },
  { id: "pearls_250",    name: "Pearl Hoarder",    desc: "Bank 250 pearls.",            icon: "⚪", reward: 1000000,   check: (s) => (s.pearls || 0) >= 250 },
  { id: "pearls_1k",     name: "Pearl Empire",     desc: "Bank 1,000 pearls.",          icon: "💍", reward: 50000000,  check: (s) => (s.pearls || 0) >= 1000 },

  // Slot wins
  { id: "bonus_first",     name: "First Spin",       desc: "Win on the slot for the first time.", icon: "🎰", reward: 250,       check: (s) => (s.bonusCollected || 0) >= 1 },
  { id: "bonus_25",        name: "Lucky 25",         desc: "Win on the slot 25 times.",            icon: "🎲", reward: 5000,      check: (s) => (s.bonusCollected || 0) >= 25 },
  { id: "slot_50",         name: "Spin Doctor",      desc: "Win on the slot 50 times.",            icon: "♠",  reward: 50000,     check: (s) => (s.bonusCollected || 0) >= 50 },
  { id: "slot_500",        name: "Slot Junkie",      desc: "Win on the slot 500 times.",           icon: "♻",  reward: 5000000,   check: (s) => (s.bonusCollected || 0) >= 500 },
  { id: "slot_minor_first",name: "Mermaid's Favor",  desc: "Hit triple mermaids on the slot.",     icon: "🧜", reward: 25000,     check: (s) => (s.slotHits?.minor || 0) >= 1 },
  { id: "slot_major_first",name: "Mapped",           desc: "Hit triple maps on the slot.",         icon: "🗺", reward: 100000,    check: (s) => (s.slotHits?.major || 0) >= 1 },
  { id: "slot_major_10",   name: "Cartographer",     desc: "Hit triple maps 10 times.",            icon: "🧭", reward: 5000000,   check: (s) => (s.slotHits?.major || 0) >= 10 },
  { id: "slot_jackpot_1",  name: "Lucky Pull",       desc: "Hit a jackpot.",                       icon: "💎", reward: 250000,    check: (s) => (s.slotHits?.jackpot || 0) >= 1 },
  { id: "slot_jackpot_5",  name: "Slot Master",      desc: "Hit 5 jackpots.",                      icon: "🎉", reward: 5000000,   check: (s) => (s.slotHits?.jackpot || 0) >= 5 },
  { id: "slot_jackpot_25", name: "Casino Royale",    desc: "Hit 25 jackpots.",                     icon: "🍀", reward: 100000000, check: (s) => (s.slotHits?.jackpot || 0) >= 25 },

  // Boosts
  { id: "boost_10",      name: "Boost Tap",        desc: "Use boost 10 times.",         icon: "⚡", reward: 500,       check: (s) => s.boostsUsed >= 10 },
  { id: "boost_100",     name: "Boost Junkie",     desc: "Use boost 100 times.",        icon: "🚀", reward: 10000,     check: (s) => s.boostsUsed >= 100 },
  { id: "boost_500",     name: "Boost Addict",     desc: "Use boost 500 times.",        icon: "💨", reward: 250000,    check: (s) => s.boostsUsed >= 500 },
  { id: "boost_1k",      name: "Light Speed",      desc: "Use boost 1,000 times.",      icon: "🛸", reward: 5000000,   check: (s) => s.boostsUsed >= 1000 },

  // Chests
  { id: "chest_first",   name: "Hoarder",          desc: "Collect your first chest.",   icon: "📦", reward: 500,       check: (s) => (s.chestsCollected || 0) >= 1 },
  { id: "chest_25",      name: "Treasure Hoard",   desc: "Collect 25 chests.",          icon: "🏴‍☠", reward: 25000,     check: (s) => (s.chestsCollected || 0) >= 25 },
  { id: "chest_100",     name: "Treasure Vault",   desc: "Collect 100 chests.",         icon: "🏰", reward: 250000,    check: (s) => (s.chestsCollected || 0) >= 100 },
  { id: "chest_500",     name: "Chest Mountain",   desc: "Collect 500 chests.",         icon: "⛰",  reward: 5000000,   check: (s) => (s.chestsCollected || 0) >= 500 },

  // Upgrades
  { id: "upgrade_each_10", name: "Well Outfitted", desc: "Every upgrade at Lv 10+.",     icon: "🔧", reward: 100000,    check: (s) => Object.values(s.upgrades || {}).every(v => v >= 10) },
  { id: "upgrade_each_25", name: "Maxed Out",      desc: "Every upgrade at Lv 25+.",     icon: "⚙",  reward: 5000000,   check: (s) => Object.values(s.upgrades || {}).every(v => v >= 25) },

  // Codex
  { id: "codex_15",      name: "Naturalist",       desc: "Discover 15 unique items.",   icon: "📔", reward: 5000,      check: (s) => Object.keys(s.lifetimeItems || {}).length >= 15 },
  { id: "codex_30",      name: "Marine Biologist", desc: "Discover 30 unique items.",   icon: "📕", reward: 50000,     check: (s) => Object.keys(s.lifetimeItems || {}).length >= 30 },
  { id: "codex_all",     name: "Complete Codex",   desc: "Discover every unique item.", icon: "📖", reward: 1000000000, check: (s) => Object.keys(s.lifetimeItems || {}).length >= allLootItems().length },

  // Prestige
  { id: "prestige_1",    name: "Reborn",                  desc: "Promote for the first time.",                icon: "🌀", reward: 5000,        check: (s) => (s.prestigeCount || 0) >= 1 },
  { id: "prestige_3",    name: "Loop Theory",             desc: "Promote 3 times. Pattern detected.",         icon: "🔄", reward: 100000,      check: (s) => (s.prestigeCount || 0) >= 3 },
  { id: "prestige_5",    name: "Iterator",                desc: "Promote 5 times. The pearls are pretty.",    icon: "🔮", reward: 1000000,     check: (s) => (s.prestigeCount || 0) >= 5 },
  { id: "prestige_10",   name: "you're still playing?",   desc: "Promote 10 times. ...seriously?",            icon: "👀", reward: 10000000,    check: (s) => (s.prestigeCount || 0) >= 10 },
  { id: "prestige_15",   name: "touch grass",             desc: "Promote 15 times. The surface exists.",      icon: "🌱", reward: 100000000,   check: (s) => (s.prestigeCount || 0) >= 15 },
  { id: "prestige_25",   name: "send help",               desc: "Promote 25 times. We're worried.",           icon: "🆘", reward: 1000000000,  check: (s) => (s.prestigeCount || 0) >= 25 },
  { id: "prestige_50",   name: "this is your life now",   desc: "Promote 50 times. There is no surface.",     icon: "🕳", reward: 10000000000, check: (s) => (s.prestigeCount || 0) >= 50 },
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

function claimAchievement(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  if (!state.achievements[id]) return;
  if (state.achievementsClaimed[id]) return;
  state.cash += a.reward;
  state.totalEarned += a.reward;
  state.xp += a.reward;
  state.achievementsClaimed[id] = Date.now();
  log(`🏆 ${a.name} claimed (+$${fmt(a.reward)})`, "good");
  checkLevelUp();
}

function claimAllAchievements() {
  let claimed = 0;
  let total = 0;
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id]) continue;
    if (state.achievementsClaimed[a.id]) continue;
    state.cash += a.reward;
    state.totalEarned += a.reward;
    state.xp += a.reward;
    state.achievementsClaimed[a.id] = Date.now();
    total += a.reward;
    claimed += 1;
  }
  if (claimed === 0) return;
  log(`🏆 Claimed ${claimed} honor${claimed === 1 ? "" : "s"} (+$${fmt(total)})`, "good");
  checkLevelUp();
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
    <div class="ach-cta">▸ TAP TO CLAIM</div>
  `;
  toast.addEventListener("click", () => {
    jumpToAchievement(a.id);
    toast.remove();
  }, { once: true });
  ocean.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
  log(`🏆 Achievement: ${a.name}`, "good");
}

// Scroll the Honors panel to the unlocked row (and expand the panel if needed)
// so a single tap from the toast lands the user on the claim button.
function jumpToAchievement(id) {
  const row = document.getElementById(`ach-${id}`);
  if (!row) return;
  const panel = row.closest(".panel");
  if (panel && panel.classList.contains("collapsed")) {
    panel.classList.remove("collapsed");
    try {
      const panels = JSON.parse(localStorage.getItem(PANEL_KEY) || "{}");
      panels[panel.dataset.key] = false;
      localStorage.setItem(PANEL_KEY, JSON.stringify(panels));
    } catch {}
  }
  // Wait a frame so the panel-expand reflow finishes before scrolling.
  requestAnimationFrame(() => {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.remove("ach-flash");
    void row.offsetWidth;
    row.classList.add("ach-flash");
    setTimeout(() => row.classList.remove("ach-flash"), 1700);
  });
}

// XP needed to advance from `level` to `level+1`, rounded to a friendly number.
// Single 1.55× multiplier across the whole curve — the eased-late-game knee
// I tried previously made the extended biomes blast past in minutes. Keeping
// the original geometric curve preserves the slow-late-game feel; the
// extended biomes' loot scaling has been pumped up to compensate so 200+ is
// still reachable, just hard.
const _xpNeededCache = [];
function levelXpNeeded(level) {
  if (_xpNeededCache[level] !== undefined) return _xpNeededCache[level];
  const raw = LEVEL_BASE_COST * Math.pow(LEVEL_COST_MULT, level - 1);
  // Round up to the nearest "nice" value so the bar's "needed" number is round.
  const niceSteps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5];
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const m = raw / base;
  let result = 10 * base;
  for (const step of niceSteps) {
    if (step >= m) { result = Math.round(step * base); break; }
  }
  _xpNeededCache[level] = result;
  return result;
}

// Total XP needed to reach a given level (cumulative).
const _xpCumCache = [0, 0];
function levelCostCumulative(level) {
  if (level <= 1) return 0;
  if (_xpCumCache[level] !== undefined) return _xpCumCache[level];
  let sum = 0;
  for (let i = 1; i < level; i++) sum += levelXpNeeded(i);
  _xpCumCache[level] = sum;
  return sum;
}

// ----- Loot ------------------------------------------------------
const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legend"];
function bumpRarity(item, table) {
  const idx = RARITY_ORDER.indexOf(item.rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return item;
  for (let next = idx + 1; next < RARITY_ORDER.length; next++) {
    const pool = table.filter(it => it.rarity === RARITY_ORDER[next]);
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }
  return item;
}

function rollLoot(biomeName) {
  const table = LOOT[biomeName];
  // Treasure Map encounter — force the highest-rarity tier this biome has.
  if (legendaryEncounterActive()) {
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
  let item = table[0];
  for (const it of table) {
    r -= it.chance;
    if (r <= 0) { item = it; break; }
  }
  // Rank perk: each rank rolls for a +1 rarity-tier bump on this item.
  const upChance = rarityUpgradeChance();
  if (upChance > 0 && Math.random() < upChance) {
    item = bumpRarity(item, table);
  }
  return item;
}

// ----- Game loop -------------------------------------------------
let lootCooldown = 0;
let suppressFx = false;
// Set in tryCollect; flushed once at the end of tick() so a single 100ms tick
// can't trigger hundreds of achievement scans at high sonar.
let _achievementsDirty = false;

function tick(dtSec) {
  if (eventEnded()) return;
  // Accumulate time-played. Includes offline catch-up ticks (where dtSec is
  // 1s) and live ticks (where dtSec ≈ TICK_MS / 1000), so the metric
  // reflects total simulated game time, not wall-clock time.
  state.timePlayedMs = (state.timePlayedMs || 0) + Math.round(dtSec * 1000);
  const s = stats();
  const sub = state.sub;
  const boosting = state.adminBoostAlwaysOn || Date.now() < state.boost.activeUntil;
  const rawSpeed = s.speed * (boosting ? BOOST_SPEED_MULT : 1);
  // Cap speed so a one-way trip takes at least 1 second of real time. Without
  // this, late-game boosted subs cover more than maxDepth per 100ms tick and
  // visually teleport between top and bottom every frame ("skipping").
  const maxAllowedSpeed = s.maxDepth / 1.0;
  const speed = Math.min(rawSpeed, maxAllowedSpeed);
  const sonar = s.sonar * (boosting ? BOOST_LOOT_MULT : 1);

  // Auto-start: if idle and we have any progress, dive again.
  if (sub.mode === "idle") {
    sub.mode = "descending";
    sub.targetDepth = s.maxDepth;
    sub.depth = 0;
    sub.cargoKg = 0;
    sub.cargoItems = [];
    sub.cargoGrouped = {};
    sub.cargoTotalValue = 0;
    // Wipe last dive's pinned loot rows so this dive starts with a clean log.
    if (!suppressFx) clearDiveLoot();
    // All encounters (good and bad) come from the Salvage Slot — no per-dive
    // roll here anymore.
  }

  if (sub.mode === "descending") {
    sub.depth += speed * dtSec;
    if (sub.depth >= s.maxDepth) {
      sub.depth = s.maxDepth;
    }

    const effCargoMax = s.cargoMax;
    // Loot collection — slow base rate, scaled by sonar. During Treasure Map
    // we force a fast 0.15s interval so picks come quickly while at depth
    // (~40 legendaries per encounter — 2× the original 0.30s pace).
    // Hard-cap iterations: at extreme sonar the interval can shrink below the
    // 100ms tick and the loop would otherwise run thousands of times per tick.
    // 50 picks per 100ms tick = 500/sec — plenty to keep cargo filling fast.
    const treasure = legendaryEncounterActive();
    // Boost shortens the descent (BOOST_SPEED_MULT) AND raises picks/sec
    // (BOOST_LOOT_MULT). For total loot to come out equal with boost on
    // vs off, the per-tick iteration cap and the interval floor have to
    // scale by the same boost multiplier.
    const lootScale = boosting ? BOOST_LOOT_MULT : 1;
    const iterCap = 50 * lootScale;
    const intervalFloor = 0.01 / lootScale;
    let iterations = 0;
    lootCooldown -= dtSec;
    while (lootCooldown <= 0 && iterations < iterCap) {
      const interval = treasure ? 0.15 : Math.max(intervalFloor, LOOT_INTERVAL_BASE / sonar);
      lootCooldown += interval;
      tryCollect(s);
      iterations++;
      if (sub.cargoKg >= effCargoMax || sub.depth >= s.maxDepth) break;
    }

    if (sub.depth >= s.maxDepth) {
      // During Treasure Map, linger at max depth for up to 5s so the dive
      // racks up a real pile of forced legendaries instead of bouncing back
      // up after the very first pick. After 5s (or cargo full), ascend.
      if (treasure && sub.cargoKg < effCargoMax) {
        if (!sub.lingerStart) sub.lingerStart = Date.now();
        if (Date.now() - sub.lingerStart >= 5000) {
          sub.lingerStart = 0;
          sub.mode = "ascending";
        }
      } else {
        sub.lingerStart = 0;
        sub.mode = "ascending";
      }
    }
    // Cargo-full alone doesn't end the dive — sub keeps descending until it
    // visibly reaches the bottom. Picks just stop (handled in the loot loop).
  } else if (sub.mode === "ascending") {
    sub.depth -= speed * 1.5 * dtSec; // ascent slightly faster
    if (sub.depth <= 0) {
      sub.depth = 0;
      sellCargo(s);
      sub.mode = "idle";
    }
  }

  if (_achievementsDirty) {
    checkAchievements();
    _achievementsDirty = false;
  }
}

function checkLevelUp() {
  const startLevel = state.level;
  const prevBiomeIdx = biomeIndex(state.level);
  // Cap matches BIOMES.length × LEVELS_PER_BIOME so every authored biome
  // is reachable. Bump this if more biomes are appended.
  const LEVEL_CAP = BIOMES.length * LEVELS_PER_BIOME;
  while (state.level < LEVEL_CAP && state.xp >= levelCostCumulative(state.level + 1)) {
    state.level += 1;
  }
  if (!suppressFx && state.level > startLevel) {
    log(`⭐ Level up! Now Lv ${state.level}.`, "good");
    const newBiomeIdx = biomeIndex(state.level);
    if (newBiomeIdx !== prevBiomeIdx) log(`🌊 Now exploring ${BIOMES[newBiomeIdx].name}!`, "good");
  }
}

function creditItem(item, s) {
  // The item's value is granted as XP immediately (the level bar fills as you
  // collect) and returned for the eventual cash credit at the surface.
  const valueMult = s.valueMult * prestigeMult() * valueEncounterMult();
  // Treasure Map is the jackpot encounter — every forced-legendary pick is
  // worth 200× on top of all other multipliers, so a TM dive absolutely
  // crushes a normal dive's value.
  const treasureMult = legendaryEncounterActive() ? 200 : 1;
  const v = Math.ceil(item.value * valueMult * treasureMult);
  state.xp += v * xpEncounterMult();
  checkLevelUp();
  return v;
}

const WEIGHT_MULT = 2.0; // Items a bit heavier than listed — Cargo Hold matters but not too punishing.

function tryCollect(s) {
  const sub = state.sub;
  // Shark Attack: no loot at all while it's chewing on the sub.
  if (Date.now() < (state.sharkSlowUntil || 0)) return;
  if (sub.cargoKg >= s.cargoMax) return;
  const biome = currentBiome();
  const item = rollLoot(biome.name);
  const weight = item.weight * WEIGHT_MULT;
  // Don't overflow: skip if too heavy and cargo isn't empty.
  if (sub.cargoKg + weight > s.cargoMax && sub.cargoKg > 0) return;
  addPickup(item, biome, s);
  // Cargo bonus (Lucky Current 2×): each base pickup is multiplied while
  // the buff is active. Add (mult - 1) extra copies, but stop early if
  // cargo would overflow.
  const mult = cargoEncounterMult();
  for (let extra = 1; extra < mult; extra++) {
    if (sub.cargoKg + weight > s.cargoMax) break;
    addPickup(item, biome, s);
  }
}

function addPickup(item, biome, s) {
  const sub = state.sub;
  const weight = item.weight * WEIGHT_MULT;
  sub.cargoKg += weight;
  const stored = { ...item, biome: biome.name };
  stored.soldValue = creditItem(item, s);
  sub.cargoItems.push(stored);
  // Incremental aggregator — render reads from this instead of re-grouping
  // the entire cargoItems array on every redraw.
  const g = sub.cargoGrouped[item.name] || { count: 0, totalValue: 0, rarity: item.rarity, icon: item.icon };
  g.count += 1;
  g.totalValue += stored.soldValue;
  sub.cargoGrouped[item.name] = g;
  sub.cargoTotalValue = (sub.cargoTotalValue || 0) + stored.soldValue;
  state.totalItems += 1;
  state.lifetimeItems[item.name] = (state.lifetimeItems[item.name] || 0) + 1;
  state.rarityCounts[item.rarity] = (state.rarityCounts[item.rarity] || 0) + 1;
  if (!suppressFx) {
    spawnLootFx(item);
    log(`${item.icon} ${item.name}`, item.rarity);
  }
  // Defer to end of tick — achievement scans get hundreds of times per tick
  // at high sonar otherwise.
  _achievementsDirty = true;
}

// Caps on concurrent FX so late-game loot torrents don't pile glows.
const FX_MAX_LOOT_DOTS  = 8;
const FX_MAX_VALUE_POPS = 6;
// Live counters in place of ocean.querySelectorAll() polling per pick — at
// hundreds of picks per second the scan was a meaningful chunk of frame time.
let _lootFxCount = 0;
let _valuePopCount = 0;
// Cached layout rects for the FX origin. Invalidated when refreshUI moves the
// sub or the window resizes — between those events, all picks within a tick
// share the same rect and avoid re-triggering layout sync.
let _fxRectsValid = false;
let _fxOceanRect = null;
let _fxSubRect = null;
function _invalidateFxRects() { _fxRectsValid = false; }

function spawnLootFx(item) {
  const ocean = $("ocean");
  const sub = $("sub");
  if (!ocean || !sub) return;
  if (!_fxRectsValid) {
    _fxOceanRect = ocean.getBoundingClientRect();
    _fxSubRect = sub.getBoundingClientRect();
    _fxRectsValid = true;
  }
  const oceanRect = _fxOceanRect;
  const subRect = _fxSubRect;
  const cx = subRect.left - oceanRect.left + subRect.width / 2;
  const cy = subRect.top - oceanRect.top + subRect.height / 2;

  if (_lootFxCount < FX_MAX_LOOT_DOTS) {
    const angle = Math.random() * Math.PI;
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
    _lootFxCount++;
    setTimeout(() => { dot.remove(); _lootFxCount--; }, 650);
  }

  if (_valuePopCount < FX_MAX_VALUE_POPS) {
    const pop = document.createElement("div");
    pop.className = `value-pop rarity-${item.rarity}`;
    pop.textContent = `${item.icon || ""} ${item.name}`.trim();
    pop.style.left = `${cx}px`;
    pop.style.top = `${cy - 12}px`;
    ocean.appendChild(pop);
    _valuePopCount++;
    setTimeout(() => { pop.remove(); _valuePopCount--; }, 1200);
  }

  // Rare-find celebration: banner at top + screen flash for rare/epic/legend.
  if (item.rarity === "rare" || item.rarity === "epic" || item.rarity === "legend") {
    spawnRareBanner(item);
    if (item.rarity === "epic" || item.rarity === "legend") {
      flashScreen(item.rarity);
    }
  }

  // Sub flash: restart animation. Throttled — at high sonar this forced-reflow
  // (offsetWidth read) was firing hundreds of times per second.
  const now = performance.now();
  if (now - _lastSubFlashAt >= SUB_FLASH_THROTTLE_MS) {
    _lastSubFlashAt = now;
    sub.classList.remove("collecting");
    void sub.offsetWidth;
    sub.classList.add("collecting");
  }
}

// Pool the rare-banner and screen-flash elements: keep one of each in the DOM
// and just restart their CSS animation on each trigger. This keeps the dopamine
// pulse on rare-ish picks without churning the DOM or stacking compositor
// layers. Per-element throttle prevents strobing during chains of picks.
let _pooledRareBanner = null;
let _pooledScreenFlash = null;
let _lastBannerAt = 0;
let _lastFlashAt  = 0;
let _lastSubFlashAt = 0;
const BANNER_THROTTLE_MS = 2000;
const FLASH_THROTTLE_MS  = 1200;
const SUB_FLASH_THROTTLE_MS = 150;

function spawnRareBanner(item) {
  const now = performance.now();
  if (now - _lastBannerAt < BANNER_THROTTLE_MS) return;
  _lastBannerAt = now;
  const ocean = $("ocean");
  if (!ocean) return;
  if (!_pooledRareBanner || !_pooledRareBanner.isConnected) {
    _pooledRareBanner = document.createElement("div");
    _pooledRareBanner.className = "rare-banner pooled";
    ocean.appendChild(_pooledRareBanner);
  }
  const banner = _pooledRareBanner;
  const tier =
    item.rarity === "legend" ? "✦ LEGENDARY ✦" :
    item.rarity === "epic"   ? "✦ EPIC FIND ✦" :
                               "✦ Rare Find ✦";
  banner.className = `rare-banner pooled rarity-${item.rarity}`;
  banner.innerHTML = `<span class="tier">${tier}</span><span class="name">${item.name}</span>`;
  banner.classList.remove("playing");
  void banner.offsetWidth;
  banner.classList.add("playing");
}

function flashScreen(rarity) {
  const now = performance.now();
  if (now - _lastFlashAt < FLASH_THROTTLE_MS) return;
  _lastFlashAt = now;
  const ocean = $("ocean");
  if (!ocean) return;
  if (!_pooledScreenFlash || !_pooledScreenFlash.isConnected) {
    _pooledScreenFlash = document.createElement("div");
    _pooledScreenFlash.className = "screen-flash pooled";
    ocean.appendChild(_pooledScreenFlash);
  }
  const flash = _pooledScreenFlash;
  flash.className = `screen-flash pooled flash-${rarity}`;
  flash.classList.remove("playing");
  void flash.offsetWidth;
  flash.classList.add("playing");
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
  if (items.length === 0) {
    log("Empty haul.");
    state.totalDives += 1;
    state.divesSinceLegendary += 1;
    return;
  }
  let total = 0;
  let gotLegendary = false;
  const summary = {};
  for (const it of items) {
    if (it.rarity === "legend") gotLegendary = true;
    const v = it.soldValue || 0;
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
  log(`Sold haul for $${fmt(total)}.`, "good");
  spawnSaleBurst(total);
  if (!suppressFx) spawnSaleItems(state.lastHaul);
  checkAchievements();
}

// ----- Offline catch-up ------------------------------------------
// True while catchUpOffline is chunking through simulated ticks. The main
// setInterval loop checks this and skips its own tick + refreshUI calls so
// the simulated time stays consistent and the UI doesn't pay redraw cost
// during catch-up.
let _catchingUp = false;

async function catchUpOffline() {
  if (eventEnded()) return;
  const now = Date.now();
  const elapsedMs = Math.min(now - state.lastTick, OFFLINE_CAP_HOURS * 3600 * 1000);
  if (elapsedMs < 5000) return;

  const seconds = elapsedMs / 1000;
  // Simulate in 1s steps; cap iterations.
  const steps = Math.min(Math.floor(seconds), 60 * 60 * OFFLINE_CAP_HOURS);
  _catchingUp = true;
  suppressFx = true;
  // Yield once before any work so the boot path can complete first paint
  // before we start churning through up to 28,800 ticks.
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < steps; i++) {
    tick(1);
    // Hand the browser back every 500 simulated seconds so the UI stays
    // responsive during a long catch-up.
    if ((i + 1) % 500 === 0) await new Promise(r => setTimeout(r, 0));
  }
  suppressFx = false;
  _catchingUp = false;

  const mins = Math.floor(seconds / 60);
  log(`Welcome back — caught up ${mins} min of diving.`, "good");
  refreshUI();
}

// ----- UI --------------------------------------------------------
const $ = (id) => document.getElementById(id);

// Short-scale magnitude suffixes. Each entry covers 3 powers of 10. Going
// well past Postgres `numeric`'s practical use so the leaderboard never
// needs to be re-extended every time someone passes a new threshold.
const FMT_SUFFIXES = [
  "K",  "M",   "B",   "T",   "Qa",  "Qi",  "Sx",  "Sp",  "Oc",  "No",
  "Dc", "UDc", "DDc", "TDc", "QaDc","QiDc","SxDc","SpDc","OcDc","NoDc",
  "Vg", "UVg", "DVg", "TVg", "QaVg","QiVg","SxVg","SpVg","OcVg","NoVg",
  "Tg",
];
function fmt(n) {
  if (!isFinite(n)) return "—";
  if (n < 1000) return Math.floor(n).toString();
  // Walk 1000-fold through the suffix table; each step is +3 powers of 10.
  let scaled = n / 1000;
  for (let i = 0; i < FMT_SUFFIXES.length; i++) {
    if (scaled < 1000) return scaled.toFixed(2) + FMT_SUFFIXES[i];
    scaled /= 1000;
  }
  return n.toExponential(2);
}

const upgradeRows = {};

// "1" / "10" / "max" — module-local because we don't need to persist it.
let buyMode = "1";

// Plan a bulk purchase: how many levels can we actually buy at the given
// budget, capped at `target` (Infinity for max mode). Returns { count, total }.
function planBulkBuy(def, startLvl, target, cash) {
  // Respect per-upgrade maxLevel when set (e.g., Cargo Hold's hard cap so
  // players don't waste cash on capacity past what one dive can ever fill).
  const remaining = def.maxLevel != null ? Math.max(0, def.maxLevel - startLvl) : Infinity;
  const effTarget = Math.min(target, remaining);
  let count = 0, total = 0;
  while (count < effTarget && count < 10000) {
    const c = upgradeCost(def, startLvl + count);
    if (total + c > cash) break;
    total += c;
    count += 1;
  }
  return { count, total };
}

function buyTarget() {
  return buyMode === "max" ? Infinity : parseInt(buyMode, 10);
}

function buildUpgrades() {
  const root = $("upgrades");
  root.innerHTML = "";

  // Buy-mode picker — three pill buttons at the top of the panel.
  const modeRow = document.createElement("div");
  modeRow.className = "buy-mode-row";
  for (const m of ["1", "10", "max"]) {
    const b = document.createElement("button");
    b.className = "buy-mode-btn" + (m === buyMode ? " active" : "");
    b.type = "button";
    b.dataset.mode = m;
    b.textContent = m === "max" ? "Max" : `×${m}`;
    b.addEventListener("click", () => {
      if (buyMode === m) return;
      buyMode = m;
      modeRow.querySelectorAll(".buy-mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === m);
      });
      updateUpgrades();
    });
    modeRow.appendChild(b);
  }
  root.appendChild(modeRow);

  for (const def of UPGRADE_DEFS) {
    const btn = document.createElement("button");
    btn.className = "upgrade";
    btn.type = "button";
    btn.innerHTML = `
      <div class="info">
        <div class="name">${def.name} <span class="muted lvl">Lv 0</span></div>
        <div class="meta"></div>
      </div>
      <div class="price">
        <span class="price-amount">$0</span>
        <span class="price-count"></span>
      </div>
    `;
    btn.addEventListener("click", () => buy(def.id));
    upgradeRows[def.id] = {
      lvl:    btn.querySelector(".lvl"),
      meta:   btn.querySelector(".meta"),
      amount: btn.querySelector(".price-amount"),
      count:  btn.querySelector(".price-count"),
      btn,
    };
    root.appendChild(btn);
  }
}

function updateUpgrades() {
  for (const def of UPGRADE_DEFS) {
    const row = upgradeRows[def.id];
    if (!row) continue;
    const lvl = state.upgrades[def.id];
    const maxed = def.maxLevel != null && lvl >= def.maxLevel;
    const target = buyTarget();
    // Plan the purchase against current cash to figure out cost + count.
    const plan = planBulkBuy(def, lvl, target, state.cash);
    // For x1 / x10, show the full requested cost even if unaffordable so the
    // player can see what they're saving up for. Max shows what's affordable
    // right now — but falls back to the next-1-upgrade cost when broke so
    // the player still sees the price tag they're saving toward (just grayed
    // out via :disabled), instead of "$0".
    const showCost = (buyMode === "max")
      ? (plan.count >= 1 ? plan.total : upgradeCost(def, lvl))
      : planFullCost(def, lvl, target);
    const remaining = def.maxLevel != null ? Math.max(0, def.maxLevel - lvl) : Infinity;
    const showCount = (buyMode === "max")
      ? (plan.count >= 1 ? plan.count : 1)
      : Math.min(target, remaining);
    const fixed = def.fixed ?? 0;
    const curr = statValue(def, lvl);
    const next = statValue(def, lvl + Math.max(1, showCount));
    const lvlLabel = def.maxLevel != null ? `Lv ${lvl}/${def.maxLevel}` : `Lv ${lvl}`;
    row.lvl.textContent = lvlLabel;
    row.meta.textContent = maxed
      ? `${def.desc}: ${curr.toFixed(fixed)}${def.suffix} (max)`
      : `${def.desc}: ${curr.toFixed(fixed)}${def.suffix} → ${next.toFixed(fixed)}${def.suffix}`;
    const amountText = maxed ? "MAX" : `$${fmt(showCost)}`;
    if (row.amount.textContent !== amountText) row.amount.textContent = amountText;
    const countText = (maxed || buyMode === "1") ? "" : `×${showCount}`;
    if (row.count.textContent !== countText) row.count.textContent = countText;
    // Affordability: x1/x10 require the full target; max only needs >=1.
    const canAfford = !maxed && ((buyMode === "max") ? plan.count >= 1 : plan.count >= showCount && showCount > 0);
    if (row.btn.disabled === canAfford) row.btn.disabled = !canAfford;
  }
}

function planFullCost(def, startLvl, n) {
  const remaining = def.maxLevel != null ? Math.max(0, def.maxLevel - startLvl) : Infinity;
  const effN = Math.min(n, remaining);
  let total = 0;
  for (let i = 0; i < effN && i < 10000; i++) total += upgradeCost(def, startLvl + i);
  return total;
}

function buy(id) {
  const def = UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return;
  const lvl = state.upgrades[id];
  if (def.maxLevel != null && lvl >= def.maxLevel) return;
  const target = buyTarget();
  // x1 / x10 are all-or-nothing — can't afford the requested count, no buy.
  if (buyMode !== "max") {
    const fullCost = planFullCost(def, lvl, target);
    if (state.cash < fullCost) return;
    state.cash -= fullCost;
    state.upgrades[id] += target;
    log(target === 1 ? `Upgraded ${def.name} → Lv ${state.upgrades[id]}.` : `Upgraded ${def.name} ×${target} → Lv ${state.upgrades[id]}.`, "good");
  } else {
    const plan = planBulkBuy(def, lvl, target, state.cash);
    if (plan.count < 1) return;
    state.cash -= plan.total;
    state.upgrades[id] += plan.count;
    log(`Upgraded ${def.name} ×${plan.count} → Lv ${state.upgrades[id]} (max).`, "good");
  }
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

// Codex only changes when a brand-new unique item enters lifetimeItems —
// counts beyond 99 just display "99+" so we don't redraw on every pick.
let _codexUniqueLast = -1;
function updateCodex() {
  const items = state.lifetimeItems || {};
  const unique = Object.keys(items).length;
  if (unique === _codexUniqueLast) return;
  _codexUniqueLast = unique;
  const total = allLootItems().length;
  let found = 0;
  document.querySelectorAll(".codex-cell").forEach((cell) => {
    const name = cell.dataset.itemName;
    const count = items[name] || 0;
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

let _prestigeSig = "";
function updatePrestigeUI() {
  // Skip the whole rebuild when nothing prestige-relevant has changed.
  const sig = `${state.level}|${state.prestigeCount}|${state.pearls}|${state.totalEarned}`;
  if (sig === _prestigeSig) return;
  _prestigeSig = sig;
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
  const rarityEl = $("prestigeRarity");
  if (rarityEl) rarityEl.textContent = `+${Math.round(rarityUpgradeChance() * 100)}%`;
  if (multEl) multEl.textContent = `+${pct}%`;
  const banked = state.pearls || 0;
  const pending = pendingPearls();
  const pearlsEl = $("prestigePearls");
  if (pearlsEl) pearlsEl.textContent = fmt(banked);
  const pendingEl = $("prestigePending");
  if (pendingEl) pendingEl.textContent = pending > 0 ? `+${fmt(pending)}` : "0";
  if (nextEl) {
    nextEl.textContent = ready
      ? `${rankName(nextTier)} — ready!`
      : `${rankName(nextTier)} @ Lv ${reqLevel}`;
  }
  const badge = $("prestigeBadge");
  if (badge) {
    badge.textContent = pct > 0 ? `LOOT VALUE +${fmt(pct)}%` : "";
  }
  if (btn) {
    btn.disabled = !ready;
    btn.textContent = ready
      ? `Promote · bank ${pending} 🔮`
      : "Upgrade Sub";
  }
}

// ----- Background creatures ------------------------------------
const CREATURES_PER_BIOME = (EVENT && EVENT.creatures) || {
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
  "The Void":              ["🕳", "🌀"],
  "Mirror Sea":            ["🪞", "🪼"],
  "Echo Trench":           ["🎶", "🐚"],
  "Dream Currents":        ["💤", "💭"],
  "Antimatter Reef":       ["⚛", "💥"],
  "Ghost Tides":           ["👻", "🦴"],
  "Astral Plane":          ["🌟", "🌌"],
  "Cosmic Maw":            ["🦷", "🐲"],
  "Source":                ["🌱", "💧"],
  "End of Time":           ["⏳", "♾"],
};

// ----- Extended biomes (Lv 200-500) -------------------------------
// 30 procedurally-shaped biomes added past End of Time. Per-biome growth
// is ×2.5 so the loot keeps pace with the original 1.55× XP curve — the
// previous ×1.18 left late biomes giving "starter" XP relative to the
// per-level cost, which made progression stall at Lv 200. Numbers do go
// past JS's safe-integer range (~9×10^15) deep into the curve, but the
// in-game UI uses fmt() which handles arbitrary magnitudes, and the
// leaderboard caps at 9e18 anyway. Within-biome shape (1 / 3.2 / 9.6 /
// 28 / 88) matches the originals.
(function extendBiomes() {
  const TIERS = [
    { rarity: "common",   chance: 45, mult: 1,    weight: 0.5 },
    { rarity: "uncommon", chance: 28, mult: 3.2,  weight: 1   },
    { rarity: "rare",     chance: 12, mult: 9.6,  weight: 3   },
    { rarity: "epic",     chance: 12, mult: 28,   weight: 5   },
    { rarity: "legend",   chance: 3,  mult: 88,   weight: 0.1 },
  ];
  // Default per-tier icons; each row's legend gets a unique icon in column 5.
  const ICONS = ["🪨", "💎", "🔮", "👑", "✨"];
  function buildLoot(base, names, legendIcon) {
    return TIERS.map((t, i) => ({
      icon:    i === 4 ? legendIcon : ICONS[i],
      name:    names[i],
      weight:  t.weight,
      value:   Math.min(Number.MAX_SAFE_INTEGER, Math.round(base * t.mult)),
      rarity:  t.rarity,
      chance:  t.chance,
    }));
  }
  // [name, color, accent, [creatureIcons], [5 item names], legendIcon]
  const ROWS = [
    ["Liminal Threshold",  "#1a0a30", "#a070ff", ["🚪","🌀"], ["Threshold Stone","Pause Glass","Doorway Pearl","Gatekeeper Gaze","The Between"], "🚪"],
    ["Mnemonic Reef",      "#1a2a3a", "#9ce0ff", ["🐚","🪼"], ["Memory Coral","Recall Pearl","Forgotten Bone","Forgetting Crown","Last Memory"], "🧠"],
    ["Glass Tide",         "#0a2a3a", "#d8e8f0", ["🪞","🐚"], ["Crystal Wave","Shard Pearl","Mirror Coral","Glass Crown","Reflection"], "🪞"],
    ["Forgotten Constants","#3a3a0a", "#ffe070", ["🌀","🌌"], ["Lost Pi","Faded e","Decimal Coral","Number Crown","The Constant"], "π"],
    ["Numbered Sea",       "#2a2a4a", "#e0c870", ["🌀","💫"], ["Counted Pebble","Tally Pearl","Sequence Coral","Counter Crown","Census"], "🔢"],
    ["Recursion Bay",      "#1a0a4a", "#9870ff", ["🌀","♾"],  ["Self Stone","Loop Pearl","Repeat Coral","Recursive Crown","Base Case"], "♻"],
    ["Loop Currents",      "#0a1a4a", "#70a8ff", ["🌀","💫"], ["Cycle Stone","Spiral Pearl","Eddy Coral","Cycle Crown","Eternal Loop"], "♾"],
    ["Heat Death",         "#3a0a0a", "#ff7070", ["🔥","🌀"], ["Ember Stone","Cooling Pearl","Last Coral","Frost Crown","Stillness"], "❄"],
    ["Reverse Light",      "#0a0a2a", "#ffd070", ["✨","🌀"], ["Antiglow Stone","Negaphoton Pearl","Anti-Coral","Dark Crown","Reverse Sun"], "🌑"],
    ["Anti-Time",          "#0a3a3a", "#ffd870", ["⏳","🌀"], ["Untime Stone","Reverse Pearl","Backflow Coral","Untime Crown","Yesterday"], "⏪"],
    ["Schrödinger Trench", "#1a1a2a", "#a8c0d0", ["🐱","🌀"], ["Maybe Stone","Probability Pearl","Quantum Coral","Wavefunction Crown","Observed"], "🐱"],
    ["Probability Garden", "#3a0a4a", "#ff9ce0", ["🎲","🌀"], ["Chance Stone","Random Pearl","Distribution Coral","Bell Crown","Roll"], "🎲"],
    ["Mandelbrot Coast",   "#0a3a3a", "#80c0a0", ["🌀","💎"], ["Fractal Stone","Boundary Pearl","Coastline Coral","Fractal Crown","Infinite Edge"], "🌀"],
    ["Fractal Depths",     "#1a0a4a", "#c890ff", ["🌀","🪞"], ["Branch Stone","Recursive Pearl","Self-Similar Coral","Depth Crown","Smaller Always"], "🌀"],
    ["Imaginary Numbers",  "#3a1a3a", "#ffaadc", ["💫","🌀"], ["Imaginary Stone","Complex Pearl","i-Coral","Real Crown","Sqrt(-1)"], "i"],
    ["Convergence Point",  "#3a3a0a", "#ffe890", ["💫","🌀"], ["Limit Stone","Approach Pearl","Converging Coral","Limit Crown","The Point"], "•"],
    ["Asymptote Sea",      "#0a3a3a", "#a0e8ff", ["🌀","💫"], ["Tangent Stone","Touchpoint Pearl","Curve Coral","Asymptotic Crown","Never Quite"], "→"],
    ["Limit's Edge",       "#3a0a1a", "#ff9070", ["💫","🌀"], ["Boundary Stone","Edge Pearl","Limit Coral","Edge Crown","The Frontier"], "⊥"],
    ["Halt State",         "#1a0a0a", "#ff5050", ["🛑","🌀"], ["Stop Stone","Pause Pearl","Halt Coral","Halt Crown","Termination"], "■"],
    ["Frozen Compute",     "#0a2a3a", "#a8d0ff", ["❄","🌀"],  ["Frozen Stone","Cold Pearl","Stilled Coral","Frost Crown","No-Op"], "❄"],
    ["Thought Pool",       "#2a0a3a", "#c890ff", ["🌀","💭"], ["Thought Stone","Idea Pearl","Mind Coral","Thought Crown","Cogito"], "💭"],
    ["Idea Reef",          "#3a3a1a", "#ffe080", ["🌀","💡"], ["Notion Stone","Concept Pearl","Idea Coral","Idea Crown","Eureka"], "💡"],
    ["Concept Storm",      "#3a0a3a", "#e090ff", ["⚡","🌀"], ["Conceptual Stone","Storm Pearl","Definition Coral","Concept Crown","The Idea"], "⚡"],
    ["Truth Currents",     "#3a3a3a", "#fff0a0", ["✨","🌀"], ["Truth Stone","Verity Pearl","Honest Coral","Truth Crown","The True"], "✓"],
    ["Reason's Edge",      "#1a1a0a", "#d8c878", ["🌀","💭"], ["Logic Stone","Argument Pearl","Reason Coral","Reason Crown","QED"], "□"],
    ["Logic Sea",          "#0a1a3a", "#80a8e8", ["🌀","💎"], ["Boolean Stone","AND Pearl","Logic Coral","Logic Crown","Tautology"], "&"],
    ["Identity Bay",       "#2a2a3a", "#d0d0e0", ["🪞","🌀"], ["Self Stone","Identity Pearl","Same Coral","Identity Crown","I = I"], "="],
    ["Self-Reference",     "#1a0a2a", "#a890ff", ["🪞","♾"],  ["Recursive Stone","Self Pearl","Reflexive Coral","Reference Crown","Strange Loop"], "♾"],
    ["Fixed Point",        "#0a0a1a", "#c8b890", ["💫","🌀"], ["Stable Stone","Fixed Pearl","Steady Coral","Anchor Crown","The Fix"], "•"],
    ["The Last Bracket",   "#000000", "#ffffff", ["🌀","✨"], ["Closing Stone","Final Pearl","Bracket Coral","Last Crown","]"], "]"],
  ];
  const START_BASE = 2e12;        // biome 21 common (≈4× biome 20's 500B, matching original biome stride)
  const GROWTH = 2.5;             // per-biome multiplier (close to original biomes' ~3-4× pacing)
  let base = START_BASE;
  for (const [name, color, accent, creatures, names, legendIcon] of ROWS) {
    BIOMES.push({ name, color, accent });
    LOOT[name] = buildLoot(base, names, legendIcon);
    CREATURES_PER_BIOME[name] = creatures;
    base = base * GROWTH;
  }
})();

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
const CHEST_TIERS = (EVENT && EVENT.chestTiers) || {
  common: {
    name: "Salvage Crate", icon: "📦", label: "Common",
    rarities: ["common", "uncommon", "rare"],
    rarityWeights: { common: 55, uncommon: 35, rare: 10 },
    items: 2, valueMult: 1.0,
  },
  rare: {
    name: "Steel Lockbox", icon: "🗃", label: "Rare",
    rarities: ["rare", "epic", "legend"],
    rarityWeights: { rare: 55, epic: 35, legend: 10 },
    items: 3, valueMult: 1.6,
  },
  epic: {
    name: "Sunken Vault", icon: "⚱", label: "Epic",
    rarities: ["epic", "legend"],
    rarityWeights: { epic: 55, legend: 45 },
    items: 4, valueMult: 2.4,
  },
  legendary: {
    name: "Atlantean Reliquary", icon: "🪙", label: "Legendary",
    rarities: ["legend", "epic"],
    rarityWeights: { legend: 90, epic: 10 },
    items: 6, valueMult: 3.5,
  },
};

// Migrate older saves that have the bronze/silver/gold tier names. The new
// tiers map roughly to the old ones (the old common tier didn't exist yet).
const _LEGACY_CHEST_RENAME = { bronze: "rare", silver: "epic", gold: "legendary" };
if (state.inventory && state.inventory.length) {
  state.inventory = state.inventory.map(t => _LEGACY_CHEST_RENAME[t] || t);
}

const CHEST_ORDER = ["legendary", "epic", "rare", "common"];

function spawnTreasureChest(forcedTier) {
  const ocean = $("ocean");
  if (!ocean) return;
  // Frenzy-spawned chests are skewed away from commons toward rares/epics
  // (and slightly more legendaries) to make Chest Frenzy feel meaningful
  // beyond just "a lot of chests." Detected via the still-active timestamp.
  // runChestFrenzy() may also pass forcedTier="legendary" for the
  // guaranteed-minimum slots so every frenzy delivers ≥2 legendaries.
  const isFrenzy = (state.chestFrenzyUntil || 0) > Date.now();
  let tier;
  if (forcedTier) {
    tier = forcedTier;
  } else if (isFrenzy) {
    // 8% legendary / 22% epic / 40% rare / 30% common
    const r = Math.random();
    if (r < 0.08)       tier = "legendary";
    else if (r < 0.30)  tier = "epic";
    else if (r < 0.70)  tier = "rare";
    else                tier = "common";
  } else {
    // Normal world spawns — common most often, legendary rare.
    const r = Math.random();
    if (r < 0.04)       tier = "legendary"; // 4%
    else if (r < 0.14)  tier = "epic";      // 10%
    else if (r < 0.40)  tier = "rare";      // 26%
    else                tier = "common";    // 60%
  }
  const def = CHEST_TIERS[tier];

  const el = document.createElement("div");
  el.className = `treasure-chest tier-${tier}` + (isFrenzy ? " frenzy" : "");
  el.textContent = def.icon;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.top  = `${15 + Math.random() * 45}%`;

  let collected = false;
  const removeTimer = setTimeout(() => { if (!collected) el.remove(); }, 30000);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (collected) return;
    collected = true;
    clearTimeout(removeTimer);
    state.inventory.push(tier);
    state.chestsCollected = (state.chestsCollected || 0) + 1;
    // Frenzy chests tag the inventory with a "guaranteed 3 legendary picks"
    // promise that's redeemed on the next openChest() call (any tier).
    if (isFrenzy) state.frenzyChestsPending = (state.frenzyChestsPending || 0) + 1;
    log(`${def.icon} ${def.name} (${def.label}) added to inventory!`, "good");
    el.classList.add("fading");
    setTimeout(() => el.remove(), 500);
    checkAchievements();
  }, { once: true });
  ocean.appendChild(el);
}

function scheduleTreasure() {
  if (eventEnded()) return;
  const delay = 20000 + Math.random() * 25000; // 20-45s — was 60-140s
  setTimeout(() => {
    if (eventEnded()) return;
    spawnTreasureChest();
    scheduleTreasure();
  }, delay);
}

// Chest Frenzy: rapid-fire chest spawns until state.chestFrenzyUntil
// expires. Stored timestamp survives reloads; boot reschedules the chain
// if a frenzy was in progress.
const CHEST_FRENZY_INTERVAL_MS = 800;
const CHEST_FRENZY_FORCED_LEGENDARIES = 2; // minimum legendary chests per frenzy
let _chestFrenzyTimer = null;
let _frenzyLegendarySlots = new Set();     // spawn indices forced to "legendary"
let _frenzySpawnCount = 0;                  // index of the next spawn this frenzy

// Called when a fresh frenzy fires. Picks N spawn indices to force-spawn
// legendary chests so the player always gets a guaranteed minimum,
// regardless of how the 8% random rolls land.
function startChestFrenzy(durationMs) {
  state.chestFrenzyUntil = Date.now() + durationMs;
  _frenzySpawnCount = 0;
  const expected = Math.max(1, Math.floor(durationMs / CHEST_FRENZY_INTERVAL_MS));
  _frenzyLegendarySlots = new Set();
  while (_frenzyLegendarySlots.size < CHEST_FRENZY_FORCED_LEGENDARIES &&
         _frenzyLegendarySlots.size < expected) {
    _frenzyLegendarySlots.add(Math.floor(Math.random() * expected));
  }
  runChestFrenzy();
}

function runChestFrenzy() {
  if (_chestFrenzyTimer) { clearTimeout(_chestFrenzyTimer); _chestFrenzyTimer = null; }
  if (eventEnded()) return;
  const remaining = (state.chestFrenzyUntil || 0) - Date.now();
  if (remaining <= 0) return;
  const forced = _frenzyLegendarySlots.has(_frenzySpawnCount) ? "legendary" : null;
  spawnTreasureChest(forced);
  _frenzySpawnCount += 1;
  _chestFrenzyTimer = setTimeout(runChestFrenzy, CHEST_FRENZY_INTERVAL_MS);
}

function rollChestItem(def, forceRarity) {
  const biome = currentBiome();
  const table = LOOT[biome.name] || [];
  // Pick rarity first using tier-biased weights — unless caller forced one
  // (Chest Frenzy redemptions force "legend" for the first 2 picks).
  let chosen;
  if (forceRarity) {
    chosen = forceRarity;
  } else {
    const weights = def.rarityWeights;
    const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    chosen = Object.keys(weights)[0];
    for (const [rar, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) { chosen = rar; break; }
    }
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

function spawnChestHaulRow(chestDef, item, value, count, idx) {
  if (suppressFx) return;
  // Stagger so multiple items roll in left-side-of-ocean as a chest "haul",
  // separate from the dive's activity log.
  setTimeout(() => {
    const root = $("chestHaul");
    if (!root) return;
    const row = document.createElement("div");
    row.className = `chest-haul-row rarity-${item.rarity}`;
    const countText = (count && count > 1) ? ` ×${count}` : "";
    row.innerHTML =
      `<span class="ch-name">${chestDef.icon} ${item.icon} ${item.name}${countText}</span>` +
      `<span class="ch-val">+$${fmt(value)}</span>`;
    root.appendChild(row);
    setTimeout(() => row.remove(), 3700);
  }, idx * 90);
}

function openChest(tier) {
  const def = CHEST_TIERS[tier];
  if (!def) return;
  const idx = state.inventory.indexOf(tier);
  if (idx < 0) return;
  state.inventory.splice(idx, 1);

  const s = stats();
  // Mermaid's Kiss doubles the chest payout while it's active, same as live picks.
  const baseMult = s.valueMult * prestigeMult() * def.valueMult * valueEncounterMult();
  // Redeem one frenzy-chest promise on this open: the first 2 rolls are
  // forced to legend rarity, regardless of which tier chest the player
  // happened to click. Capped at def.items so a 2-item common still works.
  const isFrenzyRedeem = (state.frenzyChestsPending || 0) > 0;
  const guaranteedLegend = isFrenzyRedeem ? Math.min(3, def.items) : 0;
  if (isFrenzyRedeem) state.frenzyChestsPending -= 1;
  const rolled = [];
  let totalValue = 0;
  // Stack repeated rolls into a single haul row per item, like the activity log.
  const summary = {};
  for (let i = 0; i < def.items; i++) {
    const item = rollChestItem(def, i < guaranteedLegend ? "legend" : null);
    if (!item) continue;
    const value = Math.ceil(item.value * baseMult);
    rolled.push({ item, value });
    totalValue += value;
    state.cash += value;
    state.totalEarned += value;
    state.xp += value * xpEncounterMult();
    state.totalItems += 1;
    state.lifetimeItems[item.name] = (state.lifetimeItems[item.name] || 0) + 1;
    state.rarityCounts[item.rarity] = (state.rarityCounts[item.rarity] || 0) + 1;
    if (!summary[item.name]) summary[item.name] = { item, count: 0, value: 0 };
    summary[item.name].count += 1;
    summary[item.name].value += value;
  }
  if (rolled.length === 0) return;
  Object.values(summary)
    .sort((a, b) => b.value - a.value)
    .forEach((g, i) => spawnChestHaulRow(def, g.item, g.value, g.count, i));
  checkLevelUp();
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
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const t of (state.inventory || [])) counts[t] = (counts[t] || 0) + 1;
  const sig = CHEST_ORDER.map(t => counts[t]).join("|");
  if (sig === inventorySig) return;
  inventorySig = sig;
  root.innerHTML = "";
  for (const tier of CHEST_ORDER) {
    if (!counts[tier]) continue;
    const def = CHEST_TIERS[tier];
    const slot = document.createElement("div");
    slot.className = `chest-slot tier-${tier}`;
    const btn = document.createElement("button");
    btn.className = `chest-btn tier-${tier}`;
    btn.dataset.tier = tier;
    btn.title = `${def.name} ×${counts[tier]} — click to open`;
    btn.innerHTML = `<span class="chest-btn-icon">${def.icon}</span><span class="chest-btn-count">${counts[tier]}</span>`;
    slot.appendChild(btn);
    const lbl = document.createElement("div");
    lbl.className = "chest-slot-label";
    lbl.textContent = def.label;
    slot.appendChild(lbl);
    root.appendChild(slot);
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

// ----- Salvage Slot (side feature) ------------------------------
// The slot is the ONLY source of bonus encounters now. Each match triggers a
// specific buff; jackpot stacks all three with a longer duration.
// Reel faces are the icons of the bonuses they grant. 🦈 is the lone hazard.
// Symbol order (must stay aligned across themes): [hazard, mini, minor, major, jackpot].
const SLOT_SYMBOLS = (EVENT && EVENT.slotSymbols) || ["🦈", "📦", "🧜", "🗺", "🌟"];
// Base bonus chances. Mini (Chest Frenzy) and shark (hazard) hold steady at
// 10 / 8; the kiss / map / jackpot ladder gets another +1 each (minor 7→8,
// major 3→4, jackpot 2→3). "none" absorbs the +3. Lucky Salvage Charm still
// boosts major + jackpot on top via slotLuckWeight().
const SLOT_OUTCOMES = [
  { tier: "none",    weight: 67, pick: () => slotNonMatch() },
  { tier: "shark",   weight: 8,  pick: () => [SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]] },
  { tier: "mini",    weight: 10, pick: () => [SLOT_SYMBOLS[1], SLOT_SYMBOLS[1], SLOT_SYMBOLS[1]] },
  { tier: "minor",   weight: 8,  pick: () => [SLOT_SYMBOLS[2], SLOT_SYMBOLS[2], SLOT_SYMBOLS[2]] },
  { tier: "major",   weight: 4,  pick: () => [SLOT_SYMBOLS[3], SLOT_SYMBOLS[3], SLOT_SYMBOLS[3]] },
  { tier: "jackpot", weight: 3,  pick: () => [SLOT_SYMBOLS[4], SLOT_SYMBOLS[4], SLOT_SYMBOLS[4]] },
];
const SLOT_BONUSES = (EVENT && EVENT.slotBonuses) || {
  shark:   { icon: "🦈", name: "Shark Attack!", desc: "No loot for 10s!",        duration: 10000, kind: "hazard" },
  mini:    { icon: "📦", name: "Chest Frenzy",  desc: "Rare/epic chest burst for 10s — each rolls ≥3 legendaries!", chestFrenzy: true, duration: 10000 },
  minor:   { icon: "🧜", name: "Mermaid's Kiss",desc: "5× value & 8× XP for 15s.", valueMult: 5, xpMult: 8, duration: 15000 },
  major:   { icon: "🗺", name: "Deep Dive Bonus", desc: "Legendary picks for 15s!", duration: 15000 },
  jackpot: { icon: "🎰", name: "JACKPOT",       desc: "All bonuses · 30s (legendary 15s)!", duration: 30000 },
};

// Tier → state mutation. Lives here (not in SLOT_BONUSES data) so event configs
// loaded from a different script tag don't have to close over `state`. Bonus
// configs may carry per-tier overrides (`cargoMult`, `valueMult`, `xpMult`,
// `chestFrenzy`) so themed events can tune behavior without forking this file.
function applySlotBonus(tier, now, duration, bonus) {
  if (tier === "shark")   { state.sharkSlowUntil          = now + duration; return; }
  if (tier === "mini")    {
    if (bonus && bonus.chestFrenzy) {
      // Spring Bloom variant: spawn a burst of chests instead of doubling
      // pickups. Use the bonus's own duration so it stays tight, and let
      // startChestFrenzy pre-pick the guaranteed legendary slots.
      startChestFrenzy(bonus.duration || duration);
    } else {
      state.encounterCargoUntil = now + duration;
      state.encounterCargoAmt   = (bonus && bonus.cargoMult) || 2;
    }
    return;
  }
  if (tier === "minor")   {
    state.encounterValueUntil = now + duration;
    state.encounterValueAmt   = (bonus && bonus.valueMult) || 2;
    if (bonus && bonus.xpMult && bonus.xpMult > 1) {
      state.encounterXpUntil = now + duration;
      state.encounterXpAmt   = bonus.xpMult;
    }
    return;
  }
  if (tier === "major")   { state.encounterLegendaryUntil = now + duration; return; }
  if (tier === "jackpot") {
    state.encounterValueUntil     = now + duration;
    // Jackpot stacks all positive bonuses, so it inherits whatever
    // multipliers / behaviors mini and minor tiers carry.
    const miniBonus  = SLOT_BONUSES.mini;
    const minorBonus = SLOT_BONUSES.minor;
    if (miniBonus && miniBonus.chestFrenzy) {
      startChestFrenzy(miniBonus.duration || duration);
    } else {
      state.encounterCargoUntil = now + duration;
      state.encounterCargoAmt   = (miniBonus && miniBonus.cargoMult) || 2;
    }
    state.encounterValueAmt = (minorBonus && minorBonus.valueMult) || 2;
    if (minorBonus && minorBonus.xpMult && minorBonus.xpMult > 1) {
      state.encounterXpUntil = now + duration;
      state.encounterXpAmt   = minorBonus.xpMult;
    }
    // Legendary picks always cap at the standalone major duration even on
    // jackpot so the highest-rarity floor doesn't run for the full 30s.
    state.encounterLegendaryUntil = now + ((SLOT_BONUSES.major && SLOT_BONUSES.major.duration) || duration);
  }
}

function slotNonMatch() {
  while (true) {
    const a = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const b = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const c = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    if (a === b && b === c) continue;
    return [a, b, c];
  }
}

function pickSlotOutcome() {
  const total = SLOT_OUTCOMES.reduce((a, o) => a + o.weight, 0);
  let r = Math.random() * total;
  for (const o of SLOT_OUTCOMES) {
    r -= o.weight;
    if (r <= 0) return o;
  }
  return SLOT_OUTCOMES[0];
}

function spinSlot() {
  const slot = $("slotMachine");
  if (!slot) return;
  if (slot.dataset.state === "spinning") return;
  slot.dataset.state = "spinning";
  slot.classList.remove("win", "lose", "win-two", "win-mini", "win-minor", "win-major", "win-jackpot");
  const status = slot.querySelector(".slot-status");
  if (status) status.textContent = "Spinning…";

  const reels = Array.from(slot.querySelectorAll(".slot-reel"));
  reels.forEach((r) => r.classList.add("spinning"));

  const outcome = pickSlotOutcome();
  const symbols = outcome.pick();

  // Rapidly cycle each reel's symbol while spinning to sell the rolling effect.
  const cyclers = reels.map((reel) => {
    const strip = reel.querySelector(".slot-strip");
    if (!strip) return null;
    return setInterval(() => {
      strip.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    }, 70);
  });

  reels.forEach((reel, idx) => {
    setTimeout(() => {
      if (cyclers[idx]) clearInterval(cyclers[idx]);
      reel.classList.remove("spinning");
      const strip = reel.querySelector(".slot-strip");
      if (strip) strip.textContent = symbols[idx];
      reel.classList.add("settle");
      setTimeout(() => reel.classList.remove("settle"), 300);
      if (idx === reels.length - 1) finishSpin(outcome, symbols);
    }, 900 + idx * 350);
  });
}

function finishSpin(outcome, symbols) {
  const slot = $("slotMachine");
  if (!slot) return;
  const status = slot.querySelector(".slot-status");
  slot.dataset.state = "idle";

  const bonus = SLOT_BONUSES[outcome.tier];
  if (bonus) {
    const now = Date.now();
    applySlotBonus(outcome.tier, now, bonus.duration, bonus);
    const isHazard = bonus.kind === "hazard";
    // Don't count hazards toward the "slot wins" achievements counter.
    if (!isHazard) state.bonusCollected = (state.bonusCollected || 0) + 1;
    if (!state.slotHits) state.slotHits = { mini: 0, minor: 0, major: 0, jackpot: 0, shark: 0 };
    state.slotHits[outcome.tier] = (state.slotHits[outcome.tier] || 0) + 1;
    slot.classList.add("win", `win-${outcome.tier}`);
    if (status) status.textContent = `${bonus.icon} ${bonus.name}`;
    const logKind = isHazard ? "bad" : (outcome.tier === "jackpot" ? "legend" : "good");
    log(`🎰 ${symbols.join(" ")} → ${bonus.icon} ${bonus.name} — ${bonus.desc}`, logKind);
    if (!suppressFx) showEncounterBanner(bonus);
    if (outcome.tier === "major" || outcome.tier === "jackpot") {
      flashScreen(outcome.tier === "jackpot" ? "legend" : "epic");
    }
    if (outcome.tier === "jackpot") leaderboardSync(true);
    checkAchievements();
  } else {
    slot.classList.add("lose");
    if (status) status.textContent = "No match. Next pull soon…";
  }

  setTimeout(() => {
    slot.classList.remove("win", "lose", "win-mini", "win-minor", "win-major", "win-jackpot", "win-shark");
    // Countdown text is restored by updateSlotCountdown on the next refresh.
  }, 4000);
}

const SLOT_INTERVAL_MS = 15000;

function scheduleSlot() {
  if (eventEnded()) return;
  // Honor the persisted timestamp so reloads / closing the tab don't restart
  // the countdown. If the saved spin time is in the past, fire immediately.
  const delay = Math.max(0, state.nextSpinAt - Date.now());
  setTimeout(() => {
    if (eventEnded()) return;
    spinSlot();
    state.nextSpinAt = Date.now() + SLOT_INTERVAL_MS;
    scheduleSlot();
  }, delay);
}

function updateSlotCountdown() {
  const slot = $("slotMachine");
  if (!slot) return;
  if (slot.dataset.state !== "idle") return;
  // Don't clobber the post-result win/lose message — those clear themselves after 4s.
  if (slot.classList.contains("win") || slot.classList.contains("lose")) return;
  const status = slot.querySelector(".slot-status");
  if (!status) return;
  const remaining = Math.max(0, Math.ceil((state.nextSpinAt - Date.now()) / 1000));
  const text = `Next spin in ${remaining}s`;
  if (status.textContent !== text) status.textContent = text;
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
    row.dataset.id = a.id;
    row.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-body">
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>
      <div class="ach-reward">$${fmt(a.reward)}</div>
    `;
    root.appendChild(row);
  }
  if (!root.dataset.delegated) {
    root.addEventListener("click", (ev) => {
      const row = ev.target.closest(".achievement");
      if (!row) return;
      if (row.dataset.state !== "unclaimed") return;
      claimAchievement(row.dataset.id);
    });
    root.dataset.delegated = "1";
  }
}

// Skip the per-tick walk over every achievement DOM unless the unlocked /
// claimed maps have changed size — those only change on a new unlock or a
// new claim. The achievement check itself runs whenever state changes.
let _achCountSig = "";
function updateAchievements() {
  const sig = Object.keys(state.achievements).length + ":" + Object.keys(state.achievementsClaimed).length;
  if (sig === _achCountSig) return;
  _achCountSig = sig;
  let unlocked = 0;
  let unclaimed = 0;
  for (const a of ACHIEVEMENTS) {
    const el = document.getElementById(`ach-${a.id}`);
    if (!el) continue;
    const isUnlocked = !!state.achievements[a.id];
    const isClaimed = !!state.achievementsClaimed[a.id];
    if (isUnlocked) unlocked += 1;
    let s;
    if (!isUnlocked) s = "locked";
    else if (!isClaimed) { s = "unclaimed"; unclaimed += 1; }
    else s = "claimed";
    if (el.dataset.state !== s) {
      el.dataset.state = s;
      el.classList.toggle("unlocked", isUnlocked);
      el.classList.toggle("unclaimed", s === "unclaimed");
      el.classList.toggle("claimed", s === "claimed");
      const reward = el.querySelector(".ach-reward");
      if (reward) {
        if (s === "unclaimed")    reward.textContent = `Claim $${fmt(a.reward)}`;
        else if (s === "claimed") reward.textContent = `✓ $${fmt(a.reward)}`;
        else                      reward.textContent = `$${fmt(a.reward)}`;
      }
    }
  }
  const counter = $("achCount");
  if (counter) {
    counter.textContent = unclaimed > 0
      ? `${unlocked}/${ACHIEVEMENTS.length} · ${unclaimed} ready`
      : `${unlocked}/${ACHIEVEMENTS.length}`;
  }
  const claimAllBtn = $("achClaimAll");
  if (claimAllBtn) {
    claimAllBtn.hidden = unclaimed < 2;
    claimAllBtn.textContent = unclaimed > 1 ? `Claim ${unclaimed}` : "Claim all";
  }
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

// Inline summaries are universal across themes — names and icons come from
// SLOT_BONUSES so themed events (Spring Bloom etc.) render their own copy.
const ACTIVE_EFFECT_SHORT = {
  major: "Legendary picks",
  minor: "2× value",
  mini:  "Double pickups",
  shark: "No loot",
};

function renderActiveEffect() {
  const el = $("activeEffect");
  if (!el) return;
  const now = Date.now();
  // Hazard pinned to the top of the stack so the player can watch it tick down.
  const rows = [];
  if ((state.sharkSlowUntil          || 0) > now) rows.push({ until: state.sharkSlowUntil,          tier: "shark", cls: "eff-shark" });
  if ((state.encounterLegendaryUntil || 0) > now) rows.push({ until: state.encounterLegendaryUntil, tier: "major", cls: "eff-map" });
  if ((state.encounterValueUntil     || 0) > now) rows.push({ until: state.encounterValueUntil,     tier: "minor", cls: "eff-kiss" });
  // Mini tier covers either Lucky Current (cargo bonus) or Chest Frenzy
  // (rapid chest spawns). When both are active simultaneously (e.g. mid-
  // jackpot, or a fresh cargo spin landing while frenzy is still running),
  // render BOTH rows so the player can read each timer instead of just
  // whichever ends last.
  const cargoUntil  = (state.encounterCargoUntil || 0);
  const frenzyUntil = (state.chestFrenzyUntil    || 0);
  if (frenzyUntil > now) rows.push({ until: frenzyUntil, tier: "mini", cls: "eff-current", subKind: "frenzy" });
  if (cargoUntil  > now) rows.push({ until: cargoUntil,  tier: "mini", cls: "eff-current", subKind: "cargo"  });

  // The container itself has no styling (CSS uses :empty / :not(:empty) to
  // toggle margin + flex layout). Each active bonus becomes a child row.
  el.innerHTML = "";
  for (const r of rows) {
    const bonus = SLOT_BONUSES[r.tier];
    const remaining = Math.max(1, Math.ceil((r.until - now) / 1000));
    let shortDesc = ACTIVE_EFFECT_SHORT[r.tier] || "";
    // Mini and Minor tiers carry their multipliers in state so the banner
    // reflects the actual active bonus (Butterfly Kiss vs. Mermaid's Kiss,
    // Chest Frenzy vs. Lucky Current).
    if (r.tier === "minor") {
      const v = state.encounterValueAmt || 2;
      const xpActive = (state.encounterXpUntil || 0) > now && (state.encounterXpAmt || 1) > 1;
      shortDesc = xpActive
        ? `${v}× value & ${state.encounterXpAmt}× XP`
        : `${v}× value`;
    } else if (r.tier === "mini") {
      if (r.subKind === "frenzy") {
        shortDesc = "Chest frenzy";
      } else {
        const c = state.encounterCargoAmt || 2;
        shortDesc = `${c}× pickups`;
      }
    }
    const name = (bonus && bonus.name) || r.tier;
    const icon = (bonus && bonus.icon) || "✨";
    const fullDesc = (bonus && bonus.desc) || "";
    const row = document.createElement("div");
    row.className = `active-effect ${r.cls}`;
    row.title = `${name}\n\n${fullDesc}`;
    row.innerHTML = `<span class="ae-label">${icon} ${escapeHtml(name.toUpperCase())} — ${escapeHtml(shortDesc)}</span><span class="ae-timer">${remaining}s</span>`;
    el.appendChild(row);
  }
}

let _cargoSig = null;
function renderCurrentCargo() {
  const ul = $("currentCargo");
  if (!ul) return;
  const grouped = state.sub.cargoGrouped || {};
  const total = state.sub.cargoTotalValue || 0;
  const names = Object.keys(grouped);
  if (names.length === 0) {
    if (_cargoSig !== "empty") {
      ul.innerHTML = `<li class="muted">Empty</li>`;
      _cargoSig = "empty";
    }
    return;
  }
  // Skip rebuilds when nothing has changed — total only ticks up when items
  // are added, so this is a precise dirty bit rather than a tick-counter.
  const sig = `${total}|${names.length}`;
  if (sig === _cargoSig) return;
  _cargoSig = sig;

  const rows = names.map((name) => {
    const g = grouped[name];
    return `<li class="rarity-${g.rarity}"><span>${g.icon || ""} ${name} ×${g.count}</span><span>$${fmt(g.totalValue)}</span></li>`;
  }).join("");
  ul.innerHTML = rows + `<li class="haul-total"><span>Total</span><span>$${fmt(total)}</span></li>`;
}

let _haulRef = undefined;
function renderHaul() {
  const ul = $("lastHaul");
  if (state.lastHaul === _haulRef) return;
  _haulRef = state.lastHaul;
  if (!state.lastHaul || state.lastHaul.length === 0) {
    ul.innerHTML = `<li class="muted">Nothing yet.</li>`;
    return;
  }
  const total = state.lastHaul.reduce((a, b) => a + (b.value || 0), 0);
  const rows = [...state.lastHaul]
    .sort((a, b) => b.value - a.value)
    .map(
      (i) => `<li class="rarity-${i.rarity}">
        <span>${i.icon || ""} ${i.name} ×${i.count}</span><span>$${fmt(i.value)}</span>
      </li>`
    )
    .join("");
  ul.innerHTML = rows + `<li class="haul-total"><span>Total</span><span>$${fmt(total)}</span></li>`;
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
  if (eventEnded()) return;
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

  const hint = document.querySelector(".boost-hint");
  if (hint) {
    hint.classList.toggle("active", active);
    hint.classList.toggle("cooling", !active && cooling);
  }

  const subEl = btn.querySelector(".boost-sub");
  if (active) {
    btn.disabled = false;
    if (state.adminBoostAlwaysOn) {
      btn.querySelector(".boost-label").textContent = `⚡ ADMIN`;
      subEl.textContent = "always on";
      cd.style.width = `100%`;
    } else {
      const remaining = (state.boost.activeUntil - now) / 1000;
      btn.querySelector(".boost-label").textContent = `⚡ ${remaining.toFixed(1)}s`;
      subEl.textContent = "tap +1s";
      cd.style.width = `${(remaining / (BOOST_DURATION_MS / 1000)) * 100}%`;
    }
  } else if (cooling) {
    btn.disabled = true;
    const remaining = (state.boost.readyAt - now) / 1000;
    btn.querySelector(".boost-label").textContent = `⏳ ${remaining.toFixed(1)}s`;
    subEl.textContent = "cooldown";
    cd.style.width = `${100 - (remaining / (BOOST_COOLDOWN_MS / 1000)) * 100}%`;
  } else {
    btn.disabled = false;
    btn.querySelector(".boost-label").textContent = "⚡ BOOST";
    subEl.textContent = "tap or space";
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

  // XP progress bar to next level.
  const cumPrev = levelCostCumulative(state.level);
  const cumNext = levelCostCumulative(state.level + 1);
  const progressed = Math.max(0, state.xp - cumPrev);
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
  // Sub moved — FX rect cache must be recomputed before the next pick uses it.
  _invalidateFxRects();

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
  updateSlotCountdown();
  refreshEventCountdown();
}

// ----- Event welcome modal --------------------------------------
function wireEventWelcome() {
  if (!EVENT_KEY) return;
  const overlay = document.getElementById("eventWelcomeOverlay");
  if (!overlay) return;
  const seenKey = `event_welcome_seen_${EVENT_KEY}`;
  const close = () => {
    overlay.hidden = true;
    if (document.getElementById("eventWelcomeNoShow")?.checked) {
      try { localStorage.setItem(seenKey, "1"); } catch {}
    }
  };
  document.getElementById("eventWelcomeClose")?.addEventListener("click", close);
  document.getElementById("eventWelcomeOk")?.addEventListener("click", close);
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
  // Show on first visit (or every visit until "don't show again" is checked).
  let seen = false;
  try { seen = !!localStorage.getItem(seenKey); } catch {}
  if (!seen) overlay.hidden = false;
}

// ----- Event countdown / end-of-event freeze --------------------
function injectEventCountdown() {
  if (EVENT_END <= 0) return;
  const header = document.querySelector("#sidebar header");
  if (!header || document.getElementById("eventCountdown")) return;
  const el = document.createElement("div");
  el.id = "eventCountdown";
  el.className = "event-countdown";
  header.appendChild(el);
}

function refreshEventCountdown() {
  if (EVENT_END <= 0) return;
  const el = document.getElementById("eventCountdown");
  if (!el) return;
  const now = Date.now();
  if (now >= EVENT_END) {
    if (!el.classList.contains("ended")) {
      el.classList.add("ended");
      el.textContent = `🌸 ${EVENT_NAME || "Event"} ended — final standings below`;
    }
    if (!document.body.classList.contains("event-ended")) {
      document.body.classList.add("event-ended");
      showEventEndedOverlay();
    }
    return;
  }
  const remaining = EVENT_END - now;
  const days  = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins  = Math.floor((remaining % 3600000) / 60000);
  const secs  = Math.floor((remaining % 60000) / 1000);
  let txt;
  if (days > 0)        txt = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0)  txt = `${hours}h ${mins}m ${secs}s`;
  else                 txt = `${mins}m ${secs}s`;
  el.textContent = `🌸 ${EVENT_NAME || "Event"} — ends in ${txt}`;
}

function showEventEndedOverlay() {
  if (document.getElementById("eventEndedOverlay")) return;
  const ocean = document.getElementById("ocean");
  if (!ocean) return;
  const ov = document.createElement("div");
  ov.id = "eventEndedOverlay";
  ov.className = "event-ended-overlay";
  ov.innerHTML = `
    <div class="event-ended-card">
      <div class="event-ended-title">🌸 Event Ended</div>
      <div class="event-ended-sub">${escapeHtml(EVENT_NAME || "")} has closed.</div>
      <div class="event-ended-msg">Final leaderboard is locked. See the sidebar for the standings.</div>
      <a href="index.html" class="event-ended-btn">← Back to main game</a>
    </div>
  `;
  ocean.appendChild(ov);
}

const LOG_LIFETIME_MS = 5000;
const LOG_FADE_MS = 2000;

const LOG_COLORS = {
  good:     "var(--good)",
  bad:      "var(--bad)",
  common:   "#b8c6d2",
  uncommon: "var(--good)",
  rare:     "var(--accent)",
  epic:     "#c79bff",
  legend:   "var(--gold)",
};
const LOOT_RARITY_KINDS = new Set(["common", "uncommon", "rare", "epic", "legend"]);
let _lastLogLine = null;
const _diveLootLines = new Map(); // key: msg, value: pinned line element

function _scheduleLogDeath(line) {
  if (line._deathTimer) clearTimeout(line._deathTimer);
  line._deathTimer = setTimeout(() => {
    if (line.parentNode && !line.classList.contains("fading")) {
      line.classList.add("fading");
      setTimeout(() => line.remove(), LOG_FADE_MS);
    }
  }, LOG_LIFETIME_MS);
}

function clearDiveLoot() {
  for (const [, line] of _diveLootLines) {
    if (line.parentNode) line.remove();
  }
  _diveLootLines.clear();
}

function _bumpLine(line, msg, count) {
  line.dataset.count = String(count);
  line.textContent = count > 1 ? `${msg} ×${count}` : msg;
  // Throttle the restart-animation reflow — at high pick rates this fires
  // every tick and was a major late-game lag source.
  const now = performance.now();
  if (now - (line._lastBump || 0) < 220) return;
  line._lastBump = now;
  line.classList.remove("bumped");
  void line.offsetWidth;
  line.classList.add("bumped");
}

function log(msg, kind) {
  const root = $("log");
  if (!root) return;
  const k = kind || "";

  // Loot rows pin for the whole dive — stack any repeats by msg even if other
  // log lines come in between. clearDiveLoot() wipes them at the next dive.
  if (LOOT_RARITY_KINDS.has(k)) {
    const existing = _diveLootLines.get(msg);
    if (existing && existing.parentNode === root) {
      _bumpLine(existing, msg, (parseInt(existing.dataset.count, 10) || 1) + 1);
      return;
    }
    const line = document.createElement("div");
    line.className = "log-line dive-loot";
    if (LOG_COLORS[k]) line.style.borderColor = LOG_COLORS[k];
    if (k === "legend") line.style.boxShadow = "0 0 10px rgba(255,200,80,0.4)";
    line.textContent = msg;
    line.dataset.msg = msg;
    line.dataset.kind = k;
    line.dataset.count = "1";
    root.prepend(line);
    _diveLootLines.set(msg, line);
    while (root.childElementCount > 12) root.lastChild.remove();
    _lastLogLine = line;
    return;
  }

  // Non-loot lines: collapse only if the previous line (still alive) matches.
  if (
    _lastLogLine && _lastLogLine.parentNode === root &&
    !_lastLogLine.classList.contains("fading") &&
    !_lastLogLine.classList.contains("dive-loot") &&
    _lastLogLine.dataset.msg === msg && _lastLogLine.dataset.kind === k
  ) {
    _bumpLine(_lastLogLine, msg, (parseInt(_lastLogLine.dataset.count, 10) || 1) + 1);
    _scheduleLogDeath(_lastLogLine);
    return;
  }

  const line = document.createElement("div");
  line.className = "log-line";
  if (LOG_COLORS[k]) line.style.borderColor = LOG_COLORS[k];
  if (k === "legend") line.style.boxShadow = "0 0 10px rgba(255,200,80,0.4)";
  line.textContent = msg;
  line.dataset.msg = msg;
  line.dataset.kind = k;
  line.dataset.count = "1";
  root.prepend(line);
  _scheduleLogDeath(line);
  while (root.childElementCount > 12) root.lastChild.remove();
  _lastLogLine = line;
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

// ----- Leaderboard (Supabase, raw fetch) -----------------------
// Pretty-print a millisecond duration as the largest two units that fit:
// "3d 4h", "5h 12m", "8m 30s", "42s". Used by the time-played leaderboard
// and anywhere else we want a compact human-readable elapsed time.
function fmtDuration(ms) {
  const n = Math.max(0, Math.floor(Number(ms) || 0));
  const sec  = Math.floor(n / 1000);
  const min  = Math.floor(sec / 60);
  const hr   = Math.floor(min / 60);
  const day  = Math.floor(hr / 24);
  if (day > 0) return `${day}d ${hr % 24}h`;
  if (hr  > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

// Event pages use the pollen 🌼 emoji; the main game uses pearls 🔮.
// Same in-DB metric, just labelled per page.
const LB_PEARL_EMOJI = EVENT ? "🌼" : "🔮";

const LB_METRICS = [
  { id: "total_earned",   label: "Cash",     fmt: (n) => "$" + fmt(Number(n) || 0) },
  { id: "level",          label: "Level",    fmt: (n) => "Lv " + n },
  { id: "prestige_count", label: "Promotes", fmt: (n) => String(n) },
  { id: "jackpots",       label: "Jackpots", fmt: (n) => String(n) },
  { id: "pearls",         label: "Pearls",   fmt: (n) => fmt(Number(n) || 0) + " " + LB_PEARL_EMOJI },
  { id: "total_dives",    label: "Dives",    fmt: (n) => fmt(Number(n) || 0) },
  { id: "time_played_ms", label: "Time",     fmt: (n) => fmtDuration(Number(n) || 0) },
];
// Pick the first .active tab as the initial metric so each page can choose
// its own default (Spring Bloom defaults to pollen; main game to cash).
let lbCurrentMetric = (typeof document !== "undefined" && document.querySelector(".lb-tab.active")?.dataset.metric) || "total_earned";
let lbLastSyncSig = "";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

function ensurePlayerId() {
  if (!state.playerId) {
    state.playerId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return state.playerId;
}

// Pearls / cash / time-played columns are now `numeric` (arbitrary
// precision) instead of `bigint`, so the old 9e18 cap is gone. Above
// Number.MAX_SAFE_INTEGER (~9e15) JS loses unit-level integer precision
// and JSON.stringify will emit scientific notation past ~1e21, which
// PostgREST rejects for numeric columns. Send those values as plain
// integer strings via BigInt to preserve as much precision as the JS
// Number had, and avoid the sci-notation issue entirely.
function lbBigNumber(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (!isFinite(v)) return 0;
  if (v <= Number.MAX_SAFE_INTEGER) return v;
  try { return BigInt(v).toString(); } catch { return v.toFixed(0); }
}

function leaderboardPayload() {
  // The scores table now always carries an event_key (default '' for the
  // main game) and a composite unique on (player_id, event_key). Always
  // emitting both fields keeps the upsert working whether the event SQL
  // migration has been applied or not.
  return {
    player_id: ensurePlayerId(),
    event_key: EVENT_KEY || "",
    display_name: ((state.displayName || "").trim().slice(0, 32)) || "Anon",
    total_earned: lbBigNumber(state.totalEarned),
    level: state.level || 1,
    prestige_count: state.prestigeCount || 0,
    pearls: lbBigNumber(state.pearls),
    jackpots: (state.slotHits && state.slotHits.jackpot) || 0,
    chests: state.chestsCollected || 0,
    total_dives: state.totalDives || 0,
    time_played_ms: lbBigNumber(state.timePlayedMs),
  };
}

async function leaderboardSync(force) {
  if (!state.displayName) return;
  if (eventEnded()) return;
  const payload = leaderboardPayload();
  const sig = JSON.stringify(payload);
  if (!force && sig === lbLastSyncSig) return;
  lbLastSyncSig = sig;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=player_id,event_key`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Bust the cached signature so the next sync retries.
      lbLastSyncSig = "";
      const text = await res.text().catch(() => "");
      log(`⚠ Leaderboard sync failed: ${res.status} ${text.slice(0, 120)}`, "bad");
    }
  } catch (e) {
    lbLastSyncSig = "";
    log(`⚠ Leaderboard sync error: ${e?.message || e}`, "bad");
  }
}

async function leaderboardFetch(metric, limit = 25) {
  let url = `${SUPABASE_URL}/rest/v1/scores?select=display_name,player_id,${metric}`;
  if (EVENT_KEY) url += `&event_key=eq.${encodeURIComponent(EVENT_KEY)}`;
  url += `&order=${metric}.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error("leaderboard fetch failed: " + res.status);
  return res.json();
}

async function renderLeaderboard() {
  const board = $("lbBoard");
  if (!board) return;
  if (board.dataset.loading === "1") return;
  board.dataset.loading = "1";
  if (!board.children.length) board.innerHTML = `<div class="lb-empty muted">Loading…</div>`;
  const metric = LB_METRICS.find(m => m.id === lbCurrentMetric) || LB_METRICS[0];
  try {
    const rows = await leaderboardFetch(metric.id);
    if (!rows || rows.length === 0) {
      board.innerHTML = `<div class="lb-empty muted">No scores yet — set a name and Sync to be first.</div>`;
      return;
    }
    board.innerHTML = rows.map((r, i) => {
      const isMe = state.playerId && r.player_id === state.playerId;
      const val = metric.fmt(r[metric.id]);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
      return `<div class="lb-row${isMe ? " me" : ""}"><span class="lb-rank">${medal}</span><span class="lb-name">${escapeHtml(r.display_name)}</span><span class="lb-val">${val}</span></div>`;
    }).join("");
  } catch {
    board.innerHTML = `<div class="lb-empty muted">Couldn't reach leaderboard. Try again later.</div>`;
  } finally {
    board.dataset.loading = "";
  }
}

function wireLeaderboard() {
  document.querySelectorAll(".lb-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      lbCurrentMetric = btn.dataset.metric;
      document.querySelectorAll(".lb-tab").forEach(b => b.classList.toggle("active", b === btn));
      renderLeaderboard();
    });
  });
  const nameEl = $("lbName");
  if (nameEl) {
    nameEl.value = state.displayName || "";
    nameEl.addEventListener("change", () => {
      state.displayName = nameEl.value.trim().slice(0, 32);
    });
  }
  const syncBtn = $("lbSync");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      const name = (nameEl?.value || "").trim().slice(0, 32);
      if (!name) {
        if (nameEl) { nameEl.focus(); nameEl.placeholder = "Enter a name first"; }
        return;
      }
      state.displayName = name;
      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing…";
      await leaderboardSync(true);
      await renderLeaderboard();
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync";
    });
  }
}

// ----- Admin gate (honor-system password) ----------------------
function wireAdminGate() {
  const overlay = $("adminOverlay");
  const gate    = $("adminGate");
  const tools   = $("adminTools");
  const pwInput = $("adminPw");
  const openBtn = $("adminBtn");
  if (!overlay || !openBtn) return;
  function reset() {
    if (gate)  gate.hidden = false;
    if (tools) tools.hidden = true;
    if (pwInput) { pwInput.value = ""; pwInput.placeholder = "Password"; }
  }
  function close() { overlay.hidden = true; reset(); }
  function unlock() {
    if (!pwInput) return;
    if (pwInput.value === ADMIN_PASSWORD) {
      if (gate)  gate.hidden = true;
      if (tools) tools.hidden = false;
      pwInput.value = "";
    } else {
      pwInput.value = "";
      pwInput.placeholder = "Wrong password";
      pwInput.classList.add("shake");
      setTimeout(() => pwInput.classList.remove("shake"), 400);
    }
  }
  openBtn.addEventListener("click", () => { reset(); overlay.hidden = false; });
  $("adminClose")?.addEventListener("click", close);
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
  $("adminUnlock")?.addEventListener("click", unlock);
  pwInput?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") unlock(); });
}

// ----- Supabase Auth + Cloud Saves -------------------------------
// Anonymous-first auth: every visitor gets a real auth.users row from the
// jump (silent), so their save and leaderboard entry survive across devices
// once they upgrade to email+password via the Account modal. The Supabase
// JS SDK is loaded by index.html as a UMD bundle and exposed at
// window.supabase. If the CDN fails to load, the game falls back to the
// pre-auth localStorage-only behavior.
const supaClient = (typeof window !== "undefined" && window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "deepSeaAuth_v1" },
    })
  : null;

let authUser = null;
let authSession = null;
let authReady = false;
let _cloudSaveBusy = false;
let _cloudSaveDirty = false;
let _cloudSaveTimer = null;

function authToken() { return authSession?.access_token || SUPABASE_KEY; }
function isAnonymous()      { return !!authUser && (authUser.is_anonymous === true || !authUser.email); }
function authEmail()        { return authUser?.email || ""; }

async function initAuth() {
  if (!supaClient) {
    // SDK didn't load — keep working in local-only mode using the existing
    // random playerId. Leaderboard still works via the publishable apikey.
    authReady = true;
    return;
  }
  try {
    const { data: { session } } = await supaClient.auth.getSession();
    if (session) {
      authSession = session;
      authUser = session.user;
    } else {
      const { data, error } = await supaClient.auth.signInAnonymously();
      if (error) {
        // Anonymous sign-ins likely not enabled in the dashboard. Fall back
        // to local-only and surface a one-time hint in the log.
        console.warn("Anonymous sign-in failed:", error.message);
        log("⚠ Cloud saves unavailable — anonymous auth not enabled.", "bad");
      } else {
        authSession = data.session;
        authUser = data.user;
      }
    }
  } catch (e) {
    console.warn("initAuth failed:", e);
  }
  authReady = true;

  // Keep our handles in sync as the SDK refreshes tokens or the user signs
  // in/out from the Account modal.
  supaClient.auth.onAuthStateChange((_event, session) => {
    authSession = session;
    authUser = session?.user || null;
    refreshAccountUI();
  });
}

async function migrateLegacyPlayerId() {
  if (!authUser) return;
  if (state.legacyMigratedAt) return;
  const oldPlayerId = state.playerId;
  // Future writes go under the auth user_id.
  state.playerId = authUser.id;
  state.legacyMigratedAt = Date.now();
  save();
  if (!oldPlayerId || oldPlayerId === authUser.id) return;
  // Best-effort delete of the orphaned leaderboard row so the same player
  // doesn't appear twice. Open RLS makes this work; if RLS later tightens,
  // the request will 4xx and we silently move on (the orphan will fall off
  // the top of the board as others advance).
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scores?player_id=eq.${encodeURIComponent(oldPlayerId)}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
  } catch {}
  // Re-post the leaderboard row under the new player_id.
  if (state.displayName) leaderboardSync(true);
}

// Each save scope (main game, event) gets its own cloud row keyed by SAVE_KEY,
// so the Spring Bloom event can sync independently of the main game without
// either clobbering the other.
async function pullCloudSave() {
  if (!authUser || !authSession) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/saves?user_id=eq.${authUser.id}&save_key=eq.${encodeURIComponent(SAVE_KEY)}&select=state,updated_at`;
    const res = await fetch(url, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${authToken()}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function pushCloudSave() {
  if (!authUser || !authSession) return;
  if (_cloudSaveBusy) { _cloudSaveDirty = true; return; }
  _cloudSaveBusy = true;
  try {
    state.lastTick = Date.now();
    const payload = {
      user_id: authUser.id,
      save_key: SAVE_KEY,
      state: state,
      updated_at: new Date().toISOString(),
    };
    await fetch(`${SUPABASE_URL}/rest/v1/saves?on_conflict=user_id,save_key`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${authToken()}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
  } catch { /* offline-tolerant */ }
  finally {
    _cloudSaveBusy = false;
    if (_cloudSaveDirty) {
      _cloudSaveDirty = false;
      // Re-run on next tick so we don't stack microtasks.
      setTimeout(pushCloudSave, 0);
    }
  }
}

function applyCloudState(cloudState) {
  if (!cloudState) return;
  // Bind the cloud save to the current auth identity (in case the cloud
  // save predates the legacy migration).
  cloudState.playerId = authUser ? authUser.id : cloudState.playerId;
  // Replay the same defensive defaults the boot block applies to localStorage
  // saves so older shapes don't leave undefined fields after replacement.
  if (!cloudState.boost) cloudState.boost = { activeUntil: 0, readyAt: 0 };
  if (cloudState.level === undefined) cloudState.level = 1;
  if (cloudState.xp === undefined) cloudState.xp = cloudState.totalEarned || 0;
  if (cloudState.totalDives === undefined) cloudState.totalDives = 0;
  if (cloudState.totalItems === undefined) cloudState.totalItems = 0;
  if (cloudState.boostsUsed === undefined) cloudState.boostsUsed = 0;
  if (!cloudState.rarityCounts) cloudState.rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legend: 0 };
  if (!cloudState.lifetimeItems) cloudState.lifetimeItems = {};
  if (!cloudState.achievements) cloudState.achievements = {};
  if (!cloudState.achievementsClaimed) cloudState.achievementsClaimed = {};
  if (!cloudState.slotHits) cloudState.slotHits = { mini: 0, minor: 0, major: 0, jackpot: 0 };
  if (!cloudState.inventory) cloudState.inventory = [];
  if (!cloudState.sub) cloudState.sub = { depth: 0, targetDepth: 0, cargoKg: 0, cargoItems: [], cargoGrouped: {}, cargoTotalValue: 0, mode: "idle" };
  if (!cloudState.sub.cargoGrouped) cloudState.sub.cargoGrouped = {};
  if (cloudState.sub.cargoTotalValue === undefined) cloudState.sub.cargoTotalValue = 0;
  state = cloudState;
  save(true);
}

async function syncCloudSaveOnBoot() {
  const remote = await pullCloudSave();
  if (!remote) {
    // No cloud save — push local up if we have something worth saving.
    if (state.totalEarned > 0 || state.level > 1) await pushCloudSave();
    return;
  }
  const remoteTick = (remote.state && remote.state.lastTick) || 0;
  const localTick  = state.lastTick || 0;
  // Cloud meaningfully newer (>30s) → adopt it. Same-ish or older → push local up.
  if (remoteTick > localTick + 30000) {
    applyCloudState(remote.state);
    log("☁️ Loaded cloud save (newer than local).", "good");
    refreshUI();
  } else if (localTick > remoteTick + 30000) {
    await pushCloudSave();
  }
}

function scheduleCloudSaves() {
  if (_cloudSaveTimer) clearInterval(_cloudSaveTimer);
  _cloudSaveTimer = setInterval(() => { if (!resetting) pushCloudSave(); }, 15000);
}

// ----- Account modal --------------------------------------------
// Single email+password form with two action buttons: "Sign in" (existing
// account) and "Create account" (new account or anonymous → permanent).
// One status block at the top describes where the player stands; messages
// surface inline below the form.
function _accountMsg(text, ok) {
  const m = $("accountMsg");
  if (!m) return;
  m.textContent = text || "";
  m.className = "account-msg" + (text ? (ok ? " ok" : " bad") : "");
}

async function handleAccountSignUp(email, password) {
  if (!supaClient) return { ok: false, msg: "Auth unavailable. Try Save / Load instead." };
  // Anonymous → permanent: keeps the same user_id, so cloud save stays attached.
  if (authUser && isAnonymous()) {
    const { error } = await supaClient.auth.updateUser({ email, password });
    if (error) return { ok: false, msg: error.message };
    await pushCloudSave();
    return { ok: true, msg: "Account created. Your progress is saved." };
  }
  // Plain signup (no anonymous session — e.g., dashboard has anon disabled).
  const { data, error } = await supaClient.auth.signUp({ email, password });
  if (error) return { ok: false, msg: error.message };
  authSession = data.session || null;
  authUser    = data.user    || null;
  if (authUser) await pushCloudSave();
  return { ok: true, msg: data.session ? "Account created and signed in." : "Account created. Check your email to confirm." };
}

async function handleAccountSignIn(email, password) {
  if (!supaClient) return { ok: false, msg: "Auth unavailable. Try Save / Load instead." };
  const { data, error } = await supaClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, msg: error.message };
  authSession = data.session;
  authUser = data.user;
  await syncCloudSaveOnBoot();
  refreshUI();
  return { ok: true, msg: "Signed in." };
}

async function handleAccountSignOut() {
  if (!supaClient) return;
  await supaClient.auth.signOut();
  location.reload();
}

function refreshAccountUI() {
  const stateLine  = $("accountStateLine");
  const stateBlurb = $("accountStateBlurb");
  const authForm   = $("accountAuthForm");
  const signedInActions = $("accountSignedInActions");
  const skipBtn    = $("accountSkipBtn");
  const badge      = $("accountBadge");

  if (!authReady) {
    if (stateLine)  stateLine.textContent  = "Connecting…";
    if (stateBlurb) stateBlurb.textContent = "Setting up your session.";
    if (authForm)   authForm.hidden = true;
    if (signedInActions) signedInActions.hidden = true;
    if (skipBtn)    skipBtn.hidden = true;
    if (badge)      badge.hidden = true;
    return;
  }
  if (badge) badge.hidden = false;

  if (!authUser) {
    if (stateLine)  stateLine.textContent  = "Sign in to save your progress";
    if (stateBlurb) stateBlurb.textContent = "Same account = same save on every device. Climb the leaderboard with one identity.";
    if (authForm)   authForm.hidden = false;
    if (signedInActions) signedInActions.hidden = true;
    if (skipBtn)    skipBtn.hidden = false;
    if (badge) {
      badge.textContent = "offline";
      badge.classList.remove("anon", "linked");
    }
  } else if (isAnonymous()) {
    if (stateLine)  stateLine.textContent  = "Playing as guest";
    if (stateBlurb) stateBlurb.textContent = "Create an account to keep this save and load it on other devices.";
    if (authForm)   authForm.hidden = false;
    if (signedInActions) signedInActions.hidden = true;
    if (skipBtn)    skipBtn.hidden = false;
    if (badge) {
      badge.textContent = "guest";
      badge.classList.add("anon");
      badge.classList.remove("linked");
    }
  } else {
    if (stateLine)  stateLine.textContent  = `Signed in as ${authEmail()}`;
    if (stateBlurb) stateBlurb.textContent = "Cloud save active. Your progress syncs every 15 seconds.";
    if (authForm)   authForm.hidden = true;
    if (signedInActions) signedInActions.hidden = false;
    if (skipBtn)    skipBtn.hidden = true;
    if (badge) {
      badge.textContent = authEmail().split("@")[0];
      badge.classList.add("linked");
      badge.classList.remove("anon");
    }
  }
}

const _LOGIN_SKIP_KEY = "ddsLoginSkip_v1";
function maybeShowLoginGate() {
  if (!authReady) return;
  if (authUser && !isAnonymous()) return; // already signed in
  let skipped = false;
  try { skipped = !!localStorage.getItem(_LOGIN_SKIP_KEY); } catch {}
  if (skipped) return;
  const overlay = $("accountOverlay");
  if (!overlay) return;
  refreshAccountUI();
  _accountMsg("");
  overlay.hidden = false;
}
function markLoginSkipped() {
  try { localStorage.setItem(_LOGIN_SKIP_KEY, "1"); } catch {}
}
function clearLoginSkipped() {
  try { localStorage.removeItem(_LOGIN_SKIP_KEY); } catch {}
}

function wireAccountModal() {
  const overlay = $("accountOverlay");
  const openBtn = $("accountBtn");
  if (!overlay) return;
  function close() {
    overlay.hidden = true;
    _accountMsg("");
    // Closing while not signed in counts as "skip for now" — saves the player
    // from seeing the gate every reload. They can still open Account anytime.
    if (!authUser || isAnonymous()) markLoginSkipped();
  }
  openBtn?.addEventListener("click", () => { refreshAccountUI(); _accountMsg(""); overlay.hidden = false; });
  $("accountClose")?.addEventListener("click", close);
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
  $("accountSkipBtn")?.addEventListener("click", close);

  function readForm() {
    const email = ($("accountEmail")?.value || "").trim();
    const password = $("accountPassword")?.value || "";
    if (!email || !email.includes("@")) return { err: "Enter a valid email." };
    if (password.length < 6) return { err: "Password needs 6+ characters." };
    return { email, password };
  }
  function setBusy(b) {
    $("accountSignInBtn") && ($("accountSignInBtn").disabled = b);
    $("accountSignUpBtn") && ($("accountSignUpBtn").disabled = b);
  }

  $("accountSignInBtn")?.addEventListener("click", async () => {
    const f = readForm();
    if (f.err) { _accountMsg(f.err, false); return; }
    _accountMsg("Signing in…", true);
    setBusy(true);
    const res = await handleAccountSignIn(f.email, f.password);
    setBusy(false);
    _accountMsg(res.msg, res.ok);
    if (res.ok) {
      clearLoginSkipped();
      refreshAccountUI();
      setTimeout(() => { overlay.hidden = true; }, 600);
    }
  });
  $("accountSignUpBtn")?.addEventListener("click", async () => {
    const f = readForm();
    if (f.err) { _accountMsg(f.err, false); return; }
    _accountMsg("Creating account…", true);
    setBusy(true);
    const res = await handleAccountSignUp(f.email, f.password);
    setBusy(false);
    _accountMsg(res.msg, res.ok);
    if (res.ok) {
      clearLoginSkipped();
      refreshAccountUI();
      // Leave modal up so success message shows; auto-close shortly after.
      setTimeout(() => { if (authUser && !isAnonymous()) overlay.hidden = true; }, 1200);
    }
  });
  // Enter inside the form triggers Sign in (the most common action).
  ["accountEmail", "accountPassword"].forEach(id => {
    $(id)?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); $("accountSignInBtn")?.click(); }
    });
  });
  $("accountSignOutBtn")?.addEventListener("click", async () => {
    if (!confirm("Sign out? Your cloud save stays — sign back in any time to restore it.")) return;
    await handleAccountSignOut();
  });
}

// ----- Boot ------------------------------------------------------
$("resetBtn")?.addEventListener("click", reset);
$("exportSaveBtn")?.addEventListener("click", exportSaveFile);
$("importSaveBtn")?.addEventListener("click", () => $("importSaveFile")?.click());
$("importSaveFile")?.addEventListener("change", (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const res = importSaveFromText(reader.result);
    if (!res.ok) log("⚠ Import: " + res.msg, "bad");
  };
  reader.onerror = () => log("⚠ Import: couldn't read file.", "bad");
  reader.readAsText(file);
  ev.target.value = ""; // allow re-selecting the same file
});
$("boostBtn")?.addEventListener("click", activateBoost);
$("prestigeBtn")?.addEventListener("click", doPrestige);
// stopPropagation so the button doesn't toggle the panel collapse via the h2 click handler.
$("achClaimAll")?.addEventListener("click", (ev) => { ev.stopPropagation(); claimAllAchievements(); });

const howToOverlay = $("howToOverlay");
$("howToBtn")?.addEventListener("click", () => { if (howToOverlay) howToOverlay.hidden = false; });
$("howToClose")?.addEventListener("click", () => { if (howToOverlay) howToOverlay.hidden = true; });
howToOverlay?.addEventListener("click", (ev) => {
  if (ev.target === howToOverlay) howToOverlay.hidden = true;
});
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && howToOverlay && !howToOverlay.hidden) howToOverlay.hidden = true;
});
$("adminCashBtn")?.addEventListener("click", () => {
  state.cash += 1000000;
  state.totalEarned += 1000000;
  state.xp += 1000000;
  checkLevelUp();
  log(`[admin] +$1,000,000.`);
  refreshUI();
});
$("adminBoostBtn")?.addEventListener("click", () => {
  state.adminBoostAlwaysOn = !state.adminBoostAlwaysOn;
  const b = $("adminBoostBtn");
  if (b) b.textContent = `Boost: ${state.adminBoostAlwaysOn ? "ON" : "OFF"} (admin)`;
  log(`[admin] Always-boost ${state.adminBoostAlwaysOn ? "enabled" : "disabled"}.`);
  refreshUI();
});
// Restore button label on load.
if (state.adminBoostAlwaysOn) {
  const b = $("adminBoostBtn");
  if (b) b.textContent = "Boost: ON (admin)";
}
$("adminLvlBtn")?.addEventListener("click", () => {
  const prevBiomeIdx = biomeIndex(state.level);
  state.level += 10;
  state.xp = Math.max(state.xp, levelCostCumulative(state.level));
  const newBiomeIdx = biomeIndex(state.level);
  log(`[admin] Now Lv ${state.level}.`);
  if (newBiomeIdx !== prevBiomeIdx) {
    log(`🌊 Now exploring ${BIOMES[newBiomeIdx].name}!`, "good");
  }
  checkAchievements();
  refreshUI();
});

// Collapsible + tear-off panels. Each sidebar panel can pop out into a
// free-floating window the player drags around the screen, then dock back
// when they want it in the sidebar again. Position + popped state both
// persist in localStorage so layouts survive reloads.
const PANEL_KEY = (EVENT && EVENT.panelKey) || "deepSeaPanels_v2";
const POP_KEY   = PANEL_KEY + "_popped";
const panelState  = (() => { try { return JSON.parse(localStorage.getItem(PANEL_KEY) || "{}"); } catch { return {}; } })();
const poppedState = (() => { try { return JSON.parse(localStorage.getItem(POP_KEY)   || "{}"); } catch { return {}; } })();
const PANEL_DEFAULT_OPEN = new Set(["submersible", "ondeck", "lastrun", "outfitting"]);

function savePoppedState() {
  try { localStorage.setItem(POP_KEY, JSON.stringify(poppedState)); } catch {}
}

function clampPanelPosition(panel) {
  const rect = panel.getBoundingClientRect();
  const left = parseFloat(panel.style.left) || rect.left;
  const top  = parseFloat(panel.style.top)  || rect.top;
  const maxL = window.innerWidth  - Math.min(rect.width,  window.innerWidth  - 40);
  const maxT = window.innerHeight - Math.min(rect.height, window.innerHeight - 40);
  panel.style.left = Math.max(8, Math.min(left, maxL - 8)) + "px";
  panel.style.top  = Math.max(8, Math.min(top,  maxT - 8)) + "px";
}

function popOutPanel(panel) {
  const key = panel.dataset.key;
  if (!key || panel.classList.contains("floating")) return;
  // Capture current docked rect so the pop transition starts where it lived.
  const rect = panel.getBoundingClientRect();
  panel.classList.add("floating");
  panel.classList.remove("collapsed"); // floating panels don't collapse
  panel.style.left = (rect.left || 80) + "px";
  panel.style.top  = (rect.top  || 80) + "px";
  // Slight offset so each pop lands visibly on screen even from a hidden panel.
  if (!rect.width) {
    panel.style.left = "120px";
    panel.style.top  = "120px";
  }
  clampPanelPosition(panel);
  poppedState[key] = { left: panel.style.left, top: panel.style.top };
  savePoppedState();
}

function dockPanel(panel) {
  const key = panel.dataset.key;
  panel.classList.remove("floating");
  panel.style.left = "";
  panel.style.top  = "";
  if (key) {
    delete poppedState[key];
    savePoppedState();
  }
}

function startPanelDrag(panel, ev) {
  if (!panel.classList.contains("floating")) return;
  if (ev.target.closest(".panel-pop-btn")) return; // clicks on the pop button
  ev.preventDefault();
  const startX = ev.clientX;
  const startY = ev.clientY;
  const rect = panel.getBoundingClientRect();
  let moved = false;
  function onMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 3) return;
    moved = true;
    panel.style.left = (rect.left + dx) + "px";
    panel.style.top  = (rect.top  + dy) + "px";
    panel.classList.add("dragging");
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    panel.classList.remove("dragging");
    if (moved) {
      clampPanelPosition(panel);
      const key = panel.dataset.key;
      if (key) {
        poppedState[key] = { left: panel.style.left, top: panel.style.top };
        savePoppedState();
      }
    }
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

document.querySelectorAll(".panel").forEach((panel) => {
  const h2 = panel.querySelector("h2");
  if (!h2) return;
  const key = panel.dataset.key;
  if (!key) return;

  // Pop-out / dock toggle button on each header.
  const popBtn = document.createElement("button");
  popBtn.className = "panel-pop-btn";
  popBtn.type = "button";
  popBtn.title = "Pop out / dock";
  popBtn.setAttribute("aria-label", "Pop out / dock");
  popBtn.textContent = "⛶";
  popBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (panel.classList.contains("floating")) dockPanel(panel);
    else                                       popOutPanel(panel);
  });
  h2.appendChild(popBtn);

  // Initial collapsed state for docked panels.
  const stored = panelState[key];
  const collapsed = stored === undefined ? !PANEL_DEFAULT_OPEN.has(key) : stored;
  if (collapsed) panel.classList.add("collapsed");

  // Restore floating state if persisted.
  if (poppedState[key]) {
    panel.classList.add("floating");
    panel.classList.remove("collapsed");
    panel.style.left = poppedState[key].left;
    panel.style.top  = poppedState[key].top;
    // Re-clamp to current viewport in case the window resized between sessions.
    requestAnimationFrame(() => clampPanelPosition(panel));
  }

  h2.addEventListener("click", (ev) => {
    if (panel.classList.contains("floating")) return; // drag-only when floating
    if (ev.target.closest(".panel-pop-btn")) return;
    panel.classList.toggle("collapsed");
    panelState[key] = panel.classList.contains("collapsed");
    localStorage.setItem(PANEL_KEY, JSON.stringify(panelState));
  });

  h2.addEventListener("mousedown", (ev) => startPanelDrag(panel, ev));
});

// Re-clamp every floating panel if the window resizes so panels can't end up
// stranded off-screen (e.g., when a wide-window layout becomes narrow).
window.addEventListener("resize", () => {
  document.querySelectorAll(".panel.floating").forEach(clampPanelPosition);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    activateBoost();
  }
});
window.addEventListener("resize", _invalidateFxRects);

buildUpgrades();
buildAchievements();
buildCodex();
injectEventCountdown();
wireEventWelcome();
// Convert any pent-up XP to levels before the first paint. Players who
// hit the old Lv 200 cap kept earning XP while the level number stayed
// pinned, so on first load with the raised cap we need to drain that
// backlog or the header will keep displaying their old capped level.
checkLevelUp();
catchUpOffline();
checkAchievements();
refreshUI();
wireLeaderboard();
wireAdminGate();
wireAccountModal();
refreshAccountUI();
renderLeaderboard();

// Auth + cloud save bootstrap. Runs alongside the synchronous boot above so
// the UI is interactive immediately; cloud progress streams in once it's
// ready. Failures are non-fatal — the game stays playable in local-only mode.
(async () => {
  await initAuth();
  await migrateLegacyPlayerId();
  await syncCloudSaveOnBoot();
  refreshAccountUI();
  scheduleCloudSaves();
  // First-visit login gate: pop the Account modal so a new player picks
  // sign-in / create / continue-as-guest before they start playing. The
  // modal also covers "you've been signed out" or "anon auth disabled in
  // dashboard" cases. Dismissing once persists the skip flag.
  maybeShowLoginGate();
})();

setInterval(() => {
  if (_catchingUp) return;
  tick(TICK_MS / 1000);
  refreshUI();
}, TICK_MS);

setInterval(() => { if (!resetting) save(); }, 3000);
setInterval(spawnBubble, 800);
setInterval(spawnCreature, 6000);
setInterval(() => leaderboardSync(false), 60000);
setInterval(renderLeaderboard, 90000);
scheduleSlot();
scheduleTreasure();
// If the player closed the tab mid-frenzy, resume the burst on load.
if ((state.chestFrenzyUntil || 0) > Date.now()) runChestFrenzy();
window.addEventListener("beforeunload", () => { if (!resetting) save(true); });

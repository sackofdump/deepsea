"use strict";

// ----- Config ----------------------------------------------------
// Event support: pages can set window.EVENT_CONFIG before loading this script
// to swap themed data tables, save scope, and a countdown. See event.html.
const EVENT = (typeof window !== "undefined" && window.EVENT_CONFIG) || null;
const EVENT_KEY = (EVENT && EVENT.eventKey) || "";
const EVENT_END = (EVENT && EVENT.endAt) || 0;
const EVENT_NAME = (EVENT && EVENT.name) || "";
// Ascension mode: replaces the per-piece gear shop with a rank-locked
// milestone ladder + endgame "stars" earned per max-rank commission.
// When enabled, pendingPearls/prestigeMult/refreshGearUI all swap behavior.
// Shape: { enabled: bool, multPerStar: 1.5, milestones: [{tier, mult, label, icon}] }
const ASCENSION = (EVENT && EVENT.ascension) || null;
function eventEnded() { return EVENT_END > 0 && Date.now() >= EVENT_END; }

const SAVE_KEY = (EVENT && EVENT.saveKey) || "brickedUp_v1";
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
  "Apprentice",          // 1
  "Laborer",             // 2
  "Carpenter",           // 3
  "Mason",               // 4
  "Bricklayer",          // 5
  "Steelworker",         // 6
  "Plumber Lord",        // 7
  "Foreman",             // 8
  "Site Manager",        // 9
  "Master Builder",      // 10
  "Architect",           // 11
  "Skyline Sovereign",   // 12
  "Gargoyle Sculptor",   // 13
  "Brick Saint",         // 14
  "Mortar Mystic",       // 15
  "Concrete Caesar",     // 16
  "Steel-Souled",        // 17
  "Skyline Herald",      // 18
  "Lattice Lord",        // 19
  "Spire-Bringer",       // 20
  "Cathedral Keeper",    // 21
  "Ziggurat Prince",     // 22
  "Pillar Marquis",      // 23
  "Buttress Baron",      // 24
  "Vault Sovereign",     // 25
  "Capstone Conqueror",  // 26
  "Plumb-Line Archon",   // 27
  "Beam Liege",          // 28
  "Rivet Hierarch",      // 29
  "Iron Pharaoh",        // 30
  "Foundationsmith",     // 31
  "Spaceframe Adept",    // 32
  "Tower Caesar",        // 33
  "Truth-Builder",       // 34
  "Loadbearer",          // 35
  "Geodesic Sovereign",  // 36
  "Skyline Czar",        // 37
  "Self-Bracing Saint",  // 38
  "Fixed-Point Mason",   // 39
  "Bracket Mystic",      // 40
  "Edge of Building",    // 41
  "Final Capstone",      // 42
  "Ur-Architect",        // 43
  "Apex of Construction",// 44
  "Ascended Builder",    // 45
  "Beyond Blueprint",    // 46
  "Nameless Wall",       // 47
  "Pre-Form",            // 48
  "First-Brick",         // 49
  "The Architect",       // 50+
];
const PITY_LEGENDARY_DIVES = 50;
// Levels per biome — each biome covers `LEVELS_PER_BIOME` consecutive
// player levels. EVENT.levelsPerBiome lets themed builds tighten the
// pace (Ascension uses 4 so a single Lv 1→60 run cycles through ~15
// biomes worth of loot).
const LEVELS_PER_BIOME = (EVENT && EVENT.levelsPerBiome) || 10;

const BIOMES = (EVENT && EVENT.biomes) || [
  { name: "Ground Floor",          color: "#caa472", accent: "#f0d4a8" },
  { name: "Subbasement",           color: "#7a5a3a", accent: "#c8a880" },
  { name: "Boiler Room",           color: "#5a3030", accent: "#e08060" },
  { name: "Steam Tunnels",         color: "#3a4858", accent: "#a8c0d0" },
  { name: "Underground Garage",    color: "#252525", accent: "#c45050" },
  { name: "Foundry Vault",         color: "#3a0a0a", accent: "#ff6633" },
  { name: "Concrete Catacombs",    color: "#1a0a3a", accent: "#c79bff" },
  { name: "Crystal Quarry",        color: "#0a3a4a", accent: "#a0e8ff" },
  { name: "Lost Cathedral",        color: "#3a2a0a", accent: "#ffcc66" },
  { name: "Bedrock Forge",         color: "#0a0a0a", accent: "#aa55ff" },
  { name: "Tectonic Vault",        color: "#08001a", accent: "#5500aa" },
  { name: "Mirror Lobby",          color: "#101820", accent: "#c8d8e8" },
  { name: "Echo Belfry",           color: "#0a1a2a", accent: "#7fc6e8" },
  { name: "Blueprint Stratum",     color: "#1a0a3a", accent: "#ff9ac4" },
  { name: "Inverted Tower",        color: "#100020", accent: "#a050ff" },
  { name: "Haunted Townhouse",     color: "#0a0a18", accent: "#aacccc" },
  { name: "Astral Penthouse",      color: "#1a0a4a", accent: "#ffd870" },
  { name: "Devourer's Foyer",      color: "#200008", accent: "#ff5566" },
  { name: "First Foundation",      color: "#0a2a3a", accent: "#80ffd0" },
  { name: "Final Storey",          color: "#000000", accent: "#ffffff" },
];

// Loot table — weighted picks per biome. Scales ~4x per biome.
const LOOT = (EVENT && EVENT.loot) || {
  "Ground Floor": [
    { icon: "🧱", name: "Loose Brick",       weight: 0.2, value: 1,    rarity: "common",   chance: 50 },
    { icon: "🔩", name: "Stray Screw",       weight: 0.1, value: 3,    rarity: "common",   chance: 30 },
    { icon: "🪛", name: "Lost Screwdriver",  weight: 0.3, value: 8,    rarity: "uncommon", chance: 15 },
    { icon: "🪤", name: "Snapped Trap",      weight: 1.5, value: 18,   rarity: "uncommon", chance: 4 },
    { icon: "🧰", name: "Vintage Toolbox",   weight: 0.4, value: 60,   rarity: "rare",     chance: 1 },
  ],
  "Subbasement": [
    { icon: "🪵", name: "Two-by-Four",       weight: 1.2, value: 4,     rarity: "common",   chance: 47 },
    { icon: "⚙",  name: "Brass Hinge",       weight: 0.5, value: 12,    rarity: "common",   chance: 25 },
    { icon: "💰", name: "Stashed Cash",      weight: 0.1, value: 40,    rarity: "uncommon", chance: 18 },
    { icon: "📦", name: "Sealed Crate",      weight: 4,   value: 110,   rarity: "rare",     chance: 7 },
    { icon: "📐", name: "Vintage Blueprint", weight: 0.6, value: 300,   rarity: "rare",     chance: 2 },
    { icon: "🗝",  name: "Foreman's Locker",  weight: 8,   value: 1200,  rarity: "epic",     chance: 1 },
  ],
  "Boiler Room": [
    { icon: "🔧", name: "Rusted Pipe",       weight: 6,   value: 25,    rarity: "common",   chance: 48 },
    { icon: "🚿", name: "Boiler Plate",      weight: 9,   value: 80,    rarity: "uncommon", chance: 30 },
    { icon: "⚫", name: "Pressure Gauge",    weight: 0.1, value: 250,   rarity: "rare",     chance: 10 },
    { icon: "🗿", name: "Dormant Furnace",   weight: 4,   value: 750,   rarity: "epic",     chance: 10 },
    { icon: "💀", name: "Steam-Cured Skull", weight: 1,   value: 2400,  rarity: "legend",   chance: 2 },
  ],
  "Steam Tunnels": [
    { icon: "🪨", name: "Compressed Slag",   weight: 2,   value: 130,    rarity: "common",   chance: 45 },
    { icon: "🦴", name: "Strange Cog",       weight: 1,   value: 400,    rarity: "uncommon", chance: 28 },
    { icon: "⛰",  name: "Ironwork Spar",     weight: 3,   value: 1100,   rarity: "rare",     chance: 12 },
    { icon: "🥚", name: "Sealed Boiler Egg", weight: 5,   value: 3200,   rarity: "epic",     chance: 12 },
    { icon: "💎", name: "Living Crystal",    weight: 0.4, value: 10000,  rarity: "legend",   chance: 3 },
  ],
  "Underground Garage": [
    { icon: "🌑", name: "Pressure-Forged Ingot", weight: 4,   value: 500,    rarity: "common",   chance: 45 },
    { icon: "🦷", name: "Diamond Drill Bit",     weight: 0.5, value: 1600,   rarity: "uncommon", chance: 28 },
    { icon: "⬛", name: "Obsidian Tile",         weight: 6,   value: 4500,   rarity: "rare",     chance: 12 },
    { icon: "❤",  name: "Glowing Ember",         weight: 2,   value: 13000,  rarity: "epic",     chance: 12 },
    { icon: "👁",  name: "The Watcher",           weight: 0.1, value: 40000,  rarity: "legend",   chance: 3 },
  ],
  "Foundry Vault": [
    { icon: "🌋", name: "Magma Brick",       weight: 3,   value: 2000,    rarity: "common",   chance: 45 },
    { icon: "🔥", name: "Heat Crystal",      weight: 0.4, value: 6000,    rarity: "uncommon", chance: 28 },
    { icon: "🦎", name: "Salamander Brick",  weight: 1,   value: 18000,   rarity: "rare",     chance: 12 },
    { icon: "⚱",  name: "Magmaglass Tile",   weight: 5,   value: 55000,   rarity: "epic",     chance: 12 },
    { icon: "🪶", name: "Phoenix Tile",      weight: 0.05,value: 170000,  rarity: "legend",   chance: 3 },
  ],
  "Concrete Catacombs": [
    { icon: "🌿", name: "Mossy Concrete",    weight: 0.5, value: 8000,    rarity: "common",   chance: 45 },
    { icon: "🐟", name: "Fossil-Cast Slab",  weight: 0.3, value: 25000,   rarity: "uncommon", chance: 28 },
    { icon: "💧", name: "Phosphor Caulk",    weight: 1,   value: 75000,   rarity: "rare",     chance: 12 },
    { icon: "🟣", name: "Glow Mortar",       weight: 2,   value: 220000,  rarity: "epic",     chance: 12 },
    { icon: "🏮", name: "Eternal Lamp",      weight: 0.5, value: 700000,  rarity: "legend",   chance: 3 },
  ],
  "Crystal Quarry": [
    { icon: "🔷", name: "Geode Brick",       weight: 1,   value: 32000,   rarity: "common",   chance: 45 },
    { icon: "🔺", name: "Refraction Tile",   weight: 0.5, value: 100000,  rarity: "uncommon", chance: 28 },
    { icon: "💜", name: "Crystal Heart Brick",weight: 2,  value: 300000,  rarity: "rare",     chance: 12 },
    { icon: "💎", name: "Perfect Diamond Block",weight: 0.1,value:900000, rarity: "epic",     chance: 12 },
    { icon: "⏳", name: "Time Crystal Block",weight: 0.3, value: 2800000, rarity: "legend",   chance: 3 },
  ],
  "Lost Cathedral": [
    { icon: "🪙", name: "Gilded Coin",       weight: 0.05,value: 130000,    rarity: "common",   chance: 45 },
    { icon: "🗿", name: "Idol Cornerstone",  weight: 1,   value: 400000,    rarity: "uncommon", chance: 28 },
    { icon: "👺", name: "Gargoyle Mask",     weight: 2,   value: 1200000,   rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Sun-Crown Capstone",weight: 3,   value: 3600000,   rarity: "epic",     chance: 12 },
    { icon: "📜", name: "Lost Architect's Plans",weight:5,value:11000000,   rarity: "legend",   chance: 3 },
  ],
  "Bedrock Forge": [
    { icon: "🌌", name: "Void Brick",        weight: 0.1, value: 500000,    rarity: "common",   chance: 45 },
    { icon: "⏱",  name: "Time Mortar",       weight: 0.05,value: 1600000,   rarity: "uncommon", chance: 28 },
    { icon: "🔮", name: "Paradox Stone",     weight: 1,   value: 4800000,   rarity: "rare",     chance: 12 },
    { icon: "⚛",  name: "Antimatter Block",  weight: 5,   value: 14000000,  rarity: "epic",     chance: 12 },
    { icon: "👁‍🗨", name: "The Truth",          weight: 0.01,value: 44000000,  rarity: "legend",   chance: 3 },
  ],
  "Tectonic Vault": [
    { icon: "🕳",  name: "Sinkhole Brick",    weight: 0.1, value: 2000000,         rarity: "common",   chance: 45 },
    { icon: "⚫", name: "Null Ingot",        weight: 0.5, value: 6400000,         rarity: "uncommon", chance: 28 },
    { icon: "🔇", name: "Forgotten Echo",    weight: 1,   value: 19000000,        rarity: "rare",     chance: 12 },
    { icon: "✴",  name: "Black Star Tile",   weight: 4,   value: 56000000,        rarity: "epic",     chance: 12 },
    { icon: "👑", name: "Shadow Crown",      weight: 0.05,value: 175000000,       rarity: "legend",   chance: 3 },
  ],
  "Mirror Lobby": [
    { icon: "🪞", name: "Mirror Tile",       weight: 0.5, value: 8000000,         rarity: "common",   chance: 45 },
    { icon: "💍", name: "Twin Bolt",         weight: 0.3, value: 25000000,        rarity: "uncommon", chance: 28 },
    { icon: "🔷", name: "Refraction Core Brick",weight:2, value: 75000000,        rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Mirror Crown",      weight: 5,   value: 220000000,       rarity: "epic",     chance: 12 },
    { icon: "🌗", name: "The Other Side",    weight: 0.1, value: 700000000,       rarity: "legend",   chance: 3 },
  ],
  "Echo Belfry": [
    { icon: "🔔", name: "Resonance Stone",   weight: 1,   value: 32000000,        rarity: "common",   chance: 45 },
    { icon: "🎶", name: "Echo Crystal Brick",weight: 0.5, value: 100000000,       rarity: "uncommon", chance: 28 },
    { icon: "🪸", name: "Whisper Cornice",   weight: 3,   value: 300000000,       rarity: "rare",     chance: 12 },
    { icon: "🛎",  name: "Soundless Bell",    weight: 6,   value: 900000000,       rarity: "epic",     chance: 12 },
    { icon: "🌀", name: "The Last Echo",     weight: 0.2, value: 2800000000,      rarity: "legend",   chance: 3 },
  ],
  "Blueprint Stratum": [
    { icon: "💤", name: "Sleeping Mortar",   weight: 0.5, value: 130000000,       rarity: "common",   chance: 45 },
    { icon: "🌙", name: "Dream Plan",        weight: 1,   value: 400000000,       rarity: "uncommon", chance: 28 },
    { icon: "🛏",  name: "Subconscious Spire",weight: 4,   value: 1200000000,      rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Lucid Crown",       weight: 5,   value: 3600000000,      rarity: "epic",     chance: 12 },
    { icon: "💭", name: "Reverie",           weight: 0.05,value: 11000000000,     rarity: "legend",   chance: 3 },
  ],
  "Inverted Tower": [
    { icon: "💥", name: "Annihilator Shard", weight: 1,   value: 500000000,       rarity: "common",   chance: 45 },
    { icon: "⚛",  name: "Anti-Brick",        weight: 0.5, value: 1600000000,      rarity: "uncommon", chance: 28 },
    { icon: "🌐", name: "Negation Field",    weight: 3,   value: 4800000000,      rarity: "rare",     chance: 12 },
    { icon: "🔘", name: "Sphere of Unbeing", weight: 6,   value: 14000000000,     rarity: "epic",     chance: 12 },
    { icon: "0",  name: "Zero",              weight: 0.01,value: 44000000000,     rarity: "legend",   chance: 3 },
  ],
  "Haunted Townhouse": [
    { icon: "👻", name: "Ectoplasm Vial",    weight: 0.5, value: 2000000000,      rarity: "common",   chance: 45 },
    { icon: "🐚", name: "Spectral Stone",    weight: 1,   value: 6000000000,      rarity: "uncommon", chance: 28 },
    { icon: "🦴", name: "Phantom Joist",     weight: 3,   value: 18000000000,     rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Wraith Crown",      weight: 5,   value: 56000000000,     rarity: "epic",     chance: 12 },
    { icon: "🪦", name: "The Departed",      weight: 0.1, value: 175000000000,    rarity: "legend",   chance: 3 },
  ],
  "Astral Penthouse": [
    { icon: "🌟", name: "Star Petal",        weight: 0.5, value: 8000000000,      rarity: "common",   chance: 45 },
    { icon: "💖", name: "Constellation Brick",weight: 0.3,value: 25000000000,     rarity: "uncommon", chance: 28 },
    { icon: "🌌", name: "Galaxy Tile",       weight: 2,   value: 75000000000,     rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Nebula Crown",      weight: 5,   value: 220000000000,    rarity: "epic",     chance: 12 },
    { icon: "♾",  name: "The Cosmos",        weight: 0.1, value: 700000000000,    rarity: "legend",   chance: 3 },
  ],
  "Devourer's Foyer": [
    { icon: "🦷", name: "Tooth of Eternity", weight: 1,   value: 32000000000,     rarity: "common",   chance: 45 },
    { icon: "🍖", name: "Hunger Stone",      weight: 0.5, value: 100000000000,    rarity: "uncommon", chance: 28 },
    { icon: "👁",  name: "Devourer's Eye",    weight: 3,   value: 300000000000,    rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Maw Crown",         weight: 6,   value: 900000000000,    rarity: "epic",     chance: 12 },
    { icon: "🐲", name: "The All-Eater",     weight: 0.05,value: 2800000000000,   rarity: "legend",   chance: 3 },
  ],
  "First Foundation": [
    { icon: "💧", name: "Primordial Mortar", weight: 0.1, value: 130000000000,    rarity: "common",   chance: 45 },
    { icon: "🥚", name: "Origin Brick",      weight: 1,   value: 400000000000,    rarity: "uncommon", chance: 28 },
    { icon: "🪸", name: "First Pillar",      weight: 4,   value: 1200000000000,   rarity: "rare",     chance: 12 },
    { icon: "👑", name: "Source Crown",      weight: 5,   value: 3600000000000,   rarity: "epic",     chance: 12 },
    { icon: "🌱", name: "Genesis",           weight: 0.05,value: 11000000000000,  rarity: "legend",   chance: 3 },
  ],
  "Final Storey": [
    { icon: "💧", name: "Final Tear",        weight: 0.1, value: 500000000000,    rarity: "common",   chance: 45 },
    { icon: "🌅", name: "Last Light",        weight: 0.05,value: 1600000000000,   rarity: "uncommon", chance: 28 },
    { icon: "🚪", name: "Closing Door",      weight: 1,   value: 4800000000000,   rarity: "rare",     chance: 12 },
    { icon: "Ω",  name: "Omega Crown",       weight: 5,   value: 14000000000000,  rarity: "epic",     chance: 12 },
    { icon: "⏳", name: "The End",           weight: 0.01,value: 44000000000000,  rarity: "legend",   chance: 3 },
  ],
};

// Upgrades — each level applies (curr * mult) + add and costs cost * costMult^level.
const UPGRADE_DEFS = [
  {
    id: "depth",
    name: "Cable Length",
    desc: "Max safe depth",
    stat: "maxDepth",
    base: 50, add: 40, mult: 1,
    baseCost: 25, costMult: 1.55,
    suffix: " ft",
  },
  {
    id: "speed",
    name: "Winch Motor",
    desc: "Lower & lift speed",
    stat: "speed",
    base: 10, add: 3, mult: 1.06,
    baseCost: 20, costMult: 1.5,
    suffix: " ft/s",
  },
  {
    id: "cargo",
    name: "Brick Bin",
    desc: "Brick-haul capacity",
    stat: "cargoMax",
    // Bigger starting capacity (10 kg → fits a couple of items immediately)
    // and slightly faster early growth so the bar isn't constantly choking
    // a new player. Mult stays at 1.04 so late-game still doesn't explode
    // (L100 ≈ 1.7k kg) — infinite progression, just kinder up front.
    base: 10, add: 3, mult: 1.05,
    // Cheap and flat-ramp on purpose. Cap sized to the worst-case endgame
    // dive: ~1s capped descent + 300 picks/sec boosted at the heaviest
    // legend weights ≈ 3,000 kg. L80 ≈ 3,409 kg gives a small buffer for
    // the Lucky-Current 2× cargo bonus. UI shows "MAX" past the cap.
    baseCost: 8, costMult: 1.4,
    suffix: " kg",
    maxLevel: 80,
  },
  {
    id: "sonar",
    name: "Site Survey",
    desc: "Find loot more often",
    stat: "sonar",
    base: 1, add: 0, mult: 1.18,
    baseCost: 60, costMult: 1.7,
    suffix: "x rate",
    fixed: 2,
  },
  {
    id: "value",
    name: "Cost Estimator",
    desc: "Higher resale value",
    stat: "valueMult",
    base: 1, add: 0, mult: 1.10,
    baseCost: 80, costMult: 1.75,
    suffix: "x value",
    fixed: 2,
  },
];

// Gear — bought with pearls, persists across promotions. Each piece tweaks a
// different system. Level cap keeps the bonuses from trivializing the game,
// and the rising pearl cost makes spending vs. banking a real tradeoff
// (banked pearls give +0.5% loot value forever).
const GEAR_DEFS = (EVENT && EVENT.gearDefs) || [
  // Three pricing tiers — basic / meta / apex — each ~3.3-4.5× per level so
  // L1 is reachable by lvl ~50-100 and L10 is a deep-prestige goal. Pearl
  // banking is sqrt(totalEarned/10000), so this scale keeps gear meaningful
  // without being a wall for early players or a max-by-lvl-200 cakewalk.
  {
    id: "hull",
    name: "Brick-Lined Hardhat",
    icon: "⛑",
    desc: "Hazard duration (Brick to the Head) reduced",
    perLevel: 0.08,        // -8% hazard duration per level (max -80% at L10)
    suffix: "% shorter",
    maxLevel: 10,
    // Basic tier (×3.3/lvl). Affordable around lvl 50-100 first promotions.
    costs: [50, 165, 550, 1800, 5900, 19000, 64000, 210000, 700000, 2300000],
  },
  {
    id: "stabilizer",
    name: "Mason's Trowel",
    icon: "🔨",
    desc: "Positive lottery bonuses last longer",
    perLevel: 0.10,        // +10% bonus duration per level (max +100% at L10)
    suffix: "% longer",
    maxLevel: 10,
    // Tuned for the L500 cap: Hull stays affordable as the early-prestige
    // pickup; everything else is meant to chase across many max-prestige
    // runs. Stabilizer = ~100M total to max (basic-tier on-ramp at this
    // scale).
    costs: [1500, 4950, 16500, 54000, 177000, 570000, 1920000, 6300000, 21000000, 69000000],
  },
  {
    id: "compressor",
    name: "Brick Press",
    icon: "📐",
    desc: "Bonus blueprints stamped every time you promote",
    perLevel: 0.10,        // +10% pending pearls per level (max +100% at L10)
    suffix: "% blueprints",
    maxLevel: 10,
    // Meta tier — ~2B total to max. Compounds pearl income, so worth the
    // mid-game push but not the apex.
    costs: [12000, 44400, 162000, 600000, 2220000, 8400000, 30600000, 114000000, 414000000, 1500000000],
  },
  {
    id: "luck",
    name: "Lucky Brick",
    icon: "🍀",
    desc: "Brick Lottery luck — bricks-to-the-head shrink, blueprints and brickings swell",
    perLevel: 0.10,        // wired through slotLuckWeight (per-tier scaling)
    suffix: "% slot luck",
    maxLevel: 10,
    // Slot tier — ~15B total to max. Slot luck swings payouts hard, so
    // it deserves a real long-term price tag.
    costs: [45000, 180000, 720000, 2880000, 11520000, 46080000, 180000000, 720000000, 2880000000, 11700000000],
  },
  {
    id: "insight",
    name: "Bricklayer's Insight",
    icon: "🧠",
    desc: "Bonus XP from every brick pickup and crate",
    perLevel: 0.25,        // +25% XP per level (max +250% at L10)
    suffix: "% bonus XP",
    maxLevel: 10,
    // Apex tier — ~290B total to max. The long-term gate for "everything
    // maxed at L500." Direct XP multiplier compounds hardest.
    costs: [300000, 1350000, 6150000, 27750000, 124500000, 555000000, 2550000000, 11250000000, 51000000000, 225000000000],
  },
];
function gearDef(id) { return GEAR_DEFS.find(g => g.id === id); }
function gearLevel(id) { return (state.gear && state.gear[id]) || 0; }
// Total gear upgrades purchased — sum of every gear's current level. Gear
// persists across promotions, so this is a lifetime count and a stable
// leaderboard metric.
function totalGearUpgrades() {
  let total = 0;
  for (const def of GEAR_DEFS) total += gearLevel(def.id);
  return total;
}
function gearNextCost(id) {
  const def = gearDef(id);
  const lvl = gearLevel(id);
  if (!def || lvl >= def.maxLevel) return null;
  return def.costs[lvl];
}
function gearMult(id) { return 1 - gearLevel(id) * (gearDef(id)?.perLevel || 0); } // for "less" effects
function gearAdd(id)  { return 1 + gearLevel(id) * (gearDef(id)?.perLevel || 0); } // for "more" effects
function hazardDurationMult() { return Math.max(0.2, gearMult("hull")); }
function bonusDurationMult()  { return gearAdd("stabilizer") * (1 + talentValue('buff_dur')); }
function pearlBonusMult()     { return gearAdd("compressor"); }
function xpBonusMult()        { return gearAdd("insight") * (1 + talentValue('xp_boost')); }
// Slot luck: higher levels shift weight away from sharks and toward majors/jackpots.
function slotLuckWeight(tier, baseWeight) {
  const lvl = gearLevel("luck");
  const t = talentValue('slot_luck'); // 0 / 0.05 / 0.10 / 0.15
  let w = baseWeight;
  if (lvl > 0) {
    if (tier === "shark")        w *= Math.max(0.3, 1 - 0.08 * lvl);  // -8%/lvl, floor 30%
    else if (tier === "jackpot") w *= (1 + 0.25 * lvl);               // +25%/lvl
    else if (tier === "major")   w *= (1 + 0.15 * lvl);               // +15%/lvl
  }
  if (t > 0) {
    if (tier === "shark")                              w *= Math.max(0.3, 1 - t);
    else if (tier === "jackpot" || tier === "major")   w *= (1 + t);
  }
  return w;
}

// ----- Talent Vault (Ascension expansion) -----------------------
// Coins are earned 1 per ascension and spent in comingsoon/expand/.
// Ranks live in localStorage 'ascension_talents_v1' as { ranks: { id: 0-3 } }.
// The value tables here MUST mirror the talent definitions in the vault.
const TALENT_VALUES = {
  slot_luck:  [0, 0.15, 0.30, 0.50],
  cash_boost: [0, 0.20, 0.45, 0.80],
  xp_boost:   [0, 0.20, 0.45, 0.80],
  buff_dur:   [0, 0.20, 0.45, 0.80],
  magnet:     [0, 0.50, 1.00, 2.00],
  cascade:    [0, 0.05, 0.10, 0.20],
  rarity:     [0, 0.15, 0.30, 0.50],
  tribute:    [0, 0.05, 0.12, 0.25],
};
let __talentRanksCache = null;
let __talentCacheTime  = 0;
function talentRanks() {
  const now = Date.now();
  if (__talentRanksCache && (now - __talentCacheTime) < 500) return __talentRanksCache;
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('ascension_talents_v1') : null;
    __talentRanksCache = raw ? (JSON.parse(raw)?.ranks || {}) : {};
  } catch (e) { __talentRanksCache = {}; }
  __talentCacheTime = now;
  return __talentRanksCache;
}
function talentValue(id) {
  const r = talentRanks()[id] | 0;
  const tab = TALENT_VALUES[id];
  return (tab && r > 0) ? tab[Math.min(r, 3)] : 0;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e && e.key === 'ascension_talents_v1') { __talentRanksCache = null; }
  });
}

// ----- State -----------------------------------------------------
const defaultState = () => ({
  cash: 0,
  totalEarned: 0,
  xp: 0,
  level: 1,
  upgrades: { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 },
  // Permanent gear bought with pearls. Survives promotion. Wiped only on full reset.
  gear: { hull: 0, stabilizer: 0, compressor: 0, luck: 0, tuning: 0 },
  gearIntroSeen: false,
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
  // Chest Frenzy (Spring Bloom alt of mini tier): chests spawn rapidly
  // until this timestamp. Persisted so a page reload mid-frenzy keeps the
  // burst going to its natural end.
  chestFrenzyUntil: 0,
  // Number of chests still owed a "guaranteed 3 legendary picks" payload.
  // Incremented when a chest is collected during a frenzy; decremented
  // when one is opened. Lets the bonus follow the chest into inventory
  // even though state.inventory itself only stores tier strings.
  frenzyChestsPending: 0,
  encounterValueUntil: 0,
  // Magnitude of the active value bonus (default 2× for Mermaid's Kiss; the
  // event's Butterfly Kiss bumps this to 3×). Stored alongside the timestamp
  // so different bonus configs can carry different multipliers.
  encounterValueAmt: 2,
  // Slot-bonus XP multiplier. Mermaid's Kiss doesn't grant one (default 1×);
  // Butterfly Kiss does (5×). Same expiration semantics as the value bonus.
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
  // Total simulated game time (ms). Accumulated in tick() so the
  // leaderboard's Time metric reflects actual play, not wall-clock.
  timePlayedMs: 0,
});

let state = load() || defaultState();
// Exposed on window so themed builds (e.g., Ascension's run timer) can
// read/write game state from inline scripts. Only intended for narrow
// integration use, not as a public API.
if (typeof window !== "undefined") {
  window.__GAME_STATE__ = state;
  // Bind helpers lazily — they're declared further down in this file.
  setTimeout(() => {
    window.__GAME_SAVE__    = (typeof save === "function") ? save : null;
    window.__GAME_LB_SYNC__ = (typeof leaderboardSync === "function") ? leaderboardSync : null;
    // Admin/debug: trigger a real slot spin that lands on a chosen
    // tier. Player sees the reels animate + settle on the forced
    // outcome, then the bonus applies via the normal path (cascade
    // logic, slotHits counter, log, SFX, the works).
    window.__ADMIN_FIRE_BONUS__ = function (tier) {
      if (!SLOT_BONUSES[tier]) return;
      if (typeof spinSlot === "function") spinSlot(tier);
    };
  }, 0);
}
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
if (!state.gear) state.gear = {};
for (const _g of GEAR_DEFS) { if (state.gear[_g.id] === undefined) state.gear[_g.id] = 0; }
// One-time migrations: previous gear pieces that were swapped out get
// their pearls refunded so the player isn't punished for owning gear
// whose effect no longer exists.
if (state.gear.coil) {
  const COIL_OLD_COSTS = [5, 12, 25, 60, 150];
  let refund = 0;
  for (let i = 0; i < state.gear.coil; i++) refund += COIL_OLD_COSTS[i] || 0;
  state.pearls = (state.pearls || 0) + refund;
  delete state.gear.coil;
}
if (state.gear.tuning) {
  const TUNING_OLD_COSTS = [5, 12, 25, 60, 150];
  let refund = 0;
  for (let i = 0; i < state.gear.tuning; i++) refund += TUNING_OLD_COSTS[i] || 0;
  state.pearls = (state.pearls || 0) + refund;
  delete state.gear.tuning;
}
if (state.gearIntroSeen === undefined) state.gearIntroSeen = false;
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
  // Clamp at maxLevel (currently only used by Cargo Hold) so players who
  // upgraded past the cap before it was added don't keep the inflated stat.
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
  // Ascension: biome is locked to your commission count, not your level.
  // A whole Lv 1→100 run happens in one biome; commissioning advances
  // to the next realm. Past BIOMES.length commissions, you stay in the
  // last biome.
  if (ASCENSION && ASCENSION.enabled) {
    return Math.min(state.prestigeCount || 0, BIOMES.length - 1);
  }
  return Math.min(Math.floor(level / LEVELS_PER_BIOME), BIOMES.length - 1);
}

// ----- Encounters -----------------------------------------------
function valueEncounterMult()      { return Date.now() < (state.encounterValueUntil     || 0) ? (state.encounterValueAmt || 2) : 1; }
function xpEncounterMult()         { return Date.now() < (state.encounterXpUntil        || 0) ? (state.encounterXpAmt    || 1) : 1; }
function cargoEncounterMult()      { return Date.now() < (state.encounterCargoUntil     || 0) ? (state.encounterCargoAmt || 2) : 1; }
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
  // Linear: each rank costs `levelsPerRank` levels (default 10). Themed
  // builds can shorten the climb by setting EVENT.levelsPerRank, and
  // can shift the whole ladder up with EVENT.tierLevelOffset (Ascension
  // uses offset 10 → first ascend at Lv 20, then 30, 40, ...).
  const perRank = (EVENT && EVENT.levelsPerRank) || 10;
  const offset  = (EVENT && EVENT.tierLevelOffset) || 0;
  return (tier - 1) * perRank + offset;
}
function nextTierLevel() {
  let lvl = tierLevelRequired(currentTier() + 1);
  // Ascension hard cap — once the rank-gate exceeds maxLevel, every
  // subsequent ascension still needs the same fixed top level. Lets the
  // ladder run "20, 30, ..., 200, 200, 200..." for endless Star farming
  // past max rank.
  if (ASCENSION && ASCENSION.enabled && ASCENSION.maxLevel) {
    lvl = Math.min(lvl, ASCENSION.maxLevel);
  }
  return lvl;
}
function canUpgradeSub() { return state.level >= nextTierLevel(); }

function prestigeMult() {
  if (ASCENSION && ASCENSION.enabled) return ascensionTotalMult();
  return 1 + (state.pearls || 0) * 0.005;
}

// Per-star compounding multiplier — kicks in after every commission past
// max rank. Default ×1.5/star (≈ 57× at 10 stars, ≈ 3.3M× at 25).
function ascensionStarMult() {
  if (!ASCENSION || !ASCENSION.enabled) return 1;
  const stars = state.pearls || 0;
  const per   = ASCENSION.multPerStar || 1.5;
  return Math.pow(per, stars);
}

// Static milestone ladder — multipliers unlock the moment your rank
// reaches a threshold. They stack multiplicatively with each other and
// with star compound, so hitting Lv 100 (rank 11) instantly applies
// every milestone at or below it.
function ascensionMilestoneMult() {
  if (!ASCENSION || !ASCENSION.enabled) return 1;
  const tier = currentTier();
  let m = 1;
  for (const ms of (ASCENSION.milestones || [])) {
    if (tier >= ms.tier) m *= (ms.mult || 1);
  }
  return m;
}

function ascensionTotalMult() {
  return ascensionMilestoneMult() * ascensionStarMult();
}

function pendingPearls() {
  // Ascension mode: every ascend earns +1 Star. The rank-gate level
  // (escalating Lv 20/30/40/...) is the only friction.
  if (ASCENSION && ASCENSION.enabled) {
    return 1;
  }
  // Higher divisor = fewer pearls per promotion. EVENT.pearlDivisor lets
  // themed builds tune economy harshness without forking the formula.
  const divisor = (EVENT && EVENT.pearlDivisor) || 10000;
  const base = Math.sqrt(Math.max(0, state.totalEarned) / divisor);
  return Math.floor(base * pearlBonusMult());
}

function rarityUpgradeChance() {
  return (state.prestigeCount || 0) * TIER_RARITY_UPGRADE + talentValue('rarity');
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
  let dialog;
  if (ASCENSION && ASCENSION.enabled) {
    const star = (EVENT && EVENT.pearlEmoji) || "✨";
    const newMult = Math.pow(ASCENSION.multPerStar || 1.5, newPearls) * ascensionMilestoneMult();
    const noun = newPearls === 1 ? "Star" : "Stars";
    const unlockLevel = ASCENSION.starUnlockLevel || tierLevelRequired(SUB_RANKS.length);
    dialog = earned > 0
      ? `Ascend to ${nextName}?\n\n+ ${star} ${earned} (now ${newPearls} ${noun} · ×${fmt(newMult)} multiplier)\nForever: +3% rarity upgrade chance per roll (now ${newRarityPct}%)\n\nResets: level, cash, upgrades, run history.\nKeeps: rank, ${noun.toLowerCase()}, milestones, achievements, catalog.`
      : `Ascend to ${nextName}?\n\nRank-up only — no ${star} earned (need Lv ${unlockLevel}+, you're at Lv ${state.level}).\nForever: +3% rarity upgrade chance per roll (now ${newRarityPct}%)\n\nResets: level, cash, upgrades, run history.\nKeeps: rank, milestones, achievements, catalog.`;
  } else {
    dialog = `Promote to ${nextName}?\n\nBank ${earned} blueprints (+${earnedPct}% brick value)\nTotal: ${newPearls} blueprints (+${totalPct}% brick value)\nForever: +3% rarity upgrade chance per roll (now ${newRarityPct}%)\n\nResets: level, cash, upgrades, drop history.\nKeeps: rank, blueprints, achievements, catalog.`;
  }
  if (!confirm(dialog)) return;
  state.pearls = newPearls;
  state.prestigeCount = (state.prestigeCount || 0) + 1;
  // Talent Vault: ONLY ascensions from Lv 100 bank coins. Early
  // rank-gate ascensions (Lv 20, 30, 40, ..., 90) are progression
  // milestones but not "full runs" — they don't pay out. +2 🪙 per
  // 100-level run; separate currency from the ✨ multiplier.
  if (ASCENSION && ASCENSION.enabled && state.level >= 100 && typeof localStorage !== 'undefined') {
    try {
      const cur = Number(JSON.parse(localStorage.getItem('ascension_coins_v1') || '0'));
      const next = (Number.isFinite(cur) ? cur : 0) + 2;
      localStorage.setItem('ascension_coins_v1', JSON.stringify(next));
    } catch (e) {}
  }
  // Reset progression
  state.cash = 0;
  state.totalEarned = 0;
  state.xp = 0;
  state.level = 1;
  state.upgrades = { depth: 0, speed: 0, cargo: 0, sonar: 0, value: 0 };
  state.sub = { depth: 0, targetDepth: 0, cargoKg: 0, cargoItems: [], cargoGrouped: {}, cargoTotalValue: 0, mode: "idle", lingerStart: 0 };
  state.lastHaul = [];
  // Wipe pinned dive-loot rows AND the chest-haul flyouts so the post-promote
  // sub starts visually empty — otherwise the player saw their pre-promote
  // pile of loot still on screen and felt like they were leveling off it.
  clearDiveLoot();
  const chestHaulRoot = $("chestHaul");
  if (chestHaulRoot) chestHaulRoot.innerHTML = "";
  // Floating uncollected chests (.treasure-chest), in-flight reveal popups
  // (.item-reveal), and any pinned creature drift all belong to the
  // previous run — sweep everything so the new biome starts clean.
  document.querySelectorAll("#ocean .treasure-chest").forEach(el => el.remove());
  document.querySelectorAll("#ocean .item-reveal").forEach(el => el.remove());
  // Ascension also wipes the chest tray inventory so each ascension is
  // a true clean slate — players can't bank chests across runs.
  if (ASCENSION && ASCENSION.enabled) {
    state.inventory = [];
    state.frenzyChestsPending = 0;
  }
  // Belt + suspenders — the state.sub replacement above already resets
  // cargo, but make absolutely sure the level/xp/cash floor is honored
  // after every other reset has run so any straggler increment lands on
  // a clean slate. Also re-run checkLevelUp so the level reflects xp=0.
  state.xp = 0;
  state.level = 1;
  state.cash = 0;
  // Bust the cached stats signature so the next dive uses the freshly
  // reset upgrades (defensive — shouldn't be needed but free safety).
  _cargoSig = null;
  _haulRef  = undefined;
  checkLevelUp();
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
  if (window.brickedUpSfx) window.brickedUpSfx.promote();
  refreshUI();
  save();
  leaderboardSync(true);
  renderLeaderboard();
}

// ----- Gear (permanent pearl-bought upgrades) ------------------
// Bricked Up uses a 📐 blueprint as the prestige currency icon. Themed
// events override this by setting EVENT_CONFIG.pearlEmoji.
const PEARL_EMOJI = (EVENT && EVENT.pearlEmoji) || "📐";

function gearEffectText(def, level) {
  // Human-readable description of "if you bought one more level".
  const cur = Math.round(level * def.perLevel * 100);
  const nxt = Math.round((level + 1) * def.perLevel * 100);
  const label = def.suffix.startsWith("%") ? def.suffix.slice(1).trim() : def.suffix;
  if (level >= def.maxLevel) {
    return `Maxed · ${cur}% ${label}`;
  }
  return `${cur}% ${label} <span class="gear-arrow">→</span> ${nxt}% ${label}`;
}

function buyGear(id) {
  const def = gearDef(id);
  if (!def) return;
  const lvl = gearLevel(id);
  if (lvl >= def.maxLevel) return;
  const cost = gearNextCost(id);
  if ((state.pearls || 0) < cost) return;
  state.pearls -= cost;
  state.gear[id] = lvl + 1;
  log(`🛠 Installed ${def.name} → Lv ${state.gear[id]}.`, "good");
  if (window.brickedUpSfx) window.brickedUpSfx.buy();
  refreshGearUI();
  refreshSubGear();
  // Pearls drive prestige bonus too — bust the cached prestige signature so
  // the sidebar's "+X% loot worth" updates immediately.
  _prestigeSig = "";
  refreshUI();
  checkAchievements();
  save();
}

function refreshGearUI() {
  const list = $("gearList");
  if (!list) return;
  const pearlEl = $("gearPearls");
  if (pearlEl) pearlEl.textContent = `×${fmt(Math.pow(1.5, state.pearls || 0))}`;
  const ownedEl = $("gearOwnedPearls");
  if (ownedEl) ownedEl.textContent = `×${fmt(Math.pow(1.5, state.pearls || 0))}`;

  // Ascension mode: replace gear cards with milestone ladder + star meter.
  // Milestones auto-unlock by rank; stars accumulate from max-rank commissions.
  // Pure read-only UI — there's nothing to "buy."
  if (ASCENSION && ASCENSION.enabled) {
    const tier      = currentTier();
    const stars     = state.pearls || 0;
    const milestones = ASCENSION.milestones || [];
    const commissionsDone = state.prestigeCount || 0;
    const milestoneRows = milestones.map(ms => {
      const unlocked = tier >= ms.tier;
      // ms.tier is the rank you need to BE at; getting there costs
      // (ms.tier - 1) commissions because you start at Rank 1.
      const commissionsNeeded = Math.max(0, ms.tier - 1);
      const remaining = Math.max(0, commissionsNeeded - commissionsDone);
      const gateText = unlocked
        ? `Rank ${ms.tier} · ${rankName(ms.tier)}`
        : `Rank ${ms.tier} · ${rankName(ms.tier)} — ${remaining} more commission${remaining === 1 ? "" : "s"}`;
      return `
        <div class="ascension-milestone${unlocked ? " unlocked" : ""}">
          <div class="ascension-icon">${ms.icon}</div>
          <div class="ascension-milestone-meta">
            <div class="ascension-milestone-name">${ms.label}</div>
            <div class="ascension-milestone-req">${gateText}</div>
            <div class="ascension-milestone-desc">${ms.desc || `Permanent ×${ms.mult} on all cash &amp; XP earned`}</div>
          </div>
          <div class="ascension-milestone-mult">×${ms.mult}</div>
        </div>`;
    }).join("");
    const totalMult = ascensionTotalMult();
    const atMax     = tier >= SUB_RANKS.length;
    const starEmoji = (EVENT && EVENT.pearlEmoji) || "✨";
    list.innerHTML = `
      <div class="ascension-summary">
        <div class="ascension-stars-row">
          <span class="ascension-star-count">${starEmoji} ${fmt(stars)}</span>
          <span class="ascension-star-label">Ascension ${stars === 1 ? "Star" : "Stars"}</span>
        </div>
        <div class="ascension-total">
          <span class="ascension-total-mult">×${fmt(totalMult)}</span>
          <span class="ascension-total-label">total cash &amp; XP multiplier</span>
        </div>
      </div>
      <p class="ascension-explainer muted">
        Each commission raises your <strong>Rank</strong> by 1. Reach <strong>Lv ${ASCENSION.starUnlockLevel || tierLevelRequired(SUB_RANKS.length)}+</strong> before commissioning to also bank an ✨ Star.
        Vows auto-unlock at specific ranks and stack multiplicatively — all five = <strong>×7,500</strong> on top of Stars.
      </p>
      <div class="ascension-milestones">${milestoneRows}</div>
      <p class="ascension-footer muted">
        Each ${starEmoji} compounds at <strong>×${ASCENSION.multPerStar}</strong>, no cap.
        Ten Stars ≈ ×57. Twenty-five ≈ ×25,000. On top of Vows.
      </p>
    `;
    return;
  }

  list.innerHTML = "";
  for (const def of GEAR_DEFS) {
    const lvl = gearLevel(def.id);
    const maxed = lvl >= def.maxLevel;
    const cost = maxed ? null : gearNextCost(def.id);
    const canAfford = !maxed && (state.pearls || 0) >= cost;
    const row = document.createElement("div");
    row.className = "gear-row" + (maxed ? " maxed" : "");
    const pips = Array.from({ length: def.maxLevel })
      .map((_, i) => `<div class="gear-pip${i < lvl ? " on" : ""}"></div>`)
      .join("");
    row.innerHTML = `
      <div class="gear-row-icon">${def.icon}</div>
      <div class="gear-row-meta">
        <div class="gear-row-name">${def.name} <span class="muted">· Lv ${lvl}/${def.maxLevel}</span></div>
        <div class="gear-row-desc">${def.desc}</div>
        <div class="gear-row-effect">${gearEffectText(def, lvl)}</div>
      </div>
      <div class="gear-row-buy">
        <div class="gear-row-pips">${pips}</div>
        <button class="gear-buy" data-id="${def.id}" ${maxed || !canAfford ? "disabled" : ""}>
          ${maxed ? "MAX" : `Buy · ${fmt(cost)} ${PEARL_EMOJI}`}
        </button>
      </div>
    `;
    list.appendChild(row);
  }
}

function refreshSubGear() {
  const root = $("subGear");
  if (!root) return;
  const hull = gearLevel("hull");
  const stab = gearLevel("stabilizer");
  const comp = gearLevel("compressor");
  const luck = gearLevel("luck");
  const insight = gearLevel("insight");
  const parts = [];
  if (hull > 0) {
    // 2 rivets at L1, +1 per level (max 8).
    const n = Math.min(2 + (hull - 1), 8);
    parts.push(`<div class="gear-hull">${'<span></span>'.repeat(n)}</div>`);
  }
  if (stab > 0) {
    parts.push(`<div class="gear-stab" style="opacity:${Math.min(0.95, 0.3 + stab * 0.07)}"></div>`);
  }
  if (comp > 0) {
    const n = Math.min(comp + 1, 8);
    parts.push(`<div class="gear-comp">${'<span></span>'.repeat(n)}</div>`);
  }
  if (luck > 0) {
    parts.push(`<div class="gear-luck" style="opacity:${Math.min(1, 0.45 + luck * 0.06)}">🍀</div>`);
  }
  if (insight > 0) {
    parts.push(`<div class="gear-insight" style="opacity:${Math.min(1, 0.5 + insight * 0.05)}">✦</div>`);
  }
  root.innerHTML = parts.join("");
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
  // Drops
  { id: "first_dive",    name: "First Drop",       desc: "Complete your first drop.",   icon: "🧱", reward: 50,        check: (s) => s.totalDives >= 1 },
  { id: "ten_dives",     name: "Regular",          desc: "Complete 10 drops.",          icon: "🪜", reward: 250,       check: (s) => s.totalDives >= 10 },
  { id: "hundred_dives", name: "Veteran Bricklayer",desc:"Complete 100 drops.",        icon: "👷", reward: 10000,     check: (s) => s.totalDives >= 100 },
  { id: "dives_500",     name: "Career Bricklayer",desc: "Complete 500 drops.",         icon: "🌀", reward: 100000,    check: (s) => s.totalDives >= 500 },
  { id: "dives_1000",    name: "Master Bricker",   desc: "Complete 1,000 drops.",       icon: "🏗", reward: 1000000,   check: (s) => s.totalDives >= 1000 },
  { id: "dives_5000",    name: "Lifer",            desc: "Complete 5,000 drops.",       icon: "♒", reward: 50000000,  check: (s) => s.totalDives >= 5000 },

  // Items
  { id: "items_100",     name: "Brick Collector",  desc: "Haul 100 bricks.",            icon: "🧱", reward: 1000,      check: (s) => s.totalItems >= 100 },
  { id: "items_1000",    name: "Master Brickwork", desc: "Haul 1,000 bricks.",          icon: "🏆", reward: 25000,     check: (s) => s.totalItems >= 1000 },
  { id: "items_5k",      name: "Brick Stockpile",  desc: "Haul 5,000 bricks.",          icon: "📚", reward: 250000,    check: (s) => s.totalItems >= 5000 },
  { id: "items_25k",     name: "Brickyard",        desc: "Haul 25,000 bricks.",         icon: "🏬", reward: 5000000,   check: (s) => s.totalItems >= 25000 },
  { id: "items_100k",    name: "Brick Trove",      desc: "Haul 100,000 bricks.",        icon: "🗃", reward: 100000000, check: (s) => s.totalItems >= 100000 },

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
  { id: "level_50",      name: "Legendary Architect",desc: "Reach Level 50.",           icon: "👑", reward: 250000,    check: (s) => s.level >= 50 },
  { id: "level_75",      name: "Decorated",        desc: "Reach Level 75.",             icon: "🎖", reward: 1000000,   check: (s) => s.level >= 75 },
  { id: "level_100",     name: "Centurion",        desc: "Reach Level 100.",            icon: "💯", reward: 25000000,  check: (s) => s.level >= 100 },
  { id: "level_150",     name: "Beyond",           desc: "Reach Level 150.",            icon: "🚀", reward: 250000000, check: (s) => s.level >= 150 },
  { id: "level_200",     name: "Limit Reached",    desc: "Reach Level 200.",            icon: "♾",  reward: 1000000000,check: (s) => s.level >= 200 },

  // Biomes
  { id: "biome_twilight",  name: "Subbasement Dweller", desc: "Reach the Subbasement.",       icon: "🪜", reward: 1000,       check: (s) => biomeIndex(s.level) >= 1 },
  { id: "biome_midnight",  name: "Boilermaker",         desc: "Reach the Boiler Room.",       icon: "🔧", reward: 5000,       check: (s) => biomeIndex(s.level) >= 2 },
  { id: "biome_abyssal",   name: "Steam Tunneler",      desc: "Reach the Steam Tunnels.",     icon: "🦴", reward: 25000,      check: (s) => biomeIndex(s.level) >= 3 },
  { id: "biome_hadal",     name: "Garage Goblin",       desc: "Reach the Underground Garage.",icon: "🌑", reward: 100000,     check: (s) => biomeIndex(s.level) >= 4 },
  { id: "biome_5",         name: "Floor Explorer",      desc: "Reach 5 different floors.",    icon: "📐", reward: 250000,     check: (s) => biomeIndex(s.level) >= 4 },
  { id: "biome_lava",      name: "Foundry Walker",      desc: "Reach the Foundry Vault.",     icon: "🌋", reward: 500000,     check: (s) => biomeIndex(s.level) >= 5 },
  { id: "biome_biolum",    name: "Catacomb Crawler",    desc: "Reach the Concrete Catacombs.",icon: "🌿", reward: 2500000,    check: (s) => biomeIndex(s.level) >= 6 },
  { id: "biome_crystal",   name: "Quarry Cartographer", desc: "Reach the Crystal Quarry.",    icon: "🔷", reward: 12500000,   check: (s) => biomeIndex(s.level) >= 7 },
  { id: "biome_temple",    name: "Cathedral Templar",   desc: "Reach the Lost Cathedral.",    icon: "🗿", reward: 50000000,   check: (s) => biomeIndex(s.level) >= 8 },
  { id: "singularity",     name: "Forge Walker",        desc: "Reach the Bedrock Forge.",     icon: "🕳", reward: 250000000,            check: (s) => biomeIndex(s.level) >= 9 },
  { id: "biome_void",      name: "Vault Breaker",       desc: "Reach the Tectonic Vault.",    icon: "🕳", reward: 1000000000,           check: (s) => biomeIndex(s.level) >= 10 },
  { id: "biome_mirror",    name: "Through the Glass",   desc: "Reach the Mirror Lobby.",      icon: "🪞", reward: 5000000000,           check: (s) => biomeIndex(s.level) >= 11 },
  { id: "biome_echo",      name: "Belfry Bricklayer",   desc: "Reach the Echo Belfry.",       icon: "🎶", reward: 25000000000,          check: (s) => biomeIndex(s.level) >= 12 },
  { id: "biome_dream",     name: "Blueprint Drafter",   desc: "Reach the Blueprint Stratum.", icon: "💭", reward: 100000000000,         check: (s) => biomeIndex(s.level) >= 13 },
  { id: "biome_antimatter",name: "Unbuilt",             desc: "Reach the Inverted Tower.",    icon: "⚛", reward: 500000000000,         check: (s) => biomeIndex(s.level) >= 14 },
  { id: "biome_ghost",     name: "House Haunter",       desc: "Reach the Haunted Townhouse.", icon: "👻", reward: 2500000000000,        check: (s) => biomeIndex(s.level) >= 15 },
  { id: "biome_astral",    name: "Penthouse Climber",   desc: "Reach the Astral Penthouse.",  icon: "🌟", reward: 10000000000000,       check: (s) => biomeIndex(s.level) >= 16 },
  { id: "biome_cosmic",    name: "Devoured",            desc: "Reach the Devourer's Foyer.",  icon: "🐲", reward: 50000000000000,       check: (s) => biomeIndex(s.level) >= 17 },
  { id: "biome_source",    name: "Origin Brick",        desc: "Reach the First Foundation.",  icon: "🌱", reward: 250000000000000,      check: (s) => biomeIndex(s.level) >= 18 },
  { id: "biome_end",       name: "The Final Storey",    desc: "Reach the Final Storey.",      icon: "⏳", reward: 1000000000000000,     check: (s) => biomeIndex(s.level) >= 19 },

  // Blueprints (prestige currency)
  { id: "pearls_50",     name: "Blueprint Drafter",desc: "Bank 50 blueprints.",         icon: "📐", reward: 50000,     check: (s) => (s.pearls || 0) >= 50 },
  { id: "pearls_250",    name: "Blueprint Hoarder",desc: "Bank 250 blueprints.",        icon: "📋", reward: 1000000,   check: (s) => (s.pearls || 0) >= 250 },
  { id: "pearls_1k",     name: "Blueprint Empire", desc: "Bank 1,000 blueprints.",      icon: "🗂", reward: 50000000,  check: (s) => (s.pearls || 0) >= 1000 },

  // Lottery wins
  { id: "bonus_first",     name: "First Pull",       desc: "Win the Brick Lottery for the first time.", icon: "🎟", reward: 250,    check: (s) => (s.bonusCollected || 0) >= 1 },
  { id: "bonus_25",        name: "Lucky 25",         desc: "Win the Brick Lottery 25 times.",      icon: "🎲", reward: 5000,      check: (s) => (s.bonusCollected || 0) >= 25 },
  { id: "slot_50",         name: "Permit Pro",       desc: "Win the Brick Lottery 50 times.",      icon: "♠",  reward: 50000,     check: (s) => (s.bonusCollected || 0) >= 50 },
  { id: "slot_500",        name: "Permit Junkie",    desc: "Win the Brick Lottery 500 times.",     icon: "♻",  reward: 5000000,   check: (s) => (s.bonusCollected || 0) >= 500 },
  { id: "slot_minor_first",name: "Foreman's Favor",  desc: "Hit triple foremen on the lottery.",   icon: "👷", reward: 25000,     check: (s) => (s.slotHits?.minor || 0) >= 1 },
  { id: "slot_major_first",name: "Blueprinted",      desc: "Hit triple blueprints on the lottery.",icon: "📐", reward: 100000,    check: (s) => (s.slotHits?.major || 0) >= 1 },
  { id: "slot_major_10",   name: "Master Drafter",   desc: "Hit triple blueprints 10 times.",      icon: "📋", reward: 5000000,   check: (s) => (s.slotHits?.major || 0) >= 10 },
  { id: "slot_jackpot_1",  name: "Bricked",          desc: "Hit GET BRICKED.",                     icon: "🏗", reward: 250000,    check: (s) => (s.slotHits?.jackpot || 0) >= 1 },
  { id: "slot_jackpot_5",  name: "Hard Bricked",     desc: "Hit GET BRICKED 5 times.",             icon: "🎉", reward: 5000000,   check: (s) => (s.slotHits?.jackpot || 0) >= 5 },
  { id: "slot_jackpot_25", name: "Fully Bricked",    desc: "Hit GET BRICKED 25 times.",            icon: "🍀", reward: 100000000, check: (s) => (s.slotHits?.jackpot || 0) >= 25 },

  // Boosts
  { id: "boost_10",      name: "Boost Tap",        desc: "Use boost 10 times.",         icon: "⚡", reward: 500,       check: (s) => s.boostsUsed >= 10 },
  { id: "boost_100",     name: "Boost Junkie",     desc: "Use boost 100 times.",        icon: "🚀", reward: 10000,     check: (s) => s.boostsUsed >= 100 },
  { id: "boost_500",     name: "Boost Addict",     desc: "Use boost 500 times.",        icon: "💨", reward: 250000,    check: (s) => s.boostsUsed >= 500 },
  { id: "boost_1k",      name: "Light Speed",      desc: "Use boost 1,000 times.",      icon: "🛸", reward: 5000000,   check: (s) => s.boostsUsed >= 1000 },

  // Crates
  { id: "chest_first",   name: "Hoarder",          desc: "Collect your first crate.",   icon: "📦", reward: 500,       check: (s) => (s.chestsCollected || 0) >= 1 },
  { id: "chest_25",      name: "Pallet Pile",      desc: "Collect 25 crates.",          icon: "🧱", reward: 25000,     check: (s) => (s.chestsCollected || 0) >= 25 },
  { id: "chest_100",     name: "Brick Vault",      desc: "Collect 100 crates.",         icon: "🏰", reward: 250000,    check: (s) => (s.chestsCollected || 0) >= 100 },
  { id: "chest_500",     name: "Crate Mountain",   desc: "Collect 500 crates.",         icon: "⛰",  reward: 5000000,   check: (s) => (s.chestsCollected || 0) >= 500 },

  // Upgrades
  { id: "upgrade_each_10", name: "Well Outfitted", desc: "Every upgrade at Lv 10+.",     icon: "🔧", reward: 100000,    check: (s) => Object.values(s.upgrades || {}).every(v => v >= 10) },
  { id: "upgrade_each_25", name: "Maxed Out",      desc: "Every upgrade at Lv 25+.",     icon: "⚙",  reward: 5000000,   check: (s) => Object.values(s.upgrades || {}).every(v => v >= 25) },

  // Codex
  { id: "codex_15",      name: "Materials Catalog", desc: "Discover 15 unique materials.",icon: "📔", reward: 5000,      check: (s) => Object.keys(s.lifetimeItems || {}).length >= 15 },
  { id: "codex_30",      name: "Materials Scholar", desc: "Discover 30 unique materials.",icon: "📕", reward: 50000,     check: (s) => Object.keys(s.lifetimeItems || {}).length >= 30 },
  { id: "codex_all",     name: "Complete Catalog",  desc: "Discover every unique material.",icon:"📖",reward:1000000000, check: (s) => Object.keys(s.lifetimeItems || {}).length >= allLootItems().length },

  // Gear (beta-only — blueprint-bought permanent upgrades)
  { id: "gear_first",        name: "Outfitted",       desc: "Install your first gear upgrade.",       icon: "🛠", reward: 5000,        check: (s) => totalGearUpgrades() >= 1 },
  { id: "gear_10",           name: "Tinkerer",        desc: "Buy 10 total gear upgrades.",            icon: "🔧", reward: 100000,      check: (s) => totalGearUpgrades() >= 10 },
  { id: "gear_25",           name: "Engineer",        desc: "Buy 25 total gear upgrades.",            icon: "⚙",  reward: 1000000,     check: (s) => totalGearUpgrades() >= 25 },
  { id: "gear_50",           name: "Fully Bricked",   desc: "Max every gear slot (50 upgrades).",     icon: "🦾", reward: 50000000,    check: (s) => totalGearUpgrades() >= 50 },
  { id: "gear_all_slots",    name: "Jack of All",     desc: "Install at least one of every gear.",    icon: "🧰", reward: 250000,      check: (s) => GEAR_DEFS.every(d => ((s.gear || {})[d.id] || 0) >= 1) },
  { id: "gear_hull_max",     name: "Ironclad",        desc: "Max Brick-Lined Hardhat.",               icon: "⛑", reward: 5000000,     check: (s) => ((s.gear || {}).hull       || 0) >= 10 },
  { id: "gear_stab_max",     name: "Trowel Mastery",  desc: "Max Mason's Trowel.",                    icon: "🔨", reward: 5000000,     check: (s) => ((s.gear || {}).stabilizer || 0) >= 10 },
  { id: "gear_compressor_max", name: "Brick Pressor", desc: "Max Brick Press.",                       icon: "📐", reward: 5000000,     check: (s) => ((s.gear || {}).compressor || 0) >= 10 },
  { id: "gear_luck_max",     name: "Lucky Streak",    desc: "Max Lucky Brick.",                       icon: "🍀", reward: 10000000,    check: (s) => ((s.gear || {}).luck       || 0) >= 10 },
  { id: "gear_insight_max",  name: "All-Seeing",      desc: "Max Bricklayer's Insight.",              icon: "🧠", reward: 25000000,    check: (s) => ((s.gear || {}).insight    || 0) >= 10 },

  // Prestige
  { id: "prestige_1",    name: "Reborn",                  desc: "Promote for the first time.",                icon: "🌀", reward: 5000,        check: (s) => (s.prestigeCount || 0) >= 1 },
  { id: "prestige_3",    name: "Loop Theory",             desc: "Promote 3 times. Pattern detected.",         icon: "🔄", reward: 100000,      check: (s) => (s.prestigeCount || 0) >= 3 },
  { id: "prestige_5",    name: "Iterator",                desc: "Promote 5 times. The blueprints stack up.",  icon: "📐", reward: 1000000,     check: (s) => (s.prestigeCount || 0) >= 5 },
  { id: "prestige_10",   name: "you're still bricking?",  desc: "Promote 10 times. ...seriously?",            icon: "👀", reward: 10000000,    check: (s) => (s.prestigeCount || 0) >= 10 },
  { id: "prestige_15",   name: "touch grout",             desc: "Promote 15 times. The skyline exists.",      icon: "🌱", reward: 100000000,   check: (s) => (s.prestigeCount || 0) >= 15 },
  { id: "prestige_25",   name: "send help",               desc: "Promote 25 times. We're worried.",           icon: "🆘", reward: 1000000000,  check: (s) => (s.prestigeCount || 0) >= 25 },
  { id: "prestige_50",   name: "this is your wall now",   desc: "Promote 50 times. There is no skyline.",     icon: "🕳", reward: 10000000000, check: (s) => (s.prestigeCount || 0) >= 50 },
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

// Ascension mode reduces achievement XP because the rank-grind already
// has its own XP economy (Lv 1→100 per commission). Default 0.1 (10%) so
// claiming a big achievement doesn't instantly skip 5 commissions worth
// of grind. EVENT.ascension.achievementXpFactor tunes this.
function achievementXpFactor() {
  if (ASCENSION && ASCENSION.enabled) {
    return ASCENSION.achievementXpFactor != null ? ASCENSION.achievementXpFactor : 0.1;
  }
  return 1;
}

// Same idea for cash — achievements in ascension can dump a multi-billion
// payout that trivializes upgrades. Default 1 (no scaling); ascension
// builds tune via EVENT.ascension.achievementCashFactor.
function achievementCashFactor() {
  if (ASCENSION && ASCENSION.enabled) {
    return ASCENSION.achievementCashFactor != null ? ASCENSION.achievementCashFactor : 1;
  }
  return 1;
}

function claimAchievement(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  if (!state.achievements[id]) return;
  if (state.achievementsClaimed[id]) return;
  const cash = Math.round(a.reward * achievementCashFactor());
  state.cash += cash;
  state.totalEarned += cash;
  state.xp += Math.round(a.reward * achievementXpFactor());
  state.achievementsClaimed[id] = Date.now();
  log(`🏆 ${a.name} claimed (+$${fmt(cash)})`, "good");
  checkLevelUp();
}

function claimAllAchievements() {
  let claimed = 0;
  let total = 0;
  const xpFactor   = achievementXpFactor();
  const cashFactor = achievementCashFactor();
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id]) continue;
    if (state.achievementsClaimed[a.id]) continue;
    const cash = Math.round(a.reward * cashFactor);
    state.cash += cash;
    state.totalEarned += cash;
    state.xp += Math.round(a.reward * xpFactor);
    state.achievementsClaimed[a.id] = Date.now();
    total += cash;
    claimed += 1;
  }
  if (claimed === 0) return;
  log(`🏆 Claimed ${claimed} honor${claimed === 1 ? "" : "s"} (+$${fmt(total)})`, "good");
  checkLevelUp();
}

function showAchievementToast(a) {
  const ocean = $("ocean");
  if (!ocean) return;
  if (window.brickedUpSfx) window.brickedUpSfx.achievement();
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
  // Themed builds (Ascension splash) can pause the simulation by setting
  // window.__GAME_PAUSED__ = true — sub stays at the surface, no loot,
  // no encounters fire. Cleared by the page once the splash dismisses.
  if (typeof window !== "undefined" && window.__GAME_PAUSED__) return;
  // Themed builds can also slow the simulation by setting
  // window.__GAME_SLOWMO__ to a value < 1 (e.g., 0.3 = 30% speed).
  // Used by Ascension to drift into slow-mo when the player hits the
  // cap and needs to ascend — the game stays alive but visibly stalls.
  if (typeof window !== "undefined" && typeof window.__GAME_SLOWMO__ === "number") {
    dtSec *= window.__GAME_SLOWMO__;
  }
  // Accumulate time-played. Includes offline catch-up ticks and live ticks,
  // so the metric reflects total simulated game time, not wall-clock time.
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
  // Wraithgrasp talent: pickup rate folds into the sonar multiplier
  // — a stronger grasp finds and pulls more relics per second.
  const sonar = s.sonar * (boosting ? BOOST_LOOT_MULT : 1) * (1 + talentValue('magnet'));

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
    // we force a fast 0.10s interval so picks come quickly while at depth
    // (~60 legendaries per encounter — 3× the original 0.30s pace).
    // Hard-cap iterations: at extreme sonar the interval can shrink below the
    // 100ms tick and the loop would otherwise run thousands of times per tick.
    // 50 picks per 100ms tick = 500/sec — plenty to keep cargo filling fast.
    const treasure = legendaryEncounterActive();
    // Boost shortens the descent (BOOST_SPEED_MULT) AND raises picks/sec
    // (BOOST_LOOT_MULT). For total loot to come out equal with boost on
    // vs off, the per-tick iteration cap and the interval floor have to
    // scale by the same boost multiplier — otherwise high-sonar dives
    // hit the floor without boost AND the cap with boost, and end up
    // with less loot per boosted dive than per normal dive.
    const lootScale = boosting ? BOOST_LOOT_MULT : 1;
    const iterCap = 50 * lootScale;
    const intervalFloor = 0.01 / lootScale;
    let iterations = 0;
    lootCooldown -= dtSec;
    while (lootCooldown <= 0 && iterations < iterCap) {
      const interval = treasure ? 0.10 : Math.max(intervalFloor, LOOT_INTERVAL_BASE / sonar);
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
  let LEVEL_CAP = BIOMES.length * LEVELS_PER_BIOME;
  // Ascension: hard cap at the next-rank threshold. Player MUST ascend
  // to continue leveling — bar greys out at the cap and reads "Ascend
  // to continue" (see updateUI).
  if (ASCENSION && ASCENSION.enabled) {
    LEVEL_CAP = Math.min(LEVEL_CAP, nextTierLevel());
  }
  while (state.level < LEVEL_CAP && state.xp >= levelCostCumulative(state.level + 1)) {
    state.level += 1;
  }
  // Once we're at the cap, freeze XP at the threshold so the bar shows
  // full and additional XP gain doesn't silently bank toward… nothing.
  if (state.level >= LEVEL_CAP) {
    const capXp = levelCostCumulative(LEVEL_CAP);
    if (state.xp > capXp) state.xp = capXp;
  }
  if (!suppressFx && state.level > startLevel) {
    log(`⭐ Level up! Now Lv ${state.level}.`, "good");
    const newBiomeIdx = biomeIndex(state.level);
    if (newBiomeIdx !== prevBiomeIdx) log(`🏗 Now bricking ${BIOMES[newBiomeIdx].name}!`, "good");
    if (window.brickedUpSfx) window.brickedUpSfx.levelUp();
  }
}

function creditItem(item, s) {
  // The item's value is granted as XP immediately (the level bar fills as you
  // collect) and returned for the eventual cash credit at the surface.
  const valueMult = s.valueMult * prestigeMult() * valueEncounterMult() * (1 + talentValue('cash_boost'));
  // Apotheosis (legendary encounter): each forced-legendary pick is
  // worth Nx on top of all other multipliers. Bricked Up uses 350×;
  // Ascension uses ASCENSION.legendaryBaseMult (default 5×, much
  // smaller) AND applies a (level/cap)^1.5 scale, so even at the cap
  // it's a modest boost instead of an instant fortune.
  let legendaryScale = 1;
  let legendaryBase  = 350;
  if (ASCENSION && ASCENSION.enabled) {
    const cap = nextTierLevel() || 1;
    legendaryScale = Math.min(1, Math.pow(state.level / cap, 1.5));
    legendaryBase  = ASCENSION.legendaryBaseMult != null ? ASCENSION.legendaryBaseMult : 5;
  }
  const treasureMult = legendaryEncounterActive() ? Math.max(1, legendaryBase * legendaryScale) : 1;
  const v = Math.ceil(item.value * valueMult * treasureMult);
  if (ASCENSION && ASCENSION.enabled) {
    // Hybrid pickup XP — flat per-rarity floor so early levels move at
    // a satisfying pace (Lv 1→2 in ~4 commons instead of ~20), then a
    // curve-based portion takes over at high levels where the level
    // cost explodes. xpGain = max(flat, curve) per item.
    const PCT  = { common: 0.005, uncommon: 0.01, rare: 0.02, epic: 0.05, legend: 0.02 };
    const FLAT = { common: 6,     uncommon: 16,   rare: 40,   epic: 100,  legend: 70   };
    const pct  = PCT[item.rarity]  || 0.005;
    const flat = FLAT[item.rarity] || 6;
    const nextLvlCost = Math.max(1, levelCostCumulative(state.level + 1) - levelCostCumulative(state.level));
    const xpGain = Math.max(flat, Math.ceil(nextLvlCost * pct));
    state.xp += xpGain * xpBonusMult() * xpEncounterMult();
  } else {
    state.xp += v * xpBonusMult() * xpEncounterMult();
  }
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
  // Cargo bonus (Lucky Current 2× / Spring Breeze 3×): each base pickup is
  // multiplied while the buff is active. Add (mult - 1) extra copies, but
  // stop early if cargo would overflow.
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
  // Tribute talent: small chance the void duplicates the relic. Counts
  // as +1 in the cargo group (so the haul shows the doubling) and adds
  // a second value credit + weight, but skips a second cargoItems entry
  // to keep the haul list tidy.
  const tributeChance = talentValue('tribute');
  const tributed = tributeChance > 0 && Math.random() < tributeChance;
  if (tributed) {
    sub.cargoKg += weight;
    stored.soldValue += creditItem(item, s);
  }
  sub.cargoItems.push(stored);
  // Incremental aggregator — render reads from this instead of re-grouping
  // the entire cargoItems array on every redraw.
  const g = sub.cargoGrouped[item.name] || { count: 0, totalValue: 0, rarity: item.rarity, icon: item.icon };
  g.count += tributed ? 2 : 1;
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
  log(`Welcome back — caught up ${mins} min of bricking.`, "good");
  refreshUI();
}

// ----- UI --------------------------------------------------------
const $ = (id) => document.getElementById(id);

function fmt(n) {
  if (!isFinite(n)) return "—";
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1e6)  return (n / 1e3).toFixed(2) + "K";
  if (n < 1e9)  return (n / 1e6).toFixed(2) + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2) + "B";
  if (n < 1e15) return (n / 1e12).toFixed(2) + "T";
  if (n < 1e18) return (n / 1e15).toFixed(2) + "Qa";
  if (n < 1e21) return (n / 1e18).toFixed(2) + "Qi";
  if (n < 1e24) return (n / 1e21).toFixed(2) + "Sx";
  return n.toExponential(2);
}

const upgradeRows = {};

// "1" / "10" / "max" — module-local because we don't need to persist it.
let buyMode = "1";

// Plan a bulk purchase: how many levels can we actually buy at the given
// Effective max-level for an upgrade. Static def.maxLevel by default;
// in Ascension, the cargo (Brick Bin) upgrade's cap also tracks the
// current rank's level threshold so each ascension lifts the ceiling
// instead of letting a Lv 1 player buy an endgame cargo.
function effectiveMaxLevel(def) {
  let cap = def.maxLevel ?? Infinity;
  if (ASCENSION && ASCENSION.enabled && def.id === "cargo") {
    // +1 buffer so the player can always buy ONE cargo level above
    // the current rank-gate. Keeps Brick Bin from feeling stingy
    // right at the cap, where the rank-gate level usually maxes the
    // upgrade out exactly.
    const ascCap = (nextTierLevel() || cap) + 1;
    cap = Math.min(cap, ascCap);
  }
  return cap;
}

// budget, capped at `target` (Infinity for max mode). Returns { count, total }.
function planBulkBuy(def, startLvl, target, cash) {
  let count = 0, total = 0;
  const cap = effectiveMaxLevel(def);
  while (count < target && count < 10000 && (startLvl + count) < cap) {
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
    const cap = effectiveMaxLevel(def);
    const atMax = isFinite(cap) && lvl >= cap;
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
    const showCount = (buyMode === "max")
      ? (plan.count >= 1 ? plan.count : 1)
      : target;
    const fixed = def.fixed ?? 0;
    const curr = statValue(def, lvl);
    const next = statValue(def, lvl + Math.max(1, showCount));
    row.lvl.textContent = atMax ? `Lv ${lvl} · MAX` : `Lv ${lvl}`;
    row.meta.textContent = atMax
      ? `${def.desc}: ${curr.toFixed(fixed)}${def.suffix}`
      : `${def.desc}: ${curr.toFixed(fixed)}${def.suffix} → ${next.toFixed(fixed)}${def.suffix}`;
    const amountText = atMax ? "MAX" : `$${fmt(showCost)}`;
    if (row.amount.textContent !== amountText) row.amount.textContent = amountText;
    const countText = atMax ? "" : (buyMode === "1") ? "" : `×${showCount}`;
    if (row.count.textContent !== countText) row.count.textContent = countText;
    // Affordability: x1/x10 require the full target; max only needs >=1.
    const canAfford = !atMax && ((buyMode === "max") ? plan.count >= 1 : plan.count >= target);
    if (row.btn.disabled === canAfford) row.btn.disabled = !canAfford;
  }
}

function planFullCost(def, startLvl, n) {
  let total = 0;
  const cap = effectiveMaxLevel(def);
  for (let i = 0; i < n && i < 10000 && (startLvl + i) < cap; i++) total += upgradeCost(def, startLvl + i);
  return total;
}

function buy(id) {
  const def = UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return;
  const lvl = state.upgrades[id];
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
  if (window.brickedUpSfx) window.brickedUpSfx.buy();
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
  const mult = prestigeMult();
  const pct = Math.round((mult - 1) * 100);
  const subTierEl = $("subTier");
  const nextEl = $("nextTierInfo");
  const multEl = $("prestigeMult");
  const btn = $("prestigeBtn");
  const ascending = ASCENSION && ASCENSION.enabled;
  const starEmoji = (EVENT && EVENT.pearlEmoji) || "🔮";
  if (subTierEl) subTierEl.textContent = rankName(tier);
  const rarityEl = $("prestigeRarity");
  if (rarityEl) rarityEl.textContent = `+${Math.round(rarityUpgradeChance() * 100)}%`;
  if (multEl) {
    // Ascension mode: show absolute ×N (Vows + Stars compound to huge
    // numbers — "+N%" reads as nonsense at ×7,500).
    multEl.textContent = ascending ? `×${fmt(mult)}` : `+${pct}%`;
  }
  const banked = state.pearls || 0;
  const pending = pendingPearls();
  const pearlsEl = $("prestigePearls");
  if (pearlsEl) pearlsEl.textContent = `×${fmt(Math.pow(1.5, banked))}`;
  const gearOwned = $("gearOwnedPearls");
  if (gearOwned) gearOwned.textContent = `×${fmt(Math.pow(1.5, banked))}`;
  const pendingEl = $("prestigePending");
  if (pendingEl) pendingEl.textContent = `×${fmt(Math.pow(1.5, banked + pending))}`;
  // Live coin balance on the floating Talent Vault button.
  const vaultCount = $("vaultCoinCount");
  if (vaultCount) {
    try {
      const n = Number(JSON.parse(localStorage.getItem('ascension_coins_v1') || '0'));
      vaultCount.textContent = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    } catch (e) { vaultCount.textContent = '0'; }
  }
  if (nextEl) {
    // Ascension surfaces the Star-unlock level instead of the rank-gate,
    // because canUpgradeSub now ONLY gates on starUnlockLevel.
    let displayLvl = reqLevel;
    if (ascending) {
      displayLvl = ASCENSION.starUnlockLevel || tierLevelRequired(SUB_RANKS.length);
    }
    nextEl.textContent = ready
      ? `${rankName(nextTier)} — ready!`
      : `${rankName(nextTier)} @ Lv ${displayLvl}`;
  }
  const badge = $("prestigeBadge");
  if (badge) {
    badge.textContent = ascending
      ? (mult > 1 ? `×${fmt(mult)} CASH & XP` : "")
      : (pct > 0 ? `LOOT VALUE +${fmt(pct)}%` : "");
  }
  if (btn) {
    btn.disabled = !ready;
    if (ascending) {
      // Single source of truth: rank-gate level. Each ascend's threshold
      // is +levelsPerRank higher than the last (Lv 20 → 30 → 40 → ...).
      btn.textContent = ready
        ? `Ascend`
        : `Requires Level ${reqLevel}`;
    } else {
      btn.textContent = ready
        ? `Promote · bank ${pending} ${starEmoji}`
        : "Upgrade Crew";
    }
  }
}

// ----- Background creatures ------------------------------------
const CREATURES_PER_BIOME = (EVENT && EVENT.creatures) || {
  "Ground Floor":          ["🐀", "🪳", "🕷"],
  "Subbasement":           ["🐀", "🦗", "🪲"],
  "Boiler Room":           ["🦂", "🪳", "🐍"],
  "Steam Tunnels":         ["🦇", "🐀", "🪲"],
  "Underground Garage":    ["🦂", "🐍"],
  "Foundry Vault":         ["🦎", "🔥"],
  "Concrete Catacombs":    ["🪼", "🦂"],
  "Crystal Quarry":        ["💎", "🪲"],
  "Lost Cathedral":        ["🦇", "🕯"],
  "Bedrock Forge":         ["🪼", "🌀"],
  "Tectonic Vault":        ["🕳", "🌀"],
  "Mirror Lobby":          ["🪞", "🪼"],
  "Echo Belfry":           ["🎶", "🔔"],
  "Blueprint Stratum":     ["💤", "💭"],
  "Inverted Tower":        ["⚛", "💥"],
  "Haunted Townhouse":     ["👻", "🦴"],
  "Astral Penthouse":      ["🌟", "🌌"],
  "Devourer's Foyer":      ["🦷", "🐲"],
  "First Foundation":      ["🌱", "💧"],
  "Final Storey":          ["⏳", "♾"],
};

// ----- Extended biomes (Lv 200-500) -------------------------------
// 30 procedurally-shaped biomes added past End of Time. Per-biome growth
// eases from ×4 to ×1.18 so values stay within JS Number precision —
// deepest legendary at biome 50 ends up around 6×10^15, comfortably under
// 2^53. Within-biome shape (1 / 3.2 / 9.6 / 28 / 88) matches the originals.
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
    ["Liminal Doorway",     "#1a0a30", "#a070ff", ["🚪","🌀"], ["Threshold Brick","Pause Pane","Doorway Brick","Gatekeeper Gaze","The Between"], "🚪"],
    ["Mnemonic Foundation", "#1a2a3a", "#9ce0ff", ["🦴","🪼"], ["Memory Brick","Recall Mortar","Forgotten Joist","Forgetting Crown","Last Memory"], "🧠"],
    ["Glass Curtainwall",   "#0a2a3a", "#d8e8f0", ["🪞","🪟"], ["Pane Brick","Shard Mortar","Mirror Beam","Glass Crown","Reflection"], "🪞"],
    ["Forgotten Codes",     "#3a3a0a", "#ffe070", ["🌀","🌌"], ["Lost Plumb","Faded Spec","Decimal Beam","Number Crown","The Constant"], "π"],
    ["Numbered Floors",     "#2a2a4a", "#e0c870", ["🌀","💫"], ["Counted Brick","Tally Mortar","Sequence Beam","Counter Crown","Census"], "🔢"],
    ["Recursion Atrium",    "#1a0a4a", "#9870ff", ["🌀","♾"],  ["Self Brick","Loop Mortar","Repeat Beam","Recursive Crown","Base Case"], "♻"],
    ["Spiral Stairwell",    "#0a1a4a", "#70a8ff", ["🌀","💫"], ["Cycle Brick","Spiral Mortar","Eddy Beam","Cycle Crown","Eternal Loop"], "♾"],
    ["Heat Death Furnace",  "#3a0a0a", "#ff7070", ["🔥","🌀"], ["Ember Brick","Cooling Mortar","Last Beam","Frost Crown","Stillness"], "❄"],
    ["Reverse Light Floor", "#0a0a2a", "#ffd070", ["✨","🌀"], ["Antiglow Brick","Negaphoton Mortar","Anti-Beam","Dark Crown","Reverse Sun"], "🌑"],
    ["Anti-Time Wing",      "#0a3a3a", "#ffd870", ["⏳","🌀"], ["Untime Brick","Reverse Mortar","Backflow Beam","Untime Crown","Yesterday"], "⏪"],
    ["Schrödinger Stack",   "#1a1a2a", "#a8c0d0", ["🐱","🌀"], ["Maybe Brick","Probability Mortar","Quantum Beam","Wavefunction Crown","Observed"], "🐱"],
    ["Probability Lobby",   "#3a0a4a", "#ff9ce0", ["🎲","🌀"], ["Chance Brick","Random Mortar","Distribution Beam","Bell Crown","Roll"], "🎲"],
    ["Mandelbrot Facade",   "#0a3a3a", "#80c0a0", ["🌀","💎"], ["Fractal Brick","Boundary Mortar","Coastline Beam","Fractal Crown","Infinite Edge"], "🌀"],
    ["Fractal Substructure","#1a0a4a", "#c890ff", ["🌀","🪞"], ["Branch Brick","Recursive Mortar","Self-Similar Beam","Depth Crown","Smaller Always"], "🌀"],
    ["Imaginary Wing",      "#3a1a3a", "#ffaadc", ["💫","🌀"], ["Imaginary Brick","Complex Mortar","i-Beam","Real Crown","Sqrt(-1)"], "i"],
    ["Convergence Hall",    "#3a3a0a", "#ffe890", ["💫","🌀"], ["Limit Brick","Approach Mortar","Converging Beam","Limit Crown","The Point"], "•"],
    ["Asymptote Wing",      "#0a3a3a", "#a0e8ff", ["🌀","💫"], ["Tangent Brick","Touchpoint Mortar","Curve Beam","Asymptotic Crown","Never Quite"], "→"],
    ["Limit's Threshold",   "#3a0a1a", "#ff9070", ["💫","🌀"], ["Boundary Brick","Edge Mortar","Limit Beam","Edge Crown","The Frontier"], "⊥"],
    ["Halt State Bay",      "#1a0a0a", "#ff5050", ["🛑","🌀"], ["Stop Brick","Pause Mortar","Halt Beam","Halt Crown","Termination"], "■"],
    ["Frozen Wing",         "#0a2a3a", "#a8d0ff", ["❄","🌀"],  ["Frozen Brick","Cold Mortar","Stilled Beam","Frost Crown","No-Op"], "❄"],
    ["Thought Atrium",      "#2a0a3a", "#c890ff", ["🌀","💭"], ["Thought Brick","Idea Mortar","Mind Beam","Thought Crown","Cogito"], "💭"],
    ["Idea Stratum",        "#3a3a1a", "#ffe080", ["🌀","💡"], ["Notion Brick","Concept Mortar","Idea Beam","Idea Crown","Eureka"], "💡"],
    ["Concept Storm Floor", "#3a0a3a", "#e090ff", ["⚡","🌀"], ["Conceptual Brick","Storm Mortar","Definition Beam","Concept Crown","The Idea"], "⚡"],
    ["Truth Wing",          "#3a3a3a", "#fff0a0", ["✨","🌀"], ["Truth Brick","Verity Mortar","Honest Beam","Truth Crown","The True"], "✓"],
    ["Reason's Threshold",  "#1a1a0a", "#d8c878", ["🌀","💭"], ["Logic Brick","Argument Mortar","Reason Beam","Reason Crown","QED"], "□"],
    ["Logic Bay",           "#0a1a3a", "#80a8e8", ["🌀","💎"], ["Boolean Brick","AND Mortar","Logic Beam","Logic Crown","Tautology"], "&"],
    ["Identity Wing",       "#2a2a3a", "#d0d0e0", ["🪞","🌀"], ["Self Brick","Identity Mortar","Same Beam","Identity Crown","I = I"], "="],
    ["Self-Reference Tier", "#1a0a2a", "#a890ff", ["🪞","♾"],  ["Recursive Brick","Self Mortar","Reflexive Beam","Reference Crown","Strange Loop"], "♾"],
    ["Fixed-Point Floor",   "#0a0a1a", "#c8b890", ["💫","🌀"], ["Stable Brick","Fixed Mortar","Steady Beam","Anchor Crown","The Fix"], "•"],
    ["The Last Capstone",   "#000000", "#ffffff", ["🌀","✨"], ["Closing Brick","Final Mortar","Bracket Beam","Last Crown","]"], "]"],
  ];
  const START_BASE = 600e9;       // biome 21 common (eases up from biome 20's 500B)
  const GROWTH = 1.18;            // per-biome multiplier
  let base = START_BASE;
  for (const [name, color, accent, creatures, names, legendIcon] of ROWS) {
    BIOMES.push({ name, color, accent });
    LOOT[name] = buildLoot(base, names, legendIcon);
    CREATURES_PER_BIOME[name] = creatures;
    base = base * GROWTH;
  }
})();

// Reveal popup used by bonus loot clicks (and other reward moments).
function showItemReveal(item, value, tierLabel, xpGain) {
  const ocean = $("ocean");
  if (!ocean) return;
  const reveal = document.createElement("div");
  reveal.className = `item-reveal rarity-${item.rarity}`;
  // Optional XP line for chest reveals — surfaces the curve-based XP
  // grant directly so the player can verify chests still feed leveling.
  const xpLine = (xpGain && xpGain > 0)
    ? `<div class="reveal-xp">+${fmt(xpGain)} XP</div>`
    : "";
  reveal.innerHTML = `
    <div class="reveal-tier">${tierLabel || item.rarity.toUpperCase()}</div>
    <div class="reveal-icon">${item.icon || "✨"}</div>
    <div class="reveal-name">${item.name}</div>
    <div class="reveal-value">+$${fmt(value)}</div>
    ${xpLine}
  `;
  ocean.appendChild(reveal);
  setTimeout(() => reveal.remove(), 2700);
}

// ----- Treasure chests + inventory ------------------------------
const CHEST_TIERS = (EVENT && EVENT.chestTiers) || {
  common: {
    name: "Brick Pallet", icon: "🧱", label: "Common",
    rarities: ["common", "uncommon", "rare"],
    rarityWeights: { common: 55, uncommon: 35, rare: 10 },
    items: 2, valueMult: 1.0,
  },
  rare: {
    name: "Mason's Toolbox", icon: "🧰", label: "Rare",
    rarities: ["rare", "epic", "legend"],
    rarityWeights: { rare: 55, epic: 35, legend: 10 },
    items: 3, valueMult: 1.6,
  },
  epic: {
    name: "Foreman's Vault", icon: "🗄", label: "Epic",
    rarities: ["epic", "legend"],
    rarityWeights: { epic: 55, legend: 45 },
    items: 4, valueMult: 2.4,
  },
  legendary: {
    name: "Architect's Reliquary", icon: "🏛", label: "Legendary",
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
    if (window.brickedUpSfx) window.brickedUpSfx.chestCollect();
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
  const now = Date.now();
  const wasActive = (state.chestFrenzyUntil || 0) > now;
  // Stack: extend the existing window instead of resetting it. A
  // back-to-back Brick Delivery / GET BRICKED then runs for the sum of
  // both durations and gets an additional batch of forced legendaries.
  state.chestFrenzyUntil = (wasActive ? state.chestFrenzyUntil : now) + durationMs;
  if (!wasActive) {
    _frenzySpawnCount = 0;
    _frenzyLegendarySlots = new Set();
  }
  // Pick more forced-legendary slots inside the (new or extended) window.
  // Indexes are absolute spawn positions starting from _frenzySpawnCount,
  // so re-running adds slots ahead of the current spawn cursor.
  const expected = Math.max(1, Math.floor(durationMs / CHEST_FRENZY_INTERVAL_MS));
  let added = 0;
  while (added < CHEST_FRENZY_FORCED_LEGENDARIES && added < expected) {
    _frenzyLegendarySlots.add(_frenzySpawnCount + Math.floor(Math.random() * expected));
    added++;
  }
  if (!wasActive) runChestFrenzy();
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

function scheduleTreasure() {
  if (eventEnded()) return;
  const delay = 20000 + Math.random() * 25000; // 20-45s — was 60-140s
  setTimeout(() => {
    if (eventEnded()) return;
    spawnTreasureChest();
    scheduleTreasure();
  }, delay);
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
    // Cap visible rows the same way the activity log does (12-entry max)
    // so chest frenzies and Brick Deliveries can't pile up an unbounded
    // column. Oldest rows are dropped first; their fade-out timeout
    // still fires harmlessly against a detached node.
    while (root.childElementCount > 12) root.firstChild.remove();
    setTimeout(() => row.remove(), 3700);
  }, idx * 90);
}

function openChest(tier) {
  const def = CHEST_TIERS[tier];
  if (!def) return;
  const idx = state.inventory.indexOf(tier);
  if (idx < 0) return;
  state.inventory.splice(idx, 1);
  if (window.brickedUpSfx) window.brickedUpSfx.chestOpen();

  const s = stats();
  const itemCount = def.items || 1;
  const tierValMult = def.valueMult || 1;
  const useAscensionXp = ASCENSION && ASCENSION.enabled;

  // ----- Ascension chest payout (simple, predictable) -----------------
  // Flat cash + curve-based XP per tier. Chests are saved rewards
  // (carry over across ascensions), so they pay out FULL regardless of
  // your current level — opening one is always meaningful, even right
  // after ascending. Cash still scales with prestigeMult (Vows × Stars)
  // for late-game compounding.
  const ASCENSION_CASH_PER_ITEM = { common: 50, rare: 200, epic: 1000, legendary: 5000 };
  const ASCENSION_XP_PCT_PER_ITEM = { common: 0.002, rare: 0.005, epic: 0.012, legendary: 0.025 };
  let ascensionCashPerItem = 0;
  let ascensionXpPerItem   = 0;
  if (useAscensionXp) {
    const baseCashPerItem = ASCENSION_CASH_PER_ITEM[tier] || 50;
    ascensionCashPerItem = Math.round(baseCashPerItem * prestigeMult() * valueEncounterMult());
    const nextLevelXp = Math.max(1, levelCostCumulative(state.level + 1) - levelCostCumulative(state.level));
    ascensionXpPerItem = Math.max(1, Math.ceil(nextLevelXp * (ASCENSION_XP_PCT_PER_ITEM[tier] || 0.002)));
  }

  // Mermaid's Kiss doubles the chest payout while it's active, same as live picks.
  // (Brick path only — Ascension uses the flat formula above.)
  const baseMult = s.valueMult * prestigeMult() * tierValMult * valueEncounterMult();
  // Chests are a rare event — make them count for leveling. XP per chest item
  // scales with chest tier so a Reliquary feels meaningfully different from
  // a basic Crate.
  const CHEST_XP_MULT = { common: 3, rare: 5, epic: 8, legendary: 14 };
  const xpMult = CHEST_XP_MULT[tier] || 3;
  // Redeem one frenzy-chest promise on this open: the first 2 rolls are
  // forced to legend rarity, regardless of which tier chest the player
  // happened to click. Capped at def.items so a 2-item common still works.
  const isFrenzyRedeem = (state.frenzyChestsPending || 0) > 0;
  const guaranteedLegend = isFrenzyRedeem ? Math.min(3, itemCount) : 0;
  if (isFrenzyRedeem) state.frenzyChestsPending -= 1;
  const rolled = [];
  let totalValue = 0;
  let totalXp    = 0;  // tracked so we can surface it on chest reveal/log
  // Stack repeated rolls into a single haul row per item, like the activity log.
  const summary = {};
  for (let i = 0; i < itemCount; i++) {
    const item = rollChestItem(def, i < guaranteedLegend ? "legend" : null);
    if (!item) continue;
    // Ascension uses the simple per-tier flat cash; brick uses item-based.
    const value = useAscensionXp
      ? ascensionCashPerItem
      : Math.ceil(item.value * baseMult);
    rolled.push({ item, value });
    totalValue += value;
    state.cash += value;
    state.totalEarned += value;
    const baseXp = useAscensionXp ? ascensionXpPerItem : (value * xpMult);
    const xpGain = Math.round(baseXp * xpBonusMult() * xpEncounterMult());
    state.xp += xpGain;
    totalXp  += xpGain;
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
  // Activity-log entry confirms the XP gain so the player can see at a
  // glance whether chests are still firing into the level bar (cash is
  // shown in the reveal already, XP wasn't visible anywhere before).
  if (totalXp > 0) log(`${def.icon} ${def.name} +$${fmt(totalValue)} · +${fmt(totalXp)} XP`, "good");
  // Show the highest-rarity (or highest-value) item with the chest's total payout.
  const best = rolled.reduce((a, b) => (b.value > a.value ? b : a)).item;
  showItemReveal(best, totalValue, `${def.icon} ${def.name} (${rolled.length} items)`, totalXp);
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

// ----- Permit Lottery (side feature) ----------------------------
// The lottery is the ONLY source of bonus encounters now. Each match triggers
// a specific buff; jackpot stacks all three with a longer duration.
// Reel faces are the icons of the bonuses they grant. 🚧 is the lone hazard.
// Symbol order (must stay aligned across themes): [hazard, mini, minor, major, jackpot].
const SLOT_SYMBOLS = (EVENT && EVENT.slotSymbols) || ["🚧", "🚛", "👷", "📐", "🏗"];
// Base bonus chances. Mini (Chest Frenzy) and shark (hazard) hold steady at
// 10 / 8; the kiss / map / jackpot ladder gets another +1 each (minor 7→8,
// major 3→4, jackpot 2→3). "none" absorbs the +3. Lucky Salvage Charm still
// boosts major + jackpot on top via slotLuckWeight().
// Outcome table is event-overridable so themed builds can add their own
// tiers (e.g., "cargo", "xpburst") with extra symbols. Each entry needs a
// `tier` key (matched against SLOT_BONUSES + applySlotBonus) and an index
// into SLOT_SYMBOLS to display on a triple match.
function defaultSlotOutcomes() {
  return [
    { tier: "none",    weight: 67, pick: () => slotNonMatch() },
    { tier: "shark",   weight: 8,  pick: () => [SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]] },
    { tier: "mini",    weight: 10, pick: () => [SLOT_SYMBOLS[1], SLOT_SYMBOLS[1], SLOT_SYMBOLS[1]] },
    { tier: "minor",   weight: 8,  pick: () => [SLOT_SYMBOLS[2], SLOT_SYMBOLS[2], SLOT_SYMBOLS[2]] },
    { tier: "major",   weight: 4,  pick: () => [SLOT_SYMBOLS[3], SLOT_SYMBOLS[3], SLOT_SYMBOLS[3]] },
    { tier: "jackpot", weight: 3,  pick: () => [SLOT_SYMBOLS[4], SLOT_SYMBOLS[4], SLOT_SYMBOLS[4]] },
  ];
}
const SLOT_OUTCOMES = (function () {
  const cfg = EVENT && EVENT.slotOutcomes;
  if (!cfg) return defaultSlotOutcomes();
  // Config provides plain data ({tier, weight, symbolIndex}); we resolve
  // pick functions here so EVENT_CONFIG stays JSON-compatible.
  return cfg.map(entry => ({
    tier:   entry.tier,
    weight: entry.weight,
    pick:   entry.tier === "none"
      ? (() => slotNonMatch())
      : (() => {
          const i = entry.symbolIndex || 0;
          return [SLOT_SYMBOLS[i], SLOT_SYMBOLS[i], SLOT_SYMBOLS[i]];
        }),
  }));
})();
const SLOT_BONUSES = (EVENT && EVENT.slotBonuses) || {
  shark:   { icon: "🚧", name: "Brick to the Head!",  desc: "Knocked out cold — no bricks for 10s!", duration: 10000, kind: "hazard" },
  mini:    { icon: "🚛", name: "Brick Delivery",      desc: "Rare/epic crate burst for 10s — each rolls ≥3 legendaries!", chestFrenzy: true, duration: 10000 },
  minor:   { icon: "👷", name: "Bricklayer's Trance", desc: "10× value & 10× XP for 15s.", valueMult: 10, xpMult: 10, duration: 15000 },
  major:   { icon: "📐", name: "Master Brickworks",   desc: "Legendary picks for 15s!", duration: 15000 },
  jackpot: { icon: "🏗", name: "GET BRICKED",         desc: "All bonuses · 30s (legendary 15s)!", duration: 30000 },
};

// Stacking-duration helper: if the bonus is still active (until > now),
// add `dur` on top of the existing end time so back-to-back hits of the
// same bonus accumulate instead of resetting. If it's expired (or never
// started), start fresh at now + dur.
function stackUntil(currentUntil, now, dur) {
  return Math.max(currentUntil || 0, now) + dur;
}

// Tier → state mutation. Lives here (not in SLOT_BONUSES data) so event configs
// loaded from a different script tag don't have to close over `state`.
function applySlotBonus(tier, now, duration, bonus) {
  // Gear: hazard duration shrinks (Reinforced Hull); positive bonuses extend (Bonus Stabilizer).
  if (tier === "shark") {
    state.sharkSlowUntil = stackUntil(state.sharkSlowUntil, now, Math.round(duration * hazardDurationMult()));
    return;
  }
  const ext = bonusDurationMult();
  const dur = Math.round(duration * ext);
  if (tier === "mini")    {
    if (bonus && bonus.chestFrenzy) {
      // Chest Frenzy now picks up Stabilizer too — feed it the gear-
      // extended duration so the burst window grows with stab levels.
      // startChestFrenzy stacks internally if a frenzy is already running.
      const baseFrenzy = (bonus && bonus.duration) || 10000;
      startChestFrenzy(Math.round(baseFrenzy * ext));
    } else {
      state.encounterCargoUntil = stackUntil(state.encounterCargoUntil, now, dur);
      state.encounterCargoAmt   = (bonus && bonus.cargoMult) || 2;
    }
    return;
  }
  if (tier === "minor")   {
    state.encounterValueUntil = stackUntil(state.encounterValueUntil, now, dur);
    state.encounterValueAmt   = (bonus && bonus.valueMult) || 2;
    // Per-bonus xpMult is opt-in (Butterfly Kiss = 5×; Mermaid's Kiss = none).
    if (bonus && bonus.xpMult && bonus.xpMult > 1) {
      state.encounterXpUntil = stackUntil(state.encounterXpUntil, now, dur);
      state.encounterXpAmt   = bonus.xpMult;
    }
    return;
  }
  if (tier === "major")   {
    state.encounterLegendaryUntil = stackUntil(state.encounterLegendaryUntil, now, dur);
    return;
  }
  // New tier: pure cargo-multiplier bonus (no chest frenzy, no value/xp).
  // Lets themed builds add a "carry more" bonus distinct from mini's frenzy.
  if (tier === "cargo")   {
    state.encounterCargoUntil = stackUntil(state.encounterCargoUntil, now, dur);
    state.encounterCargoAmt   = (bonus && bonus.cargoMult) || 2;
    return;
  }
  // New tier: pure XP burst (no value mult, no cargo). Useful for themes
  // that want a "rank up faster" bonus separate from cash bonuses.
  if (tier === "xpburst") {
    state.encounterXpUntil = stackUntil(state.encounterXpUntil, now, dur);
    state.encounterXpAmt   = (bonus && bonus.xpMult) || 5;
    return;
  }
  if (tier === "jackpot") {
    state.encounterValueUntil = stackUntil(state.encounterValueUntil, now, dur);
    // Jackpot stacks all positive bonuses, so it inherits whatever
    // multipliers / behaviors the mini (current/frenzy) and minor (kiss)
    // tiers carry. Mini tier here can be either a cargo mult OR a chest
    // frenzy; we honor whichever the active config defines.
    const miniBonus  = SLOT_BONUSES.mini;
    const minorBonus = SLOT_BONUSES.minor;
    if (miniBonus && miniBonus.chestFrenzy) {
      // Stabilizer applies on jackpot too — extend the frenzy window.
      const baseFrenzy = (miniBonus && miniBonus.duration) || 10000;
      startChestFrenzy(Math.round(baseFrenzy * ext));
    } else {
      state.encounterCargoUntil = stackUntil(state.encounterCargoUntil, now, dur);
      state.encounterCargoAmt   = (miniBonus && miniBonus.cargoMult) || 2;
    }
    state.encounterValueAmt = (minorBonus && minorBonus.valueMult) || 2;
    if (minorBonus && minorBonus.xpMult && minorBonus.xpMult > 1) {
      state.encounterXpUntil = stackUntil(state.encounterXpUntil, now, dur);
      state.encounterXpAmt   = minorBonus.xpMult;
    }
    // Legendary picks always cap at the standalone major duration even on
    // jackpot so the highest-rarity floor doesn't run for the full 30s.
    const majorBase = (SLOT_BONUSES.major && SLOT_BONUSES.major.duration) || duration;
    state.encounterLegendaryUntil = stackUntil(state.encounterLegendaryUntil, now, Math.round(majorBase * ext));
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
  // Lucky Salvage Charm gear adjusts shark/major/jackpot weights at pick time.
  const weights = SLOT_OUTCOMES.map(o => slotLuckWeight(o.tier, o.weight));
  const total = weights.reduce((a, w) => a + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SLOT_OUTCOMES.length; i++) {
    r -= weights[i];
    if (r <= 0) return SLOT_OUTCOMES[i];
  }
  return SLOT_OUTCOMES[0];
}

function spinSlot(forceTier) {
  const slot = $("slotMachine");
  if (!slot) return;
  if (slot.dataset.state === "spinning") return;
  slot.dataset.state = "spinning";
  slot.classList.remove("win", "lose", "win-two", "win-mini", "win-minor", "win-major", "win-jackpot");
  const status = slot.querySelector(".slot-status");
  if (status) status.textContent = "Spinning…";
  // Synthesized reel-tick stream that matches the 1.6s animation.
  if (window.brickedUpSfx) window.brickedUpSfx.spin();

  const reels = Array.from(slot.querySelectorAll(".slot-reel"));
  reels.forEach((r) => r.classList.add("spinning"));

  // Admin/test path: when a forceTier is supplied, skip the random
  // outcome roll and pick the matching SLOT_OUTCOMES entry instead.
  // Falls back to the random pick if the forced tier isn't in the table.
  const outcome = forceTier
    ? (SLOT_OUTCOMES.find(o => o.tier === forceTier) || pickSlotOutcome())
    : pickSlotOutcome();
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
    // Cascade Black Mass — when a jackpot lands and cascade is enabled,
    // ALL bonus signals (apply, banner, log, status, slotHits counter,
    // SFX, screen flash) defer until the cascade resolves. Stage 1
    // (zero cascade hits) gives NOTHING — the player has to land at
    // least one cascade to actually claim the bonus.
    const cascadeCfg = (EVENT && EVENT.cascadeJackpot) || null;
    const isCascadeJackpot = outcome.tier === "jackpot" && cascadeCfg && cascadeCfg.enabled;
    if (!state.slotHits) state.slotHits = { mini: 0, minor: 0, major: 0, jackpot: 0, shark: 0 };

    if (isCascadeJackpot) {
      // Player landed the main jackpot — count it for stats but suppress
      // all "you got the bonus" feedback until cascade decides.
      state.slotHits.jackpot = (state.slotHits.jackpot || 0) + 1;
      slot.classList.add("win", "win-jackpot");
      if (status) status.textContent = `🌑 PROGRESSIVE JACKPOT…`;
      runCascadeChain(cascadeCfg, bonus, now);
      checkAchievements();
    } else {
      applySlotBonus(outcome.tier, now, bonus.duration, bonus);
      if (window.brickedUpSfx) window.brickedUpSfx.bonus(outcome.tier);
      const isHazard = bonus.kind === "hazard";
      if (!isHazard) state.bonusCollected = (state.bonusCollected || 0) + 1;
      state.slotHits[outcome.tier] = (state.slotHits[outcome.tier] || 0) + 1;
      slot.classList.add("win", `win-${outcome.tier}`);
      if (status) status.textContent = `${bonus.icon} ${bonus.name}`;
      const logKind = isHazard ? "bad" : "good";
      log(`🎰 ${symbols.join(" ")} → ${bonus.icon} ${bonus.name} — ${bonus.desc}`, logKind);
      if (!suppressFx) showEncounterBanner(bonus);
      if (outcome.tier === "major") flashScreen("epic");
      checkAchievements();
    }
  } else {
    slot.classList.add("lose");
    if (status) status.textContent = "No match. Next pull soon…";
  }

  setTimeout(() => {
    slot.classList.remove("win", "lose", "win-mini", "win-minor", "win-major", "win-jackpot", "win-shark");
    // Countdown text is restored by updateSlotCountdown on the next refresh.
  }, 4000);
}

// Cascade Black Mass — after a main-slot jackpot, a "PROGRESSIVE
// JACKPOT" strip materializes with ALL N mini-slots visible upfront,
// greyed out. Each mini-slot has 3 reels. They activate one at a time:
// active = bright, spins, then locks as hit (all 3 = 🌑, glows gold)
// or miss (cascade ends). Final mini-slot's last reel does the slow
// dramatic ramp-down.
function runCascadeChain(cfg, bonus, now) {
  const slot = $("slotMachine");
  if (!slot) {
    applySlotBonus("jackpot", now, bonus.duration, bonus);
    return;
  }
  const reels = slot.querySelector(".slot-reels");
  if (!reels) {
    applySlotBonus("jackpot", now, bonus.duration, bonus);
    return;
  }
  const status = slot.querySelector(".slot-status");
  const jackpotSymbol = SLOT_SYMBOLS[4];
  const maxExtra      = Math.max(0, (cfg.maxExtraReels || 3));
  const hitChance     = Math.min(0.99, ((cfg.hitChance != null) ? cfg.hitChance : 0.5) + talentValue('cascade'));
  const stageDurations = cfg.stageDurations || [20000, 25000, 30000, 40000];

  let stage = 1;
  let cancelled = false;

  // Build the entire PROGRESSIVE JACKPOT strip upfront — all mini-slots
  // visible, all greyed out. They activate one at a time as the cascade
  // chains. Strip is appended to .slot-reels so it flows beside the
  // main 3 reels.
  const strip = document.createElement("div");
  strip.className = "cascade-strip";
  // → arrow connecting the main slot to the cascade strip
  const leadArrow = document.createElement("div");
  leadArrow.className = "cascade-arrow";
  leadArrow.textContent = "→";
  strip.appendChild(leadArrow);
  const stripBody = document.createElement("div");
  stripBody.className = "cascade-strip-body";
  const label = document.createElement("div");
  label.className = "cascade-label";
  label.textContent = "PROGRESSIVE JACKPOT";
  stripBody.appendChild(label);
  const slotsRow = document.createElement("div");
  slotsRow.className = "cascade-slots-row";

  // Build all maxExtra mini-slots upfront (greyed). Stacked vertically
  // in CSS — no inter-arrows needed.
  const minis = [];
  for (let i = 0; i < maxExtra; i++) {
    const mini = document.createElement("div");
    mini.className = "cascade-mini cascade-pending";
    if (i === maxExtra - 1) mini.classList.add("cascade-mini-final");
    for (let r = 0; r < 3; r++) {
      const reel = document.createElement("div");
      reel.className = "slot-reel cascade-mini-reel";
      reel.innerHTML = '<div class="slot-strip">·</div>';
      mini.appendChild(reel);
    }
    slotsRow.appendChild(mini);
    minis.push(mini);
  }
  stripBody.appendChild(slotsRow);
  strip.appendChild(stripBody);
  reels.appendChild(strip);

  function cleanup() {
    if (strip) {
      strip.classList.add("cascade-fade");
      setTimeout(() => strip.remove(), 600);
    }
  }

  // Custom MEGA stack — fires VESPERS FRENZY + COMMUNION + SERPENT'S
  // COIL + INNER EYE for the full MEGA duration (40s). Explicitly
  // EXCLUDES legendary picks (Apotheosis) and Stigmata (hazard).
  function applyMegaStack(megaDur) {
    const now = Date.now();
    const ext = bonusDurationMult();
    const dur = Math.round(megaDur * ext);  // 40s (× any Stabilizer)
    const miniBonus  = SLOT_BONUSES.mini;
    const minorBonus = SLOT_BONUSES.minor;
    const cargoBonus = SLOT_BONUSES.cargo;
    const xpburstBn  = SLOT_BONUSES.xpburst;
    // Vespers Frenzy — chest frenzy for the FULL MEGA duration (was
    // capped at the mini's own 12s — overridden here so the player
    // gets the whole 40s of crate spam).
    if (miniBonus) {
      if (miniBonus.chestFrenzy) {
        startChestFrenzy(dur);
      } else if (miniBonus.cargoMult) {
        state.encounterCargoUntil = stackUntil(state.encounterCargoUntil, now, dur);
        state.encounterCargoAmt   = miniBonus.cargoMult || 2;
      }
    }
    // Communion — value + XP for 40s.
    if (minorBonus) {
      state.encounterValueUntil = stackUntil(state.encounterValueUntil, now, dur);
      state.encounterValueAmt   = minorBonus.valueMult || 2;
      if (minorBonus.xpMult && minorBonus.xpMult > 1) {
        state.encounterXpUntil = stackUntil(state.encounterXpUntil, now, dur);
        state.encounterXpAmt   = Math.max(state.encounterXpAmt || 1, minorBonus.xpMult);
      }
    }
    // Serpent's Coil — cargo bonus for 40s (stacks max with mini cargo).
    if (cargoBonus) {
      state.encounterCargoUntil = stackUntil(state.encounterCargoUntil, now, dur);
      state.encounterCargoAmt   = Math.max(state.encounterCargoAmt || 2, cargoBonus.cargoMult || 2);
    }
    // Inner Eye — XP burst for 40s (stacks max with Communion XP).
    if (xpburstBn) {
      state.encounterXpUntil = stackUntil(state.encounterXpUntil, now, dur);
      state.encounterXpAmt   = Math.max(state.encounterXpAmt || 1, xpburstBn.xpMult || 5);
    }
    // NO Apotheosis (legendary picks). NO Stigmata (hazard).
  }

  function finalize() {
    // All-or-nothing: bonus only fires when EVERY cascade mini-slot hits.
    // Anything less and the progressive resolves to zero.
    const allHit = stage >= maxExtra + 1;
    if (allHit) {
      // CELEBRATION — green pulsing glow on all mini-slots, 🌑🌑🌑
      // symbols stay locked for 2 seconds. Then a brief reel-jumble
      // flourish (~600ms) before the bonus applies and the strip fades.
      minis.forEach(m => m.classList.add("cascade-mega-celebrate"));
      strip.classList.add("cascade-mega-celebrate");
      if (status) status.textContent = `🌑 MEGA — JACKPOT WIN!`;
      // Whoop SFX overlay during celebration.
      if (window.brickedUpSfx && window.brickedUpSfx.bonus) {
        try { window.brickedUpSfx.bonus("jackpot"); } catch (e) {}
      }
      const HOLD_MS    = 2000;
      const JUMBLE_MS  = 600;
      setTimeout(() => {
        // Jumble flourish — every cascade reel rapidly cycles random
        // symbols, then locks back on 🌑 right as the bonus applies.
        const allReels = [];
        minis.forEach(m => {
          m.querySelectorAll(".slot-strip").forEach(s => allReels.push(s));
        });
        const cyclers = allReels.map(strip => setInterval(() => {
          strip.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        }, 60));
        setTimeout(() => {
          cyclers.forEach(c => clearInterval(c));
          allReels.forEach(s => { s.textContent = jackpotSymbol; });
          // NOW apply the bonus + flash + log + fade.
          const megaDur = stageDurations[stageDurations.length - 1] || bonus.duration;
          applySlotBonus("jackpot", Date.now(), megaDur, bonus);
          state.bonusCollected = (state.bonusCollected || 0) + 1;
          if (!suppressFx) showEncounterBanner(bonus);
          flashScreen("legend");
          if (status) status.textContent = `${bonus.icon} MEGA ${bonus.name} (${Math.round(megaDur/1000)}s)`;
          log(`🌑 MEGA ${bonus.name} · ALL cascades hit → ${Math.round(megaDur/1000)}s!`, "legend");
          if (typeof leaderboardSync === "function") leaderboardSync(true);
          setTimeout(cleanup, 1400);
        }, JUMBLE_MS);
      }, HOLD_MS);
    } else {
      if (status) status.textContent = `🌑 Progressive failed — no bonus`;
      log(`🌑 Progressive jackpot failed at ${stage}/${maxExtra + 1} — no bonus.`, "bad");
      setTimeout(cleanup, 2400);
    }
  }

  function spinCascade(idx) {
    if (cancelled || idx > maxExtra) return finalize();

    // Mini-slots are pre-built upfront and greyed via .cascade-pending.
    // Activate this one — bring it to full brightness.
    const mini = minis[idx - 1];
    if (!mini) return finalize();
    mini.classList.remove("cascade-pending");
    mini.classList.add("cascade-active");
    const isFinal = (idx === maxExtra);
    const reelEls = Array.from(mini.querySelectorAll(".slot-reel"));

    if (status) {
      status.textContent = isFinal
        ? `🌑 FINAL CASCADE — for MEGA…`
        : `🌑 Cascade ${idx} of ${maxExtra}…`;
    }

    // Per-reel independent rolls. As soon as one reel misses, we stop
    // the rest of the reels in this mini and lock the failing symbol
    // for 2s so the player can see EXACTLY what they lost on.
    // hitChance is interpreted PER REEL — overall mini-hit rate is
    // hitChance^3 (e.g., 0.85 per reel → ~61% per mini → ~23% MEGA).
    const hazardSymbol = SLOT_SYMBOLS[0];
    const safeSymbols  = SLOT_SYMBOLS.filter(s => s !== jackpotSymbol && s !== hazardSymbol);
    const pickMissSymbol = () => {
      const pool = safeSymbols.length ? safeSymbols : SLOT_SYMBOLS.filter(s => s !== jackpotSymbol);
      return pool[Math.floor(Math.random() * pool.length)];
    };
    let hit = true;  // assume hit until any reel misses

    function resolveMini() {
      if (hit) {
        mini.classList.add("cascade-hit");
        stage += 1;
        // Final cascade hit = MEGA. Go straight to celebration with no
        // inter-cascade pause so the green pulse starts the instant the
        // last 🌑 lands. Otherwise quick handoff (350ms) to next mini.
        if (stage > maxExtra) {
          finalize();
        } else {
          setTimeout(() => spinCascade(idx + 1), 350);
        }
      } else {
        mini.classList.add("cascade-miss");
        // Shake-and-fade: failed mini-slot rattles briefly, then fades.
        // Also fade out any remaining pending mini-slots so the player
        // sees the chain visibly snap shut.
        for (let j = idx; j < minis.length; j++) {
          const m = minis[j];
          if (j === idx - 0) {
            // Failed slot already has cascade-miss — add the slow fade
            // after the shake animation completes (~0.45s).
            setTimeout(() => m.classList.add("cascade-slow-fade"), 450);
          } else {
            // Pending slots that never got their turn — slowly fade out.
            m.classList.add("cascade-slow-fade");
          }
        }
        finalize();
      }
    }

    function spinReel(reelIdx) {
      if (cancelled) return;
      if (reelIdx >= 3) return resolveMini();
      const reel  = reelEls[reelIdx];
      const strip = reel.querySelector(".slot-strip");
      reel.classList.add("spinning");
      if (window.brickedUpSfx) window.brickedUpSfx.spin();

      // Independent per-reel roll. Land jackpot symbol on hit; any
      // other safe symbol on miss. As soon as one reel misses, the
      // mini-slot fails — hold the losing symbol for 2 seconds so the
      // player can see exactly what they lost on.
      const reelHit = Math.random() < hitChance;
      const landSymbol = reelHit ? jackpotSymbol : pickMissSymbol();

      // Final reel of FINAL cascade gets dramatic ramp — but only when
      // we've made it to that reel (= previous two reels both hit).
      const isDramatic = isFinal && reelIdx === 2;

      function lockReel() {
        reel.classList.remove("spinning");
        reel.classList.add("settle");
        strip.textContent = landSymbol;
        if (reelHit) {
          // Continue chain: next reel after a short gap, or resolve mini.
          const gapMs = isFinal ? 160 : 100;
          setTimeout(() => spinReel(reelIdx + 1), gapMs);
        } else {
          // First miss — mark the mini as missed, hold the failing
          // symbol visible for 2s, then resolve.
          hit = false;
          reel.classList.add("cascade-reel-miss");
          setTimeout(() => resolveMini(), 2000);
        }
      }

      if (isDramatic) {
        let interval = 60, elapsed = 0;
        const TOTAL = 3600;
        let nextSfx = 1100;
        function tick() {
          if (cancelled) return;
          strip.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          elapsed += interval;
          if (window.brickedUpSfx && elapsed >= nextSfx) {
            window.brickedUpSfx.spin();
            nextSfx = elapsed + 1000;
          }
          if (elapsed >= TOTAL) return lockReel();
          const t = Math.min(1, elapsed / TOTAL);
          interval = 60 + (520 - 60) * (t * t);
          setTimeout(tick, interval);
        }
        tick();
        return;
      }

      const spinMs = isFinal ? 650 : 400;
      const cycler = setInterval(() => {
        strip.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      }, 60);
      setTimeout(() => {
        clearInterval(cycler);
        lockReel();
      }, spinMs);
    }

    spinReel(0);
  }

  spinCascade(1);
}

const SLOT_INTERVAL_MS = 15000;

function scheduleSlot() {
  if (eventEnded()) return;
  // Honor the persisted timestamp so reloads / closing the tab don't restart
  // the countdown. If the saved spin time is in the past, fire immediately.
  const delay = Math.max(0, state.nextSpinAt - Date.now());
  setTimeout(() => {
    if (eventEnded()) return;
    // Themed builds can pause the slot too (Ascension freezes everything
    // at-cap so the player must ascend to keep playing). Just retry in
    // a moment instead of firing the spin.
    if (typeof window !== "undefined" && window.__GAME_PAUSED__) {
      setTimeout(scheduleSlot, 500);
      return;
    }
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
  major:   "Legendary picks",
  minor:   "2× value",
  mini:    "Double pickups",
  shark:   "No loot",
  cargo:   "Cargo bonus",
  xpburst: "XP burst",
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
  // xpburst (Inner Eye) — XP-only bonus. Only show its own row when
  // there's no value-bonus active (otherwise the minor row already
  // surfaces the XP component to avoid double-counting).
  const xpUntil = (state.encounterXpUntil || 0);
  if (xpUntil > now && !((state.encounterValueUntil || 0) > now)) {
    rows.push({ until: xpUntil, tier: "xpburst", cls: "eff-kiss", subKind: "xpburst" });
  }
  // Mini tier covers either Lucky Current (cargo bonus) or Chest Frenzy.
  // When both are active simultaneously (e.g. mid-jackpot, or a fresh
  // cargo spin landing while frenzy is still running), render BOTH rows
  // so the player can read each timer instead of just the longer one.
  const cargoUntil  = (state.encounterCargoUntil || 0);
  const frenzyUntil = (state.chestFrenzyUntil    || 0);
  if (frenzyUntil > now) rows.push({ until: frenzyUntil, tier: "mini", cls: "eff-current", subKind: "frenzy" });
  if (cargoUntil  > now) rows.push({ until: cargoUntil,  tier: "mini", cls: "eff-current", subKind: "cargo"  });

  // The container itself has no styling (CSS uses :empty / :not(:empty) to
  // toggle margin + flex layout). Each active bonus becomes a child row.
  el.innerHTML = "";
  for (const r of rows) {
    const bonus = SLOT_BONUSES[r.tier];
    const remaining = Math.max(0, Math.ceil((r.until - now) / 1000));
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
    } else if (r.tier === "xpburst") {
      // Inner Eye solo — show the actual active multiplier so the
      // player knows exactly how much XP they're gaining.
      const x = state.encounterXpAmt || 1;
      shortDesc = `${x}× XP`;
    } else if (r.tier === "cargo") {
      // Pure cargo bonus (Serpent's Coil) when no mini is active.
      const c = state.encounterCargoAmt || 2;
      shortDesc = `${c}× cargo`;
    }

    // Gear-extra badge: stacks below the bonus row with the actual gear
    // contribution to this active bonus (in seconds — same unit as the
    // timer). Only shown when the relevant gear is installed AND its
    // effect actually applies to this tier. Split into name + delta
    // spans so CSS can lay them out as a two-part chip.
    //
    // The split-timer behavior: the main `ae-timer` always shows the BASE
    // portion of the bonus counting down. The gear-extra badge's delta
    // becomes a live counter for the gear extension, ticking AFTER the
    // base timer hits zero (since stabilizer time is appended at the end
    // of the bonus, not stacked on top). Hull (shark) reduces total
    // duration instead of extending it, so its delta stays static.
    let extraName = "";
    let extraDelta = "";
    let extraCls = "";
    let mainTimerSec = remaining;
    const baseSec = ((bonus && bonus.duration) || 15000) / 1000;
    if (r.tier === "shark") {
      const hullLvl = gearLevel("hull");
      if (hullLvl > 0) {
        const actualMult = Math.max(0.2, 1 - 0.08 * hullLvl);
        const reducedSec = Math.max(1, Math.round(baseSec * (1 - actualMult)));
        extraName = `Hull Lvl. ${hullLvl}`;
        extraDelta = `−${reducedSec}s`;
        extraCls = "ae-extra-hull";
      }
    } else if (r.tier === "minor" || r.tier === "major" || r.tier === "mini") {
      // Stabilizer extends every positive bonus — Mermaid's Kiss, Treasure
      // Map, Lucky Current, AND Chest Frenzy all use the gear-extended
      // duration in applySlotBonus / startChestFrenzy, so the badge fires
      // on every mini/minor/major sub-row.
      const stabLvl = gearLevel("stabilizer");
      if (stabLvl > 0) {
        const addedSec = Math.max(1, Math.round(baseSec * 0.10 * stabLvl));
        extraName = `Stabilizer Lvl. ${stabLvl}`;
        extraCls = "ae-extra-stab";
        // Split: gear runs LAST, so it counts down only after the base
        // chunk has elapsed. Until then, the gear badge sits at +addedSec.
        const gearRemaining = Math.min(addedSec, remaining);
        mainTimerSec = Math.max(0, remaining - addedSec);
        extraDelta = `+${gearRemaining}s`;
      }
    }

    const name = (bonus && bonus.name) || r.tier;
    const icon = (bonus && bonus.icon) || "✨";
    const fullDesc = (bonus && bonus.desc) || "";
    const row = document.createElement("div");
    row.className = `active-effect ${r.cls}`;
    row.title = `${name}\n\n${fullDesc}`;
    const extraHtml = extraName
      ? `<div class="ae-extra ${extraCls}">` +
          `<span class="ae-extra-name">${escapeHtml(extraName)}</span>` +
          `<span class="ae-extra-delta">${escapeHtml(extraDelta)}</span>` +
        `</div>`
      : "";
    if (extraName) row.classList.add("has-extra");
    row.innerHTML =
      `<div class="ae-main">` +
        `<span class="ae-label">${icon} ${escapeHtml(name.toUpperCase())} — ${escapeHtml(shortDesc)}</span>` +
        `<span class="ae-timer">${mainTimerSec}s</span>` +
      `</div>` +
      extraHtml;
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
    m.textContent = `${Math.floor((maxDepth * i) / steps)} ft`;
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
    if (window.brickedUpSfx) window.brickedUpSfx.boost();
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
    state.sub.mode === "descending" ? "Lowering"
    : state.sub.mode === "ascending" ? "Hoisting"
    : "Up Top";
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
    if (ASCENSION && ASCENSION.enabled) {
      // Biome is rank-locked, not level-locked — surface the trigger,
      // the ascension number, AND the level required. "FINAL ASCENT"
      // ONLY fires on the run whose cap IS the maxLevel (Lv 100) AND
      // we're within 10 levels of it — i.e., literally the final climb
      // to Lv 100, not every approach to a sub-cap.
      const nextAscNum = (state.prestigeCount || 0) + 1;
      const reqLvl     = nextTierLevel();
      const maxLvl     = (ASCENSION.maxLevel || 0);
      const remaining  = Math.max(0, reqLvl - state.level);
      // The "last ascension" is the single climb that crosses from a
      // sub-cap rank-gate to the maxLevel ceiling — after it, every
      // future ascension just sits at maxLevel forever.
      const isLastClimb = maxLvl > 0
        && reqLvl === maxLvl
        && tierLevelRequired(currentTier()) < maxLvl;
      const isFinalRun  = maxLvl > 0 && reqLvl === maxLvl;
      if (isFinalRun && remaining > 0 && remaining <= 10) {
        nb.innerHTML = `<span class="final-ascent-callout">🩸 FINAL ASCENT</span> · ${remaining} more level${remaining === 1 ? "" : "s"}`;
      } else if (isLastClimb) {
        nb.innerHTML = nextBiome
          ? `<span class="final-ascent-callout">🩸 LAST ASCENSION</span> · <strong>${nextBiome.name}</strong> @ Lv ${reqLvl}`
          : `<span class="final-ascent-callout">🩸 LAST ASCENSION</span> @ Lv ${reqLvl}`;
      } else {
        nb.innerHTML = nextBiome
          ? `Next: <strong>${nextBiome.name}</strong> at ascension #${nextAscNum} (Lv ${reqLvl})`
          : `Deepest realm reached`;
      }
    } else {
      const nextLevel = nextIdx * LEVELS_PER_BIOME;
      nb.innerHTML = nextBiome
        ? `Next: <strong>${nextBiome.name}</strong> @ Lv ${nextLevel}`
        : `Deepest biome reached`;
    }
  }

  // XP progress bar to next level.
  const cumPrev = levelCostCumulative(state.level);
  const cumNext = levelCostCumulative(state.level + 1);
  const progressed = Math.max(0, state.xp - cumPrev);
  const needed = Math.max(1, cumNext - cumPrev);
  // Ascension: hard cap at the next-rank threshold (escalating Lv 20/30/...).
  // Bar fills + greys + reads "Ascend to continue" until the player ascends.
  const ascensionCap = (ASCENSION && ASCENSION.enabled) ? nextTierLevel() : 0;
  const atAscensionCap = ascensionCap > 0 && state.level >= ascensionCap;
  const bar = $("levelBar");
  if (atAscensionCap) {
    $("levelMoney").textContent = "MAX";
    $("levelMoneyMax").textContent = "Ascend to continue";
    if (bar) {
      bar.style.width = "100%";
      bar.classList.add("level-bar-capped");
    }
  } else {
    $("levelMoney").textContent = fmt(Math.min(progressed, needed));
    $("levelMoneyMax").textContent = fmt(needed);
    if (bar) {
      bar.style.width = `${Math.min(100, (progressed / needed) * 100)}%`;
      bar.classList.remove("level-bar-capped");
    }
  }

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

// Big screen-center countdown flash — fires at 60s/30s/10..1s before
// event end. Each trigger is fire-once-only via _countdownFired set.
const _countdownFired = new Set();
function showCountdownFlash(text, big) {
  const ocean = document.getElementById("ocean") || document.body;
  if (!ocean) return;
  const el = document.createElement("div");
  el.className = "event-countdown-flash" + (big ? " big" : "");
  el.textContent = text;
  ocean.appendChild(el);
  setTimeout(() => el.remove(), big ? 2200 : 950);
  if (window.brickedUpSfx && window.brickedUpSfx.bonus) {
    try { window.brickedUpSfx.bonus(big ? "jackpot" : "shark"); } catch (e) {}
  }
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
  const totalSecLeft = Math.ceil(remaining / 1000);

  // Final-minute countdown flashes — 60s, 30s, then 10..1.
  if (totalSecLeft === 60 && !_countdownFired.has(60)) {
    _countdownFired.add(60);
    showCountdownFlash("⚠ 1 MINUTE LEFT", true);
  } else if (totalSecLeft === 30 && !_countdownFired.has(30)) {
    _countdownFired.add(30);
    showCountdownFlash("⚠ 30 SECONDS LEFT", true);
  } else if (totalSecLeft <= 10 && totalSecLeft >= 1 && !_countdownFired.has(totalSecLeft)) {
    _countdownFired.add(totalSecLeft);
    showCountdownFlash(String(totalSecLeft), false);
  }

  const days  = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins  = Math.floor((remaining % 3600000) / 60000);
  const secs  = Math.floor((remaining % 60000) / 1000);
  let txt;
  if (days > 0)        txt = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0)  txt = `${hours}h ${mins}m ${secs}s`;
  else                 txt = `${mins}m ${secs}s`;
  // EVENT.endLabel lets themed configs paint the absolute cutoff time
  // alongside the countdown (e.g., "9 PM CDT"). Optional.
  const endLabel = (EVENT && EVENT.endLabel) ? ` · ends ${EVENT.endLabel}` : "";
  el.textContent = `🌸 ${EVENT_NAME || "Event"} — ends in ${txt}${endLabel}`;
}

// "WHO'S THE MOST BRICKED?" — end-of-event report. Shows the final
// blueprint leaderboard with the player's row highlighted, plus a
// breakdown of metrics they did well at and "sucked at" (the user
// requested that exact word). Once dismissed, a localStorage flag
// prevents it from popping up again on every reload.
const BRICKED_REPORT_KEY_PREFIX = "brickedReportSeen_";

// Metric labels for the did-well/sucked-at narrative. Keys must match
// columns in the Supabase scores table (same as LB_METRICS ids).
const BRICKED_METRIC_LABELS = {
  pearls:         "Banking blueprints",
  jackpots:       "Hitting GET BRICKED",
  chests:         "Collecting crates",
  total_dives:    "Hauling drops",
  gear_upgrades:  "Buying gear",
  level:          "Leveling up",
  total_earned:   "Earning cash",
  time_played_ms: "Playing time",
};

// Fetch top 50 of each metric in parallel. Returns a map metric → rows[].
// On any single fetch failure, that metric just isn't included in the
// did-well/sucked-at calc — partial reports are still useful.
async function fetchBrickedReportData() {
  const metrics = Object.keys(BRICKED_METRIC_LABELS);
  const settled = await Promise.allSettled(metrics.map(m => leaderboardFetch(m, 50)));
  const out = {};
  metrics.forEach((m, i) => {
    if (settled[i].status === "fulfilled") out[m] = settled[i].value || [];
  });
  return out;
}

// Find the player's 1-indexed rank in a leaderboard row list. Returns 0
// if not present (treated as "off the board" in the narrative).
function playerRankIn(rows, playerId) {
  if (!rows) return 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].player_id === playerId) return i + 1;
  }
  return 0;
}

// Translate "rank N out of fetched" into a percentile (1.0 = best).
// Off-the-board players get 0.0.
function rankToPercentile(rank, totalFetched) {
  if (!rank || !totalFetched) return 0;
  return 1 - ((rank - 1) / totalFetched);
}

function showEventEndedOverlay() {
  if (document.getElementById("eventEndedOverlay")) return;
  // Don't pop up again if the player already dismissed it this event.
  const seenKey = BRICKED_REPORT_KEY_PREFIX + (EVENT_KEY || "default");
  let seen = false;
  try { seen = !!localStorage.getItem(seenKey); } catch (e) {}
  if (seen) return;

  const ov = document.createElement("div");
  ov.id = "eventEndedOverlay";
  ov.className = "bricked-report-overlay";
  ov.innerHTML = `
    <div class="bricked-report-card">
      <button class="bricked-report-close" type="button" aria-label="Close">×</button>
      <div class="bricked-report-title">WHO'S THE MOST BRICKED?</div>
      <div class="bricked-report-sub">${escapeHtml(EVENT_NAME || "Event")} · final standings</div>
      <div class="bricked-report-body">
        <div class="bricked-report-loading">Tallying the wreckage…</div>
      </div>
      <div class="bricked-report-footer">
        <button class="bricked-report-btn" type="button" data-action="dismiss">Got it</button>
        <a class="bricked-report-link" href="index.html?splash=1">🎮 All Games</a>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  function dismiss() {
    try { localStorage.setItem(seenKey, "1"); } catch (e) {}
    ov.remove();
  }
  ov.querySelector(".bricked-report-close").addEventListener("click", dismiss);
  ov.querySelector('[data-action="dismiss"]').addEventListener("click", dismiss);
  ov.addEventListener("click", (ev) => { if (ev.target === ov) dismiss(); });

  // Async render — fetch leaderboards, compute ranks, paint the report.
  (async () => {
    const body = ov.querySelector(".bricked-report-body");
    const playerId = ensurePlayerId();
    const playerName = ((state.displayName || "").trim().slice(0, 32)) || "Anon";
    let data;
    try { data = await fetchBrickedReportData(); }
    catch (e) { data = {}; }

    const pearlsRows = data.pearls || [];
    const top10 = pearlsRows.slice(0, 10);
    const playerRank = playerRankIn(pearlsRows, playerId);
    const playerInTop10 = playerRank > 0 && playerRank <= 10;

    // Build rank/percentile per metric so we can pick winners + losers.
    const metricRanks = Object.keys(BRICKED_METRIC_LABELS).map(m => {
      const rows = data[m] || [];
      const rank = playerRankIn(rows, playerId);
      const pct  = rankToPercentile(rank, rows.length);
      return { metric: m, label: BRICKED_METRIC_LABELS[m], rank, pct, total: rows.length };
    });
    // Player has data only on metrics they actually appeared on.
    const playerOnBoard = metricRanks.some(r => r.rank > 0);
    const ranked   = metricRanks.filter(r => r.rank > 0);
    const didWell  = ranked.slice().sort((a, b) => b.pct - a.pct).slice(0, 2);
    const didWellKeys = new Set(didWell.map(r => r.metric));
    // Exclude metrics already in "did well" so a thin board doesn't say
    // you both nailed AND sucked at the same thing.
    const suckedAt = ranked
      .filter(r => !didWellKeys.has(r.metric))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 2);

    // Build leaderboard table rows. Player's row gets a highlight class.
    const lbRows = top10.map((row, i) => {
      const isPlayer = row.player_id === playerId;
      const name = escapeHtml((row.display_name || "Anon").slice(0, 24));
      return `
        <div class="bricked-lb-row${isPlayer ? " is-player" : ""}">
          <span class="bricked-lb-rank">#${i + 1}</span>
          <span class="bricked-lb-name">${name}</span>
          <span class="bricked-lb-score">${fmt(row.pearls || 0)} 📐</span>
        </div>`;
    }).join("");

    // Render the player's own rank line (if past top 10 and they're on the board).
    const playerLine = playerOnBoard
      ? (playerInTop10
          ? ""
          : `<div class="bricked-lb-row is-player off-board">
               <span class="bricked-lb-rank">#${playerRank}</span>
               <span class="bricked-lb-name">${escapeHtml(playerName)} (you)</span>
               <span class="bricked-lb-score">${fmt(state.pearls || 0)} 📐</span>
             </div>`)
      : `<div class="bricked-lb-row off-board muted">
           Set a name + Sync in the Leaderboard panel to land on the next event's board.
         </div>`;

    function metricLine(m) {
      // "Banking blueprints — #3 (top 6%)" — clean human-readable.
      const pctText = m.pct >= 0.9 ? "top 10%"
                    : m.pct >= 0.75 ? "top 25%"
                    : m.pct >= 0.5  ? "top half"
                    : m.pct >= 0.25 ? "bottom half"
                    : "bottom 25%";
      return `<li><strong>${escapeHtml(m.label)}</strong> — #${m.rank} (${pctText})</li>`;
    }

    const didWellHtml = didWell.length
      ? `<div class="bricked-report-section did-well">
           <div class="bricked-section-head">🌟 What you did well at</div>
           <ul>${didWell.map(metricLine).join("")}</ul>
         </div>`
      : "";

    const suckedHtml = suckedAt.length
      ? `<div class="bricked-report-section sucked-at">
           <div class="bricked-section-head">💀 What you sucked at</div>
           <ul>${suckedAt.map(metricLine).join("")}</ul>
         </div>`
      : "";

    body.innerHTML = `
      <div class="bricked-lb-block">
        <div class="bricked-section-head">🏗 Top 10 Bricked</div>
        <div class="bricked-lb-list">
          ${lbRows || `<div class="bricked-lb-row off-board muted">No scores recorded.</div>`}
          ${playerLine}
        </div>
      </div>
      ${didWellHtml}
      ${suckedHtml}
    `;
  })();
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
// Default metrics — themed builds can append/override via EVENT.lbMetrics.
// Each metric: { id (column), label, fmt, dir? "asc"|"desc" (default desc) }.
const LB_METRICS_DEFAULT = [
  { id: "total_earned",   label: "Cash",       fmt: (n) => "$" + fmt(Number(n) || 0) },
  { id: "level",          label: "Level",      fmt: (n) => "Lv " + n },
  { id: "prestige_count", label: "Promotes",   fmt: (n) => String(n) },
  { id: "jackpots",       label: "Brickings",  fmt: (n) => String(n) },
  { id: "pearls",         label: "Blueprints", fmt: (n) => fmt(Number(n) || 0) + " " + PEARL_EMOJI },
  { id: "gear_upgrades",  label: "Gear",       fmt: (n) => fmt(Number(n) || 0) + " 🛠" },
  { id: "total_dives",    label: "Drops",      fmt: (n) => fmt(Number(n) || 0) },
  { id: "time_played_ms", label: "Time",       fmt: (n) => fmtDuration(Number(n) || 0) },
];
const LB_METRICS = (function () {
  const cfg = EVENT && EVENT.lbMetrics;
  if (!cfg) return LB_METRICS_DEFAULT;
  // Resolve each entry: shorthand string IDs use defaults; objects carry
  // overrides. Themed builds can supply a `fmt` key by name (e.g.
  // "duration") because we can't pass functions through JSON-y configs.
  const fmtRegistry = {
    cash:     (n) => "$" + fmt(Number(n) || 0),
    level:    (n) => "Lv " + n,
    plain:    (n) => String(n),
    big:      (n) => fmt(Number(n) || 0),
    duration: (n) => fmtDuration(Number(n) || 0),
    // Ascension Multiplier: pearls count → ×N.NN compounding multiplier.
    multiplier: (n) => "×" + fmt(Math.pow(1.5, Number(n) || 0)),
  };
  return cfg.map(entry => {
    if (typeof entry === "string") {
      return LB_METRICS_DEFAULT.find(m => m.id === entry) || { id: entry, label: entry, fmt: (n) => String(n) };
    }
    return {
      id: entry.id,
      label: entry.label || entry.id,
      fmt:   typeof entry.fmt === "function" ? entry.fmt : (fmtRegistry[entry.fmt] || ((n) => String(n))),
      dir:   entry.dir || "desc",
    };
  });
})();
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

// Pearls / cash / time-played columns are `numeric` (arbitrary precision) in
// Postgres. Above Number.MAX_SAFE_INTEGER (~9e15) JS loses unit-level integer
// precision and JSON.stringify will emit scientific notation past ~1e21,
// which PostgREST rejects for numeric columns. Send those values as plain
// integer strings via BigInt to preserve as much precision as the JS Number
// had, and avoid the sci-notation issue entirely.
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
    gear_upgrades: totalGearUpgrades(),
    // Personal best — only set when player completes the run.
    // Themed ascension build writes to state.fastestRunMs on Lv-cap hit.
    fastest_run_ms: state.fastestRunMs || null,
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
  // Resolve sort direction from the metric def (default desc — bigger is
  // better). "Fastest time" needs ascending so the smallest non-null
  // value wins; we also drop nulls server-side via not.is.null.
  const def = LB_METRICS.find(m => m.id === metric);
  const dir = (def && def.dir === "asc") ? "asc.nullslast" : "desc.nullslast";
  let url = `${SUPABASE_URL}/rest/v1/scores?select=display_name,player_id,${metric}`;
  if (EVENT_KEY) url += `&event_key=eq.${encodeURIComponent(EVENT_KEY)}`;
  url += `&${metric}=not.is.null&order=${metric}.${dir}&limit=${limit}`;
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
  // Drop the local save so the next session (anonymous or another account)
  // can't inherit this account's progress. Without this, syncCloudSaveOnBoot
  // sees a fresh user with no cloud row and pushes the leftover local state
  // up under the new identity. Keep the login-skip + panel preferences
  // around — they're per-device, not per-account.
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  try { localStorage.removeItem(_LOGIN_SKIP_KEY); } catch {}
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

// Gear modal
const gearOverlay = $("gearOverlay");
function openGear() {
  if (!gearOverlay) return;
  refreshGearUI();
  const welcome = $("gearWelcome");
  if (welcome) welcome.hidden = !!state.gearIntroSeen;
  gearOverlay.hidden = false;
}
function closeGear() {
  if (!gearOverlay) return;
  gearOverlay.hidden = true;
  // First close also marks the welcome blurb as seen so it doesn't reappear.
  if (!state.gearIntroSeen) {
    state.gearIntroSeen = true;
    save();
  }
}
$("gearBtn")?.addEventListener("click", openGear);
$("gearClose")?.addEventListener("click", closeGear);
gearOverlay?.addEventListener("click", (ev) => {
  if (ev.target === gearOverlay) closeGear();
});

// Talent Vault modal — embeds expand/index.html in an iframe so the
// player can spend coins without leaving the run.
const talentOverlay = $("talentOverlay");
const talentFrame = $("talentFrame");
function openTalentVault() {
  if (!talentOverlay || !talentFrame) return;
  // Lazy-load the iframe each open with a cache buster so the coin
  // balance is always fresh. ?embed=1 tells the vault to hide its own
  // header/back-button since it's running inside the modal.
  // Explicit filename — file:// protocol doesn't auto-resolve directory → index.html.
  talentFrame.src = "./expand/index.html?embed=1&t=" + Date.now();
  talentOverlay.hidden = false;
}
function closeTalentVault() {
  if (!talentOverlay) return;
  talentOverlay.hidden = true;
  // Drop the iframe src on close so the next open starts fresh and the
  // engine's talent cache picks up any newly bound ranks immediately.
  if (talentFrame) talentFrame.src = "about:blank";
  __talentRanksCache = null;
}
$("vaultBtn")?.addEventListener("click", openTalentVault);
$("talentClose")?.addEventListener("click", closeTalentVault);
talentOverlay?.addEventListener("click", (ev) => {
  if (ev.target === talentOverlay) closeTalentVault();
});
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && talentOverlay && !talentOverlay.hidden) closeTalentVault();
});
$("gearList")?.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button.gear-buy");
  if (!btn || btn.disabled) return;
  buyGear(btn.dataset.id);
});
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && gearOverlay && !gearOverlay.hidden) closeGear();
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
    log(`🏗 Now bricking ${BIOMES[newBiomeIdx].name}!`, "good");
  }
  checkAchievements();
  refreshUI();
});
// +1 Lv testing handler — same shape as +10 button, mirrors biome-change
// log so milestone biomes still announce themselves.
$("adminLvl1Btn")?.addEventListener("click", () => {
  const prevBiomeIdx = biomeIndex(state.level);
  state.level += 1;
  state.xp = Math.max(state.xp, levelCostCumulative(state.level));
  const newBiomeIdx = biomeIndex(state.level);
  log(`[admin] Now Lv ${state.level}.`);
  if (newBiomeIdx !== prevBiomeIdx) {
    log(`🏗 Now bricking ${BIOMES[newBiomeIdx].name}!`, "good");
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
// Themed builds can override which panels are open on first load via
// EVENT.defaultOpenPanels. Default (Bricked Up) keeps four panels open.
const PANEL_DEFAULT_OPEN = new Set(
  (EVENT && Array.isArray(EVENT.defaultOpenPanels))
    ? EVENT.defaultOpenPanels
    : ["submersible", "ondeck", "lastrun", "outfitting"]
);

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
refreshSubGear();
injectEventCountdown();
wireEventWelcome();
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

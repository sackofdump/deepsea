const fs = require('fs');

// Test game.js extension via simulated globals
const src = fs.readFileSync('C:/bgame/game.js', 'utf8');
const start = src.indexOf('"End of Time": [');
const endOfStatic = src.indexOf('};', start);
const beforeExtension = src.indexOf('// ----- Extended biomes', endOfStatic);
const afterExtension = src.indexOf('// Reveal popup', beforeExtension);
console.log('extension block range:', beforeExtension, '->', afterExtension);

// Run the IIFE in isolation
const BIOMES = [];
const LOOT = {};
const CREATURES_PER_BIOME = {};
const block = src.slice(beforeExtension, afterExtension);
eval(block);
console.log('extra biomes added:', BIOMES.length);
console.log('first new biome:', BIOMES[0].name, '@ base', LOOT[BIOMES[0].name][0].value);
console.log('last new biome:', BIOMES[BIOMES.length-1].name, '@ base', LOOT[BIOMES[BIOMES.length-1].name][0].value);
console.log('last legend value:', LOOT[BIOMES[BIOMES.length-1].name][4].value);
console.log('within MAX_SAFE_INTEGER:', LOOT[BIOMES[BIOMES.length-1].name][4].value < Number.MAX_SAFE_INTEGER);

// Test event.html extension
const html = fs.readFileSync('C:/bgame/event.html', 'utf8');
const m = html.match(/window\.EVENT_CONFIG\s*=\s*([\s\S]*?);\s*\n\n\/\/ Extended Spring biomes/);
const cfg = eval('(' + m[1] + ')');
console.log('\nspring base config (before extension):', cfg.biomes.length, 'biomes');

// Now run the IIFE
const ext = html.match(/\/\/ Extended Spring biomes[\s\S]*?\n}\)\(\);/)[0];
window = { EVENT_CONFIG: cfg };
eval(ext);
console.log('spring after extension:', cfg.biomes.length, 'biomes');
console.log('spring last biome:', cfg.biomes[cfg.biomes.length-1].name);
console.log('spring last legend value:', cfg.loot[cfg.biomes[cfg.biomes.length-1].name][4].value);
console.log('all loot keys aligned:', cfg.biomes.every(b => cfg.loot[b.name] && cfg.creatures[b.name]));

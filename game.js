(() => {
  'use strict';

  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const WORLD = { width: 2400, height: 1600 };
  const WEAPON_ATTACK_COOLDOWN = .38;
  const player = { x: 1190, y: 795, radius: 13, speed: 220, speedRating: 6, speedBonus: 0, health: 100, hunger: 100, coins: 0, level: 1, rebirths: 0, strikeStrength: 1, xp: 0, facing: 0, attack: 0, attackCooldown: 0, energyBoost: 0, damageBoost: 0, luckBoost: 0, name: `Slayer${Math.floor(10 + Math.random() * 89)}` };
  const keys = new Set();
  const inventory = Array(18).fill(null);
  const hotbar = Array(9).fill(null);
  const inventoryPanel = document.getElementById('inventory-panel');
  const gear = [
    { id: 'knife', name: 'Knife', glyph: '†', kind: 'weapon', count: 1, damage: 25, attackCooldown: .5, maxStack: 32, worth: 1, rarity: 'Common', isMelee: true, dropability: 'Anywhere', description: 'A common melee weapon. Base damage 25 with a 500 ms use cooldown.', altarDroppable: true },
    { id: 'slingshot', name: 'Trail slingshot', glyph: '⌁', kind: 'weapon', count: 1, damage: 12 },
    { id: 'medkit', name: 'Med Kit', glyph: '✚', kind: 'consumable', count: 1, maxStack: 32, worth: 3, health: 20, description: 'Restores 20 health when used.', altarDroppable: true },
  ];
  hotbar.splice(0, gear.length, ...gear);
  let selectedSlot = 0;
  let camera = { x: 0, y: 0 };
  let lastTime = performance.now();
  let toastTimer = 0;
  let networkId = null;
  let remotePlayers = [];
  let netInterval = null;
  let chatSince = 0;
  let chatItems = [];
  let altar = { offeringWorth: 0, countdown: 0, summon: 0, fight: 0, boss: null, tier: null, loot: 0 };
  let pendingStation = null;
  let altarDoorCloseTimer = 0;
  let paused = false;

  const BEDCHAMBER = { x: 1190, y: 795 };
  const TREASURE_ROOM = { x: 32, y: 142, w: 500, h: 338 };
  const zones = [
    { x: 0, y: 0, w: 800, h: 570, name: 'WESTERN GROVE', floor: '#3c4840' },
    { x: 800, y: 0, w: 810, h: 570, name: 'FROG MARSH', floor: '#465944' },
    { x: 1610, y: 0, w: 790, h: 570, name: 'CROSSROADS', floor: '#4c5040' },
    { x: 0, y: 570, w: 800, h: 490, name: 'ALTAR COURT', floor: '#49443a' },
    { x: 800, y: 570, w: 810, h: 490, name: 'BEDCHAMBER', floor: '#4d5141' },
    { x: 1610, y: 570, w: 790, h: 490, name: 'MUDFIELDS', floor: '#514a3d' },
    { x: 0, y: 1060, w: 800, h: 540, name: 'SOUTHERN GROVE', floor: '#3c4840' },
    { x: 800, y: 1060, w: 810, h: 540, name: 'WOLFWOOD', floor: '#364a3d' },
    { x: 1610, y: 1060, w: 790, h: 540, name: 'WOLFWOOD', floor: '#364a3d' },
  ];
  const crossroadsMerchants = [
    { id: 'cowboy', name: 'Cowboy', x: 1858, y: 160, color: '#bd8650', hat: '#59402c', bounds: { x: 1640, y: 55, w: 290, h: 485 } },
    { id: 'wizard', name: 'Wizard', x: 2188, y: 160, color: '#9978c9', hat: '#563b86', bounds: { x: 1970, y: 55, w: 290, h: 485 } },
  ];
  const crossroadsShopCounters = crossroadsMerchants.map(merchant => [
    { x: merchant.bounds.x + 42, y: merchant.bounds.y + 52, w: 34, h: 112 },
    { x: merchant.bounds.x + 42, y: merchant.bounds.y + 130, w: 142, h: 34 },
  ]).flat();
  const crossroadsShopWalls = crossroadsMerchants.flatMap(merchant => {
    const { x, y, w, h } = merchant.bounds;
    const doorWidth = 60;
    const doorLeft = x + (w - doorWidth) / 2;
    return [
      { x, y, w, h: 14 },
      { x, y, w: 14, h },
      { x: x + w - 14, y, w: 14, h },
      { x, y: y + h - 14, w: doorLeft - x, h: 14 },
      { x: doorLeft + doorWidth, y: y + h - 14, w: x + w - doorLeft - doorWidth, h: 14 },
    ];
  });
  const crossroadsShopFixtures = [
    { x: 1670, y: 115, w: 36, h: 32, type: 'barrel' },
    { x: 1670, y: 292, w: 38, h: 34, type: 'crate' },
    { x: 1670, y: 410, w: 36, h: 32, type: 'barrel' },
    { x: 1820, y: 410, w: 36, h: 34, type: 'crate' },
    { x: 2000, y: 110, w: 38, h: 34, type: 'crate' },
    { x: 2230, y: 240, w: 36, h: 32, type: 'barrel' },
    { x: 2000, y: 330, w: 36, h: 34, type: 'crate' },
    { x: 2230, y: 330, w: 36, h: 34, type: 'crate' },
  ];
  const altarDoor = { x: 786, y: 770, w: 14, h: 74, open: false };
  const explorerDoor = { x: 620, y: 396, w: 60, h: 14, open: false };
  const altarWalls = [
    { x: 0, y: 570, w: 800, h: 14 },
    { x: 0, y: 1046, w: 800, h: 14 },
    { x: 0, y: 570, w: 14, h: 490 },
    { x: 786, y: 570, w: 14, h: 200 },
    { x: 786, y: 844, w: 14, h: 216 },
  ];
  const bedchamberWalls = [
    { x: 1080, y: 650, w: 230, h: 14 },
    { x: 1080, y: 650, w: 14, h: 230 },
    { x: 1296, y: 650, w: 14, h: 230 },
    { x: 1080, y: 866, w: 70, h: 14 },
    { x: 1230, y: 866, w: 80, h: 14 },
  ];
  const explorerShopBounds = { x: 540, y: 90, w: 220, h: 320 };
  const explorerShopCounters = [
    { x: 650, y: 132, w: 34, h: 100 },
    { x: 650, y: 198, w: 96, h: 34 },
  ];
  const explorerShopWalls = [
    { x: 540, y: 90, w: 220, h: 14 },
    { x: 540, y: 90, w: 14, h: 320 },
    { x: 746, y: 90, w: 14, h: 320 },
    { x: 540, y: 396, w: 80, h: 14 },
    { x: 680, y: 396, w: 80, h: 14 },
  ];
  const groveStations = [
    { id: 'ancient-anvil', name: 'Ancient Anvil', x: 125, y: 235, color: '#84a7ad', icon: 'anvil' },
    { id: 'blast-furnace', name: 'Blast Furnace', x: 300, y: 235, color: '#d5634d', icon: 'furnace' },
    { id: 'level-pedestal', name: 'Level Pedestal', x: 465, y: 235, color: '#d5ae53', icon: 'level' },
    { id: 'item-pedestal', name: 'Item Pedestal', x: 300, y: 405, color: '#9276bd', icon: 'item' },
    { id: 'gambling-pedestal', name: 'Gambling Pedestal', x: 465, y: 405, color: '#c59b55', icon: 'gambling' },
  ];
  const explorerShopRecipes = [
    { name: 'Fur Helmet', output: 'fur-helmet', glyph: '♜', count: 1, costs: { 'wolf-fur': 5 } },
    { name: 'Leather Helmet', output: 'leather-helmet', glyph: '♜', count: 1, costs: { 'frog-leather': 8 } },
    { name: 'Wolf Helmet', output: 'wolf-helmet', glyph: '♜', count: 1, kind: 'wearable', costs: { 'wolf-fur': 8 } },
    { name: 'Bone Mace', output: 'bone-mace', glyph: '⚒', count: 1, kind: 'equipment', costs: { bone: 3 } },
    { name: 'Bone Bow', output: 'bone-bow', glyph: '⌁', count: 1, kind: 'equipment', costs: { bone: 3 } },
    { name: 'Energy Drink ×16', output: 'energy-drink', glyph: '▰', count: 16, kind: 'consumable', costs: { 'wolf-fur': 1, bone: 2 } },
    { name: 'Frog Helmet', output: 'frog-helmet', glyph: '♜', count: 1, kind: 'wearable', costs: { 'frog-leather': 12 } },
    { name: 'Med Kit ×32', output: 'medkit', glyph: '✚', count: 32, kind: 'consumable', costs: { bone: 5, 'pig-leather': 3 } },
    { name: 'Pig Helmet', output: 'pig-helmet', glyph: '♜', count: 1, kind: 'wearable', costs: { 'pig-leather': 12 } },
    { name: 'Bone Helmet', output: 'bone-helmet', glyph: '♜', count: 1, kind: 'wearable', coins: 125, costs: { bone: 12 } },
    { name: 'Pig Totem', output: 'pig-totem', glyph: '◇', count: 1, kind: 'wearable', costs: { 'pig-leather': 24 } },
    { name: 'Wolf Totem', output: 'wolf-totem', glyph: '◇', count: 1, kind: 'wearable', costs: { 'wolf-fur': 16 } },
    { name: 'Frog Totem', output: 'frog-totem', glyph: '◇', count: 1, kind: 'wearable', costs: { 'frog-leather': 24 } },
    { name: 'Bloody Spine', output: 'bloody-spine', glyph: '⌁', count: 1, kind: 'equipment', coins: 125, costs: { bone: 4, meat: 4 } },
    { name: 'Bone Spear', output: 'bone-spear', glyph: '↗', count: 1, kind: 'equipment', coins: 125, costs: { bone: 12 } },
    { name: 'Beginner Emblem', output: 'beginner-emblem', glyph: '✦', count: 1, kind: 'wearable', coins: 125, costs: { 'frog-leather': 24, copper: 4 } },
    { name: 'Copper Shield', output: 'copper-shield', glyph: '⬟', count: 1, kind: 'wearable', coins: 125, costs: { copper: 4 } },
  ];
  const cowboyShopRecipes = [
    { name: 'Common Shovel', output: 'common-shovel', glyph: '⚒', kind: 'tool', rarity: 'Common', count: 1, coins: 125, costs: {} },
    { name: 'Uncommon Shovel', output: 'uncommon-shovel', glyph: '⚒', kind: 'tool', rarity: 'Uncommon', count: 1, coins: 250, costs: {} },
    { name: 'Rare Shovel', output: 'rare-shovel', glyph: '⚒', kind: 'tool', rarity: 'Rare', count: 1, coins: 500, costs: {} },
    { name: 'Epic Shovel', output: 'epic-shovel', glyph: '⚒', kind: 'weapon', rarity: 'Epic', count: 1, coins: 1000, costs: {} },
    { name: 'Legendary Shovel', output: 'legendary-shovel', glyph: '⚒', kind: 'weapon', rarity: 'Legendary', count: 1, coins: 2000, costs: {} },
    { name: 'Mythic Shovel', output: 'mythic-shovel', glyph: '⚒', kind: 'tool', rarity: 'Mythic', count: 1, coins: 4000, costs: {} },
  ];
  const wizardShopRecipes = [
    { name: 'Gold Helmet', output: 'gold-helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', count: 1, coins: 2500, costs: { 'battle-helmet': 1 } },
    { name: 'Gold Sword', output: 'gold-sword', glyph: '⚔', kind: 'equipment', count: 1, coins: 2500, costs: { 'battle-mace': 1 } },
    { name: 'Gold Shield', output: 'gold-shield', glyph: '⬟', kind: 'wearable', equipSlot: 'offhand', count: 1, coins: 2500, costs: { 'rage-potion': 5 } },
    { name: 'Gold Bow', output: 'gold-bow', glyph: '⌁', kind: 'equipment', count: 1, coins: 2500, costs: { 'battle-bow': 1 } },
    { name: 'Mythic Potion', output: 'mythic-potion', glyph: '⚗', kind: 'item', count: 1, coins: 2500, costs: { 'growth-potion': 5, 'rage-potion': 5 } },
  ];
  const shopMaterialNames = {
    'wolf-fur': 'Wolf Fur',
    'frog-leather': 'Frog Leather',
    'pig-leather': 'Pig Leather',
    bone: 'Bone',
    meat: 'Meat',
    copper: 'Copper',
    'battle-helmet': 'Battle Helmet',
    'battle-mace': 'Battle Mace',
    'battle-bow': 'Battle Bow',
    'rage-potion': 'Rage Potion',
    'growth-potion': 'Growth Potion',
  };
  const itemDefinitions = {
    knife: { name: 'Knife', glyph: '†', kind: 'weapon', damage: 25, attackCooldown: .5, maxStack: 32, worth: 1, isMelee: true, description: 'A common melee weapon. Base damage 25 with a 500 ms use cooldown.', altarDroppable: true },
    'bone-mace': { name: 'Bone Mace', glyph: '⚒', kind: 'weapon', damage: 18, maxStack: 32, worth: 1, isMelee: true, specialChance: .25, specialMultiplier: 3, description: 'A common melee weapon with a 25% chance to deal three times its regular damage. Uses the prototype melee baseline until its base damage is specified.', altarDroppable: true },
    'bone-bow': { name: 'Bone Bow', glyph: '⌁', kind: 'weapon', damage: 12, range: 250, maxStack: 32, worth: 1, isMelee: false, stunChance: .25, stunDuration: 3, description: 'A common ranged weapon with a 25% chance to stun an enemy for 3 seconds. Uses the prototype ranged baseline until its base damage is specified.', altarDroppable: true },
    'battle-helmet': { name: 'Battle Helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', maxStack: 128, worth: 48, rarity: 'Legendary', stats: { healthPercent: 125 }, description: 'A Legendary helmet that increases maximum health by 125%. Obtainable from Legendary Chests.', altarDroppable: true },
    'battle-mace': { name: 'Battle Mace', glyph: '⚒', kind: 'weapon', damage: 126, attackCooldown: .5, maxStack: 32, worth: 16, rarity: 'Legendary', isMelee: true, description: 'A Legendary melee weapon with 126 base damage and a 500 ms cooldown. Listed drops include Flying Speedster, Energy Golem, Spooky Haunter, Pentabutt, and Dragon.', altarDroppable: true },
    'battle-bow': { name: 'Battle Bow', glyph: '⌁', kind: 'weapon', damage: 252, attackCooldown: 1, range: 250, maxStack: 32, worth: 16, rarity: 'Legendary', isMelee: false, description: 'A Legendary ranged weapon with 252 base damage and a 1,000 ms cooldown. Listed drops include Flying Speedster, Energy Golem, Spooky Haunter, Pentabutt, and Dragon.', altarDroppable: true },
    'gold-skull': { name: 'Gold Skull', glyph: '💀', kind: 'material', maxStack: 64, worth: 48, rarity: 'Legendary', description: 'A Legendary Gold Misc item used to make Gold Stones in a Furnace. Obtainable from Legendary Chests.', altarDroppable: true },
    'soul-stone': { name: 'Soul Stone', glyph: '●', kind: 'material', maxStack: 64, worth: 96, rarity: 'Legendary', reviveChance: .8, description: 'A Legendary stone with an 80% revival rate. Obtainable from Legendary Chests or dropped by a Speedster.', altarDroppable: true },
    'rush-staff': { name: 'Rush Staff', glyph: 'ϟ', kind: 'weapon', damage: 12, range: 250, maxStack: 32, worth: 16, rarity: 'Legendary', isMelee: false, speedOnHitChance: .125, speedOnHit: 4, description: 'A Legendary ranged weapon with a documented 12.5% chance to increase your speed by 4; the effect is not active yet because its duration is unspecified. Uses the prototype ranged damage baseline (12) because its base damage is not specified. Listed drops include Spooky Haunter, Energy Golem, Flying Speedster, Pentabutt, and Dragon.', altarDroppable: true },
    'rage-potion': { name: 'Rage Potion', glyph: '⚗', kind: 'consumable', maxStack: 32, worth: 16, rarity: 'Legendary', damageBoost: 2.5, boostDuration: 60, description: 'Grants +2.5 damage for 1 minute.', altarDroppable: true },
    'magical-scythe': { name: 'Magical Scythe', glyph: 'ϟ', kind: 'weapon', damage: 25, attackCooldown: .5, maxStack: 32, worth: 16, rarity: 'Legendary', isMelee: true, enemyHealFraction: .5, sabotageChance: .125, description: 'A Legendary melee weapon. On a 12.5% sabotage proc, it heals the enemy for half the Scythe’s normal hit damage instead of dealing damage. Uses the prototype melee baseline (25 damage, 500 ms cooldown) because the reference does not specify its base damage. Listed drops include Spooky Haunter, Energy Golem, Flying Speedster, Pentabutt, and Dragon.', altarDroppable: true },
    'incineration-cannon': { name: 'Incineration Cannon', glyph: '◉', kind: 'weapon', damage: 84, attackCooldown: .333, range: 250, maxStack: 32, worth: 16, rarity: 'Legendary', isMelee: false, description: 'A Legendary ranged weapon that quickly fires Energy Spheres. Base damage 84, 333 ms cooldown, and 252 base DPS. Listed drops include Flying Speedster, Energy Golem, Spooky Haunter, Pentabutt, and Dragon.', altarDroppable: true },
    'growth-potion': { name: 'Growth Potion', glyph: '⚗', kind: 'consumable', maxStack: 32, worth: 16, rarity: 'Legendary', xp: 2500, description: 'A Legendary consumable that grants 2,500 experience when used. Listed drops include Dragon, Pentabutt, Flying Speedster, Energy Golem, and Spooky Haunter.', altarDroppable: true },
    'legendary-chest': { name: 'Legendary Chest', glyph: '▣', kind: 'chest', maxStack: 1, worth: 48, rarity: 'Legendary', openTime: 360, description: 'A Legendary chest that takes 360 seconds to open. Loot: 70% chance for 5–7 Gold Skulls, 20% chance for a Battle Helmet, or 10% chance for a Soul Stone. Listed sources include the Treasure Room and several Legendary bosses.', altarDroppable: true },
    'legendary-shovel': { name: 'Legendary Shovel', glyph: '⚒', kind: 'weapon', damage: 252, attackCooldown: 1, maxStack: 32, worth: 48, rarity: 'Legendary', isMelee: true, description: 'A Legendary weapon with 252 base damage and a 1,000 ms cooldown. It can find treasure in the Treasure Room.', altarDroppable: true },
    'common-shovel': { name: 'Common Shovel', glyph: '⚒', kind: 'tool', maxStack: 32, worth: 1, shopPrice: 125, isMelee: true, description: 'A common shovel sold at the Cowboy’s House. Shovel combat and chest-finding effects are not implemented.', altarDroppable: true },
    'epic-shovel': { name: 'Epic Shovel', glyph: '⚒', kind: 'weapon', damage: 168, attackCooldown: 1, maxStack: 32, worth: 24, rarity: 'Epic', isMelee: true, shopPrice: 1000, treasureFinding: true, description: 'An Epic melee weapon with 168 base damage and a 1,000 ms cooldown. It has a chance to find Chests in the Treasure Room; its chance is not specified.', altarDroppable: true },
    'ceaseless-bow': { name: 'Ceaseless Bow', glyph: '⌁', kind: 'weapon', damage: 42, attackCooldown: .25, range: 250, maxStack: 32, worth: 8, rarity: 'Epic', isMelee: false, description: 'An Epic ranged bow that fires arrows rapidly. Base damage 42, 250 ms cooldown, and 168 base DPS. Listed sources include Green Ripper, Quadhorn, Beast Lord, Dark Rover, and Demon.', altarDroppable: true },
    'recurve-bow': { name: 'Recurve Bow', glyph: '⌁', kind: 'weapon', damage: 340.14, attackCooldown: 1, range: 250, maxStack: 32, worth: 8, rarity: 'Epic', isMelee: false, description: 'An Epic ranged weapon with approximately 340.14 base DPS. The reference does not list its cooldown, so the prototype uses 340.14 damage once per second. Listed sources include Green Ripper, Quadhorn, Beast Lord, Dark Rover, and Demon.', altarDroppable: true },
    'frosty-staff': { name: 'Frosty Staff', glyph: 'ϟ', kind: 'weapon', damage: 33.6, attackCooldown: .25, range: 250, maxStack: 32, worth: 8, rarity: 'Epic', isMelee: false, frozenChance: .0625, description: 'An Epic ranged weapon that quickly fires Ice Spheres. Base damage 33.6, 250 ms cooldown, and 134.4 base DPS. It has a 6.25% chance to inflict Frozen; the debuff duration and behavior are not specified. Listed sources are not available in this prototype.', altarDroppable: true },
    'heavy-sword': { name: 'Heavy Sword', glyph: '⚔', kind: 'weapon', damage: 67.2, attackCooldown: .5, maxStack: 32, worth: 8, rarity: 'Epic', isMelee: true, specialChance: .125, specialMultiplier: 3, description: 'An Epic melee weapon with a 12.5% chance to deal triple normal damage. Base damage 67.2 and 500 ms cooldown. Listed sources include Green Ripper, Quadhorn, Beast Lord, Dark Rover, and Demon.', altarDroppable: true },
    'iron-helmet': { name: 'Iron Helmet', glyph: '♜', kind: 'wearable', maxStack: 128, worth: 24, rarity: 'Epic', stats: { healthPercent: 100 }, description: 'An Epic helmet that increases maximum health by 100%. Obtainable from Epic Chests.', altarDroppable: true },
    'luck-potion': { name: 'Luck Potion', glyph: '⚗', kind: 'consumable', maxStack: 64, worth: 8, rarity: 'Epic', luckDuration: 60, description: 'Grants 1 minute of luck, listed to increase chances in the Gambling Pedestal and farming in the Treasure Room. How it changes the fixed gambling odds is unspecified, so it does not modify those odds yet.', altarDroppable: true },
    'medieval-club': { name: 'Medieval Club', glyph: '⚒', kind: 'weapon', damage: 25, attackCooldown: .38, maxStack: 32, worth: 8, rarity: 'Epic', isMelee: true, description: 'An Epic melee weapon that only deals damage. Its damage and cooldown are not specified, so it uses the prototype melee baseline of 25 damage and 380 ms.', altarDroppable: true },
    'recovery-potion': { name: 'Recovery Potion', glyph: '⚗', kind: 'consumable', maxStack: 32, worth: 8, rarity: 'Epic', health: 250, hunger: 20, speed: 5, xp: 500, description: 'Restores 250 health and 20 hunger, grants 500 XP, and increases speed by 5 when used. Healing is capped at maximum health.' , altarDroppable: true },
    'explosive-stone': { name: 'Explosive Stone', glyph: '✦', kind: 'weapon', damage: 840, attackCooldown: 1, range: 250, maxStack: 64, worth: 48, rarity: 'Epic', isMelee: false, description: 'An Epic stone with explosive properties and 840 damage per second. The reference does not specify attack behavior, so the prototype models this as 840 ranged damage once per second. Listed sources include Speedsters, the Witch’s Shop, and Epic Chests.', altarDroppable: true },
    'epic-chest': { name: 'Epic Chest', glyph: '▣', kind: 'chest', maxStack: 1, worth: 24, rarity: 'Epic', openTime: 180, description: 'An Epic chest that takes 180 seconds to open. Loot: 70% chance for 5–7 Gold Horseshoes, 20% chance for Iron Helmet, or 10% chance for Underground Stone. Listed boss drop rates are not specified.', altarDroppable: true },
    'gold-horseshoe': { name: 'Gold Horseshoe', glyph: '⌒', kind: 'material', maxStack: 64, rarity: 'Epic', description: 'An Epic Chest reward. The reference does not specify its altar worth or other uses.', altarDroppable: true },
    'underground-stone': { name: 'Underground Stone', glyph: '⬢', kind: 'material', maxStack: 64, rarity: 'Epic', description: 'An Epic Chest reward. The reference does not specify its altar worth or other uses.', altarDroppable: true },
    'common-chest': { name: 'Common Chest', glyph: '▣', kind: 'chest', maxStack: 1, worth: 3, openTime: 20, description: 'A common loot chest. Opening takes 20 seconds. Contains 5–7 Gold Stones, 1 Fabric Helmet, and 1 Pebble Stone.', altarDroppable: true },
    'cooked-meat': { name: 'Cooked Meat', glyph: '●', kind: 'consumable', maxStack: 32, worth: 1, hunger: 25, xp: 125, description: 'Restores 25 hunger and grants 125 XP when used.', altarDroppable: true },
    'energy-drink': { name: 'Energy Drink', glyph: '▰', kind: 'consumable', maxStack: 32, worth: 1, hunger: 10, speedBoost: 2.5, boostDuration: 10, description: 'Restores 10 hunger and boosts speed by 2.5 for 10 seconds. Duration is a prototype setting because the reference does not specify one.', altarDroppable: true },
    'fabric-helmet': { name: 'Fabric Helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', maxStack: 128, worth: 3, stats: { coinBonus: 25 }, description: 'A wearable helmet that grants 25% extra gold from a magic pot.', altarDroppable: true },
    fat: { name: 'Fat', glyph: '■', kind: 'consumable', maxStack: 32, worth: 3, xp: 10000, description: 'A rare consumable dropped by pigs. Grants 10,000 XP when used.', altarDroppable: true },
    'frog-leather': { name: 'Frog Leather', glyph: '◈', kind: 'material', maxStack: 32, worth: 1, altarDroppable: true, rarity: 'Common' },
    'fur-helmet': { name: 'Fur Helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', maxStack: 128, worth: 3, stats: { healthPercent: 25 }, description: 'A wearable helmet that increases maximum health by 25%.', altarDroppable: true },
    'gold-stone': { name: 'Gold Stone', glyph: '⬟', kind: 'material', maxStack: 8192, worth: 6, rarity: 'Common', dropability: 'Only on altar', description: 'Common altar offering. It can only be offered at the altar.', altarDroppable: true },
    'leather-helmet': { name: 'Leather Helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', maxStack: 128, worth: 3, stats: { maxSpeed: 22, dodgeChance: 5 }, description: 'A wearable helmet that raises maximum speed to 22 and grants a 5% chance to dodge attacks.', altarDroppable: true },
    meat: { name: 'Meat', glyph: '◆', kind: 'consumable', maxStack: 32, worth: 1, hunger: 10, description: 'Restores 10 hunger when used.', altarDroppable: true },
    medkit: { name: 'Med Kit', glyph: '✚', kind: 'consumable', maxStack: 32, worth: 3, health: 20, description: 'Restores 20 health when used.', altarDroppable: true },
    'pebble-stone': { name: 'Pebble Stone', glyph: '⬢', kind: 'material', maxStack: 64, worth: 6, rarity: 'Common', description: 'A common crafting material. Its listed acquisition sources are not present in this prototype yet.', altarDroppable: true },
    'pig-leather': { name: 'Pig Leather', glyph: '◈', kind: 'material', maxStack: 32, worth: 1, rarity: 'Common', description: 'Common material dropped by pigs.', altarDroppable: true },
    'pig-helmet': { name: 'Pig Helmet', glyph: '♜', kind: 'wearable', equipSlot: 'head', maxStack: 128, worth: 3, stats: { maxHunger: 150 }, description: 'A wearable helmet that increases maximum hunger to 150.', altarDroppable: true },
    'wolf-fur': { name: 'Wolf Fur', glyph: '◉', kind: 'material', maxStack: 32, worth: 1, altarDroppable: true, rarity: 'Common' },
    bone: { name: 'Bone', glyph: '♧', kind: 'material', maxStack: 32, worth: 1, altarDroppable: true, rarity: 'Common' },
    copper: { name: 'Copper', glyph: '◆', kind: 'material', maxStack: 32, worth: 1, rarity: 'Common', description: 'Common material dropped by frogs.', altarDroppable: true },
  };
  let openingChest = null;
  let activeShopRecipes = explorerShopRecipes;
  let explorerDoorCloseTimer = 0;
  const blockers = [];
  const deco = [];
  const mobs = [];
  const drops = [];
  const seeds = [11, 18, 31];
  const mobTypes = {
    frog: { name: 'Marsh Frog', color: '#78a968', hp: 24, damage: 4, speed: 68, xp: 7, coins: 2, glyph: '●' },
    pig: { name: 'Mud Pig', color: '#d18e7b', hp: 42, damage: 7, speed: 48, xp: 12, coins: 4, glyph: '●' },
    wolf: { name: 'Grey Wolf', color: '#a6aaa0', hp: 62, damage: 11, speed: 88, xp: 18, coins: 7, glyph: '▲' },
    glob: { name: 'Snotty Glob', color: '#a7ce5d', hp: 50, damage: 14, speed: 43, xp: 0, coins: 0, glyph: '●' },
    minotaur: { name: 'Minotaur', color: '#857d77', hp: 1250, damage: 24, speed: 32, xp: 0, coins: 0, glyph: '▲' },
    cyclops: { name: 'Cyclops', color: '#c2b6a5', hp: 4250, damage: 34, speed: 35, xp: 0, coins: 0, glyph: '●' },
    demon: { name: 'Demon', color: '#be5962', hp: 12500, damage: 48, speed: 43, xp: 0, coins: 0, glyph: '▲' },
    dragon: { name: 'Dragon', color: '#689d62', hp: 50000, damage: 65, speed: 52, xp: 0, coins: 0, glyph: '▲' },
  };
  const altarTiers = [
    { minimumWorth: 1820, tier: 'Legendary', type: 'dragon' },
    { minimumWorth: 1060, tier: 'Epic', type: 'demon' },
    { minimumWorth: 500, tier: 'Rare', type: 'cyclops' },
    { minimumWorth: 140, tier: 'Uncommon', type: 'minotaur' },
    { minimumWorth: 1, tier: 'Uncommon', type: 'glob' },
  ];
  const spawnSpecs = [
    ['frog', 980, 155], ['frog', 1320, 360], ['frog', 1430, 180], ['frog', 1130, 430],
    ['pig', 1850, 730], ['pig', 2110, 890], ['pig', 1775, 940],
    ['wolf', 1020, 1240], ['wolf', 1310, 1420], ['wolf', 1960, 1340],
  ];
  spawnSpecs.forEach(([type, x, y], i) => mobs.push(makeMob(type, x, y, i)));
  for (let i = 0; i < 170; i++) {
    const x = 35 + Math.random() * (WORLD.width - 70);
    const y = 35 + Math.random() * (WORLD.height - 70);
    const zone = zoneAt(x, y);
    deco.push({ x, y, r: 4 + Math.random() * 12, type: zone && zone.name === 'FROG MARSH' ? 'reed' : zone && zone.name.includes('WOLF') ? 'tree' : Math.random() > .53 ? 'grass' : 'stone' });
  }

  function makeMob(type, x, y, seed) {
    const data = mobTypes[type];
    return { type, x, y, hp: data.hp, maxHp: data.hp, dir: (seed * 1.7) % (Math.PI * 2), wander: seed % 3, hit: 0, attackCd: 0, alive: true };
  }
  function zoneAt(x, y) {
    return zones.find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  }
  function isInWorld(x, y) { return x >= 16 && y >= 16 && x <= WORLD.width - 16 && y <= WORLD.height - 16; }
  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 1900);
  }
  function createItem(id, count = 1) {
    const definition = itemDefinitions[id];
    if (definition) return { id, rarity: 'Common', dropability: 'Anywhere', ...definition, count };
    const recipe = explorerShopRecipes.find(entry => entry.output === id);
    if (recipe) {
      const kind = recipe.kind || 'wearable';
      return { id, name: recipe.name.replace(/ ×\d+$/, ''), glyph: recipe.glyph, kind, count, maxStack: 16, rarity: 'Common' };
    }
    const traderRecipe = [...cowboyShopRecipes, ...wizardShopRecipes].find(entry => entry.output === id);
    if (traderRecipe) {
      return {
        id,
        name: traderRecipe.name,
        glyph: traderRecipe.glyph,
        kind: traderRecipe.kind,
        count,
        maxStack: traderRecipe.kind === 'tool' ? 1 : 16,
        ...(traderRecipe.rarity ? { rarity: traderRecipe.rarity } : {}),
        shopPrice: traderRecipe.coins,
        description: traderRecipe.kind === 'tool'
          ? `${traderRecipe.rarity || 'Shop'} shovel. Its stats and treasure-finding effect are not specified in the reference yet.`
          : 'Shop item; detailed stats and effects are not specified in the reference yet.',
      };
    }
    const materialName = shopMaterialNames[id];
    if (materialName) return { id, name: materialName, glyph: '◆', kind: 'material', count, maxStack: 32, worth: 1, altarDroppable: true };
    return null;
  }
  function carriedItemBonus(stat) {
    const countedItems = new Set();
    return [...hotbar, ...inventory].reduce((total, item) => {
      if (!item || !item.stats || !Number.isFinite(item.stats[stat]) || countedItems.has(item.id)) return total;
      countedItems.add(item.id);
      return total + item.stats[stat];
    }, 0);
  }
  function playerMaxHealth() {
    return 100 * (1 + carriedItemBonus('healthPercent') / 100);
  }
  function playerMaxHunger() {
    return Math.max(100, carriedItemBonus('maxHunger'));
  }
  function playerMaxSpeed() {
    return Math.max(6, carriedItemBonus('maxSpeed') + player.speedBonus);
  }
  function canStoreItems(items, removedSlots = null, removedIndex = -1) {
    const slotCopies = [hotbar, inventory].flatMap(slots => slots.map((slot, index) => (
      slots === removedSlots && index === removedIndex
        ? null
        : slot ? { id: slot.id, count: slot.count, maxStack: slot.maxStack || 16 } : null
    )));
    for (const item of items) {
      let remaining = item.count || 1;
      const maxStack = item.maxStack || 16;
      for (const slot of slotCopies) {
        if (!slot || slot.id !== item.id) continue;
        const capacity = Math.max(0, Math.min(slot.maxStack, maxStack) - slot.count);
        const added = Math.min(capacity, remaining);
        slot.count += added;
        remaining -= added;
        if (!remaining) break;
      }
      while (remaining > 0) {
        const emptyIndex = slotCopies.findIndex(slot => slot === null);
        if (emptyIndex < 0) return false;
        const added = Math.min(maxStack, remaining);
        slotCopies[emptyIndex] = { id: item.id, count: added, maxStack };
        remaining -= added;
      }
    }
    return true;
  }
  function addInventory(item) {
    if (!canStoreItems([item])) return false;
    const count = item.count || 1;
    const maxStack = item.maxStack || 16;
    let remaining = count;
    for (const slots of [hotbar, inventory]) {
      for (const slot of slots) {
        if (!slot || slot.id !== item.id) continue;
        const capacity = Math.max(0, Math.min(slot.maxStack || 16, maxStack) - slot.count);
        const added = Math.min(capacity, remaining);
        slot.count += added;
        remaining -= added;
        if (!remaining) break;
      }
      if (!remaining) break;
    }
    while (remaining > 0) {
      const slots = hotbar.includes(null) ? hotbar : inventory;
      const emptyIndex = slots.findIndex(slot => !slot);
      const added = Math.min(maxStack, remaining);
      slots[emptyIndex] = { ...item, count: added };
      remaining -= added;
    }
    renderInventory();
    return true;
  }
  function inventoryCount(itemId) {
    return [...hotbar, ...inventory].reduce((count, item) => count + (item && item.id === itemId ? item.count : 0), 0);
  }
  function canStoreShopItem(item) {
    return canStoreItems([item]);
  }
  function consumeInventoryItem(itemId, amount) {
    for (const slots of [hotbar, inventory]) {
      for (let index = 0; index < slots.length && amount > 0; index++) {
        const item = slots[index];
        if (!item || item.id !== itemId) continue;
        const consumed = Math.min(item.count, amount);
        item.count -= consumed;
        amount -= consumed;
        if (item.count === 0) slots[index] = null;
      }
    }
  }
  function recipeCostText(recipe) {
    const costs = Object.entries(recipe.costs).map(([id, count]) => `${count} ${shopMaterialNames[id]}`);
    if (recipe.coins) costs.push(`${recipe.coins} Coins`);
    return costs.join(' · ');
  }
  function renderShopRecipes(shopRecipes = activeShopRecipes) {
    const recipes = $('shop-recipes');
    recipes.replaceChildren();
    shopRecipes.forEach((recipe, index) => {
      const output = createItem(recipe.output, recipe.count);
      const affordable = player.coins >= (recipe.coins || 0)
        && Object.entries(recipe.costs).every(([id, count]) => inventoryCount(id) >= count);
      const available = affordable && canStoreShopItem(output);
      const row = document.createElement('div');
      row.className = 'shop-recipe';
      row.addEventListener('mouseenter', event => showItemTooltip(output, event.clientX, event.clientY, recipe));
      row.addEventListener('mousemove', event => positionItemTooltip(event.clientX, event.clientY));
      row.addEventListener('mouseleave', hideItemTooltip);
      const icon = document.createElement('span');
      icon.className = 'shop-recipe-icon';
      icon.textContent = recipe.glyph;
      const detail = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'shop-recipe-name';
      name.textContent = recipe.name;
      const cost = document.createElement('div');
      cost.className = 'shop-recipe-cost';
      cost.textContent = recipeCostText(recipe);
      detail.append(name, cost);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = available ? 'Buy' : 'Missing';
      button.disabled = !available;
      button.addEventListener('click', () => purchaseShopRecipe(index));
      row.append(icon, detail, button);
      recipes.appendChild(row);
    });
  }
  function purchaseShopRecipe(index) {
    const recipe = activeShopRecipes[index];
    if (!recipe) return;
    const output = createItem(recipe.output, recipe.count);
    if (!output) return showToast('This recipe output is not available.');
    if (player.coins < (recipe.coins || 0) || Object.entries(recipe.costs).some(([id, count]) => inventoryCount(id) < count)) {
      showToast('You do not have the required coins or materials.');
      return;
    }
    if (!canStoreShopItem(output)) {
      showToast('Your backpack and hotbar are full.');
      return;
    }
    for (const [id, count] of Object.entries(recipe.costs)) consumeInventoryItem(id, count);
    player.coins -= recipe.coins || 0;
    if (!addInventory(output)) {
      showToast('Could not make room for the purchase.');
      return;
    }
    showToast(`Bought ${recipe.name}.`);
    hideItemTooltip();
    updateHud();
    renderShopRecipes();
  }
  function renderInventory() {
    $('hotbar').innerHTML = '';
    hotbar.forEach((item, i) => $('hotbar').appendChild(makeSlot(item, i, 'hotbar')));
    $('inventory-grid').innerHTML = '';
    inventory.forEach((item, i) => $('inventory-grid').appendChild(makeSlot(item, i, 'bag')));
  }
  function makeSlot(item, index, area) {
    const el = document.createElement('div');
    el.className = `slot${area === 'hotbar' && selectedSlot === index ? ' selected' : ''}`;
    el.draggable = Boolean(item);
    if (area === 'hotbar') el.innerHTML = `<span class="slot-key">${index + 1}</span>`;
    if (item) {
      el.innerHTML += `<span class="item-glyph">${item.glyph}</span>${item.count > 1 ? `<span class="stack-count">${item.count}</span>` : ''}`;
      if (area === 'hotbar') {
        el.addEventListener('mouseenter', event => showItemTooltip(item, event.clientX, event.clientY));
        el.addEventListener('mousemove', event => positionItemTooltip(event.clientX, event.clientY));
        el.addEventListener('mouseleave', hideItemTooltip);
      }
    }
    el.addEventListener('click', () => {
      if (area === 'hotbar') { selectedSlot = index; renderInventory(); }
      else if (item && item.kind === 'consumable') useItem(item, inventory, index);
      else if (item && item.kind === 'chest') openCommonChest(inventory, index);
      else showToast(item ? item.name : 'Empty slot');
    });
    el.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', JSON.stringify({ area, index })));
    el.addEventListener('dragover', event => event.preventDefault());
    el.addEventListener('drop', event => {
      event.preventDefault();
      try {
        const source = JSON.parse(event.dataTransfer.getData('text/plain'));
        const from = source.area === 'hotbar' ? hotbar : inventory;
        const into = area === 'hotbar' ? hotbar : inventory;
        [from[source.index], into[index]] = [into[index], from[source.index]];
        renderInventory();
      } catch (error) { showToast('Could not move that item.'); }
    });
    return el;
  }
  function appendTooltipStat(container, label, value, className = '') {
    const row = document.createElement('div');
    row.className = `tooltip-stat${className ? ` ${className}` : ''}`;
    const labelNode = document.createElement('b');
    labelNode.textContent = `${label}: `;
    row.append(labelNode, document.createTextNode(String(value)));
    container.appendChild(row);
  }
  function showItemTooltip(item, x, y, recipe = null) {
    const tooltip = $('item-tooltip');
    tooltip.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = item.name;
    tooltip.appendChild(title);

    const description = document.createElement('p');
    description.textContent = item.description || (item.kind === 'weapon'
      ? 'A weapon that can be used to attack enemies.'
      : item.kind === 'armor' || item.kind === 'wearable'
        ? 'A wearable item; its effects are not implemented in this prototype.'
        : item.kind === 'consumable'
          ? 'A consumable item.'
          : 'An item that can be carried in your inventory.');
    tooltip.appendChild(description);

    if (item.rarity) appendTooltipStat(tooltip, 'Rarity', item.rarity, 'tooltip-rarity');
    appendTooltipStat(tooltip, 'Worth of goods', Number.isFinite(item.worth) ? item.worth : 'Not listed', 'tooltip-worth');
    if (item.dropability) appendTooltipStat(tooltip, 'Droppable', item.dropability);
    if (Number.isFinite(item.worth)) {
      appendTooltipStat(tooltip, 'Altar offering', item.altarDroppable === false ? 'Cannot be offered' : 'Can be offered');
    }

    if (item.kind === 'weapon' && Number.isFinite(item.damage)) {
      const attackSpeed = 1 / (item.attackCooldown || WEAPON_ATTACK_COOLDOWN);
      if (Number.isFinite(item.attackCooldown)) appendTooltipStat(tooltip, 'Use cooldown', `${Math.round(item.attackCooldown * 1000)} ms`);
      appendTooltipStat(tooltip, 'Attack damage', item.damage);
      appendTooltipStat(tooltip, 'Attack speed', `${attackSpeed.toFixed(2)} attacks/sec`);
      appendTooltipStat(tooltip, 'Attack DPS', `${(item.damage * attackSpeed).toFixed(1)} damage/sec`);
    }
    if (typeof item.isMelee === 'boolean') appendTooltipStat(tooltip, 'Is melee?', item.isMelee ? 'Yes' : 'No');
    if (Number.isFinite(item.specialChance)) {
      appendTooltipStat(tooltip, 'Special chance', `${item.specialChance * 100}%`);
      appendTooltipStat(tooltip, 'Damage on special', `${item.specialMultiplier}×`);
    }
    if (Number.isFinite(item.stunChance)) {
      appendTooltipStat(tooltip, 'Stun chance', `${item.stunChance * 100}%`);
      appendTooltipStat(tooltip, 'Stun duration', `${item.stunDuration} seconds`);
    }
    if (Number.isFinite(item.maxStack)) appendTooltipStat(tooltip, 'Max stack', item.maxStack);
    if (!recipe && Number.isFinite(item.shopPrice)) appendTooltipStat(tooltip, 'Shop price', `${item.shopPrice} Coins`);
    if (recipe) {
      const cost = recipeCostText(recipe);
      if (cost) appendTooltipStat(tooltip, 'Shop cost', cost);
    }
    if (item.openTime) appendTooltipStat(tooltip, 'Time to open', `${item.openTime} seconds`);
    if (Number.isFinite(item.health)) appendTooltipStat(tooltip, 'Health restored', item.health);
    if (Number.isFinite(item.hunger)) appendTooltipStat(tooltip, 'Hunger restored', item.hunger);
    if (Number.isFinite(item.xp)) appendTooltipStat(tooltip, 'Experience granted', item.xp);
    if (Number.isFinite(item.damageBoost)) appendTooltipStat(tooltip, 'Damage bonus', `+${item.damageBoost} for ${item.boostDuration} seconds`);
    if (Number.isFinite(item.speedOnHitChance)) {
      appendTooltipStat(tooltip, 'Speed boost chance', `${item.speedOnHitChance * 100}%`);
      appendTooltipStat(tooltip, 'Speed boost', `+${item.speedOnHit}`);
    }
    if (Number.isFinite(item.sabotageChance)) {
      appendTooltipStat(tooltip, 'Sabotage chance', `${item.sabotageChance * 100}%`);
      appendTooltipStat(tooltip, 'On sabotage', `Heal enemy for ${item.enemyHealFraction * 100}% of normal damage instead`);
    }
    if (Number.isFinite(item.frozenChance)) appendTooltipStat(tooltip, 'Frozen chance', `${item.frozenChance * 100}%`);
    if (Number.isFinite(item.luckDuration)) appendTooltipStat(tooltip, 'Luck duration', `${item.luckDuration} seconds`);
    if (Number.isFinite(item.speed)) appendTooltipStat(tooltip, 'Speed increase', item.speed);
    if (item.treasureFinding) appendTooltipStat(tooltip, 'Special effect', 'Chance to find Chests in the Treasure Room');
    if (Number.isFinite(item.reviveChance)) appendTooltipStat(tooltip, 'Revival chance', `${item.reviveChance * 100}%`);
    if ((item.kind === 'armor' || item.kind === 'wearable') && item.stats) {
      const statLabels = {
        healthPercent: 'Maximum health',
        maxSpeed: 'Maximum speed',
        dodgeChance: 'Dodge chance',
        maxHunger: 'Maximum hunger',
        coinBonus: 'Magic-pot gold bonus',
      };
      Object.entries(statLabels).forEach(([key, label]) => {
        if (!Number.isFinite(item.stats[key])) return;
        const suffix = key === 'healthPercent' || key === 'dodgeChance' || key === 'coinBonus' ? '%' : '';
        appendTooltipStat(tooltip, label, `${item.stats[key]}${suffix}`);
      });
    }
    if (item.count > 1) appendTooltipStat(tooltip, 'Stack', item.count);
    tooltip.classList.remove('hidden');
    positionItemTooltip(x, y);
  }
  function positionItemTooltip(x, y) {
    const tooltip = $('item-tooltip');
    if (tooltip.classList.contains('hidden')) return;
    const padding = 8;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.min(Math.max(padding, x + 14), window.innerWidth - rect.width - padding);
    const top = y + rect.height + 20 > window.innerHeight
      ? Math.max(padding, y - rect.height - 12)
      : Math.max(padding, y + 12);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function hideItemTooltip() {
    $('item-tooltip').classList.add('hidden');
  }
  function useItem(item, slots, index) {
    if (item.kind === 'chest') return openCommonChest(slots, index);
    if (item.id === 'energy-drink' && player.energyBoost > 0) return showToast('The energy drink effect is already active.');
    if (item.damageBoost && player.damageBoost > 0) return showToast('A Rage Potion effect is already active.');
    if (item.luckDuration && player.luckBoost > 0) return showToast('A Luck Potion effect is already active.');
    const health = item.health || 0;
    const hunger = item.hunger || 0;
    const xp = item.xp || 0;
    const willHeal = health > 0 && player.health < playerMaxHealth();
    const willRestoreHunger = hunger > 0 && player.hunger < playerMaxHunger();
    if (!willHeal && !willRestoreHunger && !xp && !item.speedBoost && !item.damageBoost && !item.luckDuration && !item.speed) {
      return showToast(health && player.health >= playerMaxHealth() ? 'Health is already full.' : hunger && player.hunger >= playerMaxHunger() ? 'Hunger is already full.' : `${item.name} is not usable here.`);
    }
    const healthRestored = Math.min(health, playerMaxHealth() - player.health);
    const hungerRestored = Math.min(hunger, playerMaxHunger() - player.hunger);
    player.health += healthRestored;
    player.hunger += hungerRestored;
    if (item.speedBoost) player.energyBoost = item.boostDuration || 10;
    if (item.damageBoost) player.damageBoost = item.damageBoost;
    if (item.luckDuration) player.luckBoost = item.luckDuration;
    if (item.speed) player.speedBonus += item.speed;
    const xpGranted = xp * (isInsideTreasureRoom(player.x, player.y) ? 2 : 1);
    if (xpGranted) gainXp(xpGranted);
    item.count--;
    if (!item.count) slots[index] = null;
    showToast(`Used ${item.name}${healthRestored ? ` · +${healthRestored} health` : ''}${hungerRestored ? ` · +${hungerRestored} hunger` : ''}${xpGranted ? ` · +${xpGranted} XP` : ''}${item.speedBoost ? ' · +2.5 speed' : ''}${item.damageBoost ? ` · +${item.damageBoost} damage` : ''}${item.speed ? ` · +${item.speed} speed` : ''}${item.luckDuration ? ' · luck for 60 seconds' : ''}`);
    updateHud();
    renderInventory();
  }
  function openCommonChest(slots, index) {
    if (openingChest) return showToast('A chest is already being opened.');
    const chest = slots[index];
    let rewards;
    if (chest.id === 'legendary-chest') {
      const roll = Math.random();
      rewards = roll < .7
        ? [createItem('gold-skull', 5 + Math.floor(Math.random() * 3))]
        : roll < .9
          ? [createItem('battle-helmet')]
          : [createItem('soul-stone')];
    } else if (chest.id === 'epic-chest') {
      const roll = Math.random();
      rewards = roll < .7
        ? [createItem('gold-horseshoe', 5 + Math.floor(Math.random() * 3))]
        : roll < .9
          ? [createItem('iron-helmet')]
          : [createItem('underground-stone')];
    } else {
      rewards = [
        createItem('gold-stone', 5 + Math.floor(Math.random() * 3)),
        createItem('fabric-helmet'),
        createItem('pebble-stone'),
      ];
    }
    if (!canStoreItems(rewards, slots, index)) return showToast('Make room in your inventory for the chest loot.');
    openingChest = { slots, index, item: chest, rewards, duration: chest.openTime, remaining: chest.openTime };
    keys.clear();
    $('chest-opening').classList.remove('hidden');
    updateChestOpening();
  }
  function updateChestOpening() {
    if (!openingChest) return;
    const fraction = 1 - openingChest.remaining / openingChest.duration;
    $('chest-opening-progress').style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    $('chest-opening-title').textContent = `Opening ${openingChest.item.name}`;
    $('chest-opening-time').textContent = `${Math.ceil(openingChest.remaining)} seconds remaining`;
  }
  function cancelChestOpening() {
    if (!openingChest) return;
    openingChest = null;
    $('chest-opening').classList.add('hidden');
    showToast('Chest opening cancelled.');
  }
  function finishCommonChest() {
    const { slots, index, item, rewards } = openingChest;
    if (slots[index] !== item || item.kind !== 'chest') {
      cancelChestOpening();
      return showToast('The chest moved before it finished opening.');
    }
    if (!canStoreItems(rewards, slots, index)) {
      openingChest = null;
      $('chest-opening').classList.add('hidden');
      return showToast(`Chest loot did not fit. The ${item.name} was not consumed.`);
    }
    item.count--;
    if (!item.count) slots[index] = null;
    rewards.forEach(reward => addInventory(reward));
    openingChest = null;
    $('chest-opening').classList.add('hidden');
    renderInventory();
    showToast(`${item.name} opened · loot added to your inventory.`);
  }
  function updateHud() {
    const requiredXp = 24 + player.level * 13;
    const maxHealth = playerMaxHealth();
    const maxHunger = playerMaxHunger();
    const currentSpeed = Math.min(playerMaxSpeed(), 6 + player.speedBonus + (player.energyBoost > 0 ? 2.5 : 0));
    $('health').textContent = `${Math.round(player.health)} / ${Math.round(maxHealth)}`;
    $('hunger').textContent = `${Math.round(player.hunger)} / ${Math.round(maxHunger)}`;
    $('coins').textContent = player.coins;
    $('bottom-coins').textContent = player.coins;
    $('level').textContent = player.level;
    $('bottom-level').textContent = player.level;
    $('rebirths').textContent = player.rebirths;
    $('strike-strength').textContent = player.strikeStrength.toFixed(1);
    const hungerAdjustedSpeed = player.hunger < 25 ? currentSpeed * .7 : currentSpeed;
    const speedText = Number.isInteger(hungerAdjustedSpeed) ? hungerAdjustedSpeed : hungerAdjustedSpeed.toFixed(1);
    $('speed').textContent = `${speedText} / ${playerMaxSpeed()}`;
    $('experience').textContent = `${player.xp} / ${requiredXp}`;
    $('health-meter').style.width = `${player.health / maxHealth * 100}%`;
    $('speed-meter').style.width = `${hungerAdjustedSpeed / playerMaxSpeed() * 100}%`;
    $('hunger-meter').style.width = `${player.hunger / maxHunger * 100}%`;
    $('xp-meter').style.width = `${Math.min(100, player.xp / requiredXp * 100)}%`;
    $('profile-name').textContent = player.name;
    $('self-entry').innerHTML = '';
    $('self-entry').textContent = player.name;
    const selfLevel = document.createElement('span');
    selfLevel.textContent = `Level ${player.level}`;
    $('self-entry').appendChild(selfLevel);
    const zone = zoneAt(player.x, player.y);
    $('zone-label').textContent = (zone ? zone.name : 'THE CROSSROADS').toUpperCase();
    const active = $('altar-status');
    if (altar.summon) { active.textContent = `${altar.tier} SUMMON · ${altar.boss.toUpperCase()} · ${Math.ceil(altar.fight)}s`; active.classList.remove('hidden'); }
    else if (altar.countdown) { active.textContent = `WORTH ${altar.offeringWorth} · SUMMON IN ${Math.ceil(altar.countdown)}s`; active.classList.remove('hidden'); }
    else active.classList.add('hidden');
    updateAltarMenu();
  }
  function getAltarTier(worth) {
    return altarTiers.find(tier => worth >= tier.minimumWorth) || null;
  }
  function updateAltarMenu() {
    const item = hotbar[selectedSlot];
    const itemWorth = item && Number.isInteger(item.worth) && item.worth > 0 ? item.worth : 0;
    const amountInput = $('offering-amount');
    const requestedAmount = Number.parseInt(amountInput.value, 10) || 1;
    const possibleTier = item && item.altarDroppable !== false
      ? getAltarTier(altar.offeringWorth + itemWorth * requestedAmount)
      : null;
    $('offering-glyph').textContent = item ? item.glyph : '?';
    $('offering-item-name').textContent = item ? item.name : 'No item selected';
    $('offering-item-worth').textContent = itemWorth
      ? `Worth ${itemWorth} each · stack of ${item.count}${item.altarDroppable === false ? ' · cannot be offered' : ''}`
      : 'This selected item has no altar worth.';
    $('altar-current-worth').textContent = altar.offeringWorth;
    $('altar-tier-preview').textContent = item && item.altarDroppable === false
      ? 'This item cannot be dropped on the altar.'
      : possibleTier
        ? `${possibleTier.tier} tier · ${mobTypes[possibleTier.type].name} (worth ${possibleTier.minimumWorth}+)`
        : 'Worth 1 is needed to summon an altar monster.';
    amountInput.max = item && item.count ? item.count : 1;
    amountInput.disabled = !itemWorth || !item || altar.summon || altar.loot > 0;
    $('altar-offer-submit').disabled = amountInput.disabled;
  }
  function drawWorld() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    camera.x = player.x - width / 2;
    camera.y = player.y - height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    zones.forEach((z, i) => {
      ctx.fillStyle = z.floor;
      ctx.fillRect(z.x, z.y, z.w, z.h);
      if (i === 1) {
        ctx.fillStyle = '#6e8270';
        ctx.globalAlpha = .62;
        ctx.beginPath(); ctx.ellipse(z.x + 395, z.y + 294, 215, 125, -.12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#97a380'; ctx.lineWidth = 11; ctx.stroke();
        ctx.fillStyle = '#b7bd94'; ctx.font = '11px "DM Mono"'; ctx.fillText('MARSH POND', z.x + 338, z.y + 300);
      }
      ctx.fillStyle = '#a3a28d'; ctx.globalAlpha = .36; ctx.font = '10px "DM Mono"'; ctx.fillText(z.name, z.x + 30, z.y + 32); ctx.globalAlpha = 1;
    });
    drawTreasureRoomGround();
    drawBedchamber();
    drawAltarCourtWalls();
    drawAltar();
    deco.forEach(d => {
      ctx.globalAlpha = .68;
      if (d.type === 'tree') {
        ctx.fillStyle = '#1e3024'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#55704e'; ctx.beginPath(); ctx.arc(d.x - d.r * .35, d.y - d.r * .25, d.r, 0, Math.PI * 2); ctx.fill();
      } else if (d.type === 'reed') {
        ctx.strokeStyle = '#819967'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y - d.r); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 4, d.y - d.r * .9); ctx.stroke();
      } else {
        ctx.fillStyle = d.type === 'grass' ? '#8d9b62' : '#777c6b'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * .44, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    drawGroveStations();
    drawExplorerShop();
    drawCrossroadsMerchants();
    drops.forEach(drop => {
      ctx.fillStyle = '#ecc455'; ctx.beginPath(); ctx.arc(drop.x, drop.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0a7'; ctx.fillRect(drop.x - 1, drop.y - 4, 2, 7);
      ctx.fillStyle = '#f1d9a2'; ctx.font = '9px "DM Mono"'; ctx.fillText(drop.item.name, drop.x - 18, drop.y - 12);
    });
    mobs.forEach(m => m.alive && drawMob(m));
    remotePlayers.forEach(drawRemote);
    drawPlayer();
    ctx.restore();
  }
  function drawTreasureRoomGround() {
    const { x, y, w, h } = TREASURE_ROOM;
    ctx.fillStyle = '#332e2a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#716253';
    ctx.fillRect(x + 13, y + 13, w - 26, h - 26);
    for (let tileY = y + 16; tileY < y + h - 16; tileY += 32) {
      for (let tileX = x + 16; tileX < x + w - 16; tileX += 32) {
        ctx.fillStyle = ((tileX + tileY) / 32) % 2 ? '#796b5b' : '#82725f';
        ctx.fillRect(tileX, tileY, 30, 30);
      }
    }
    ctx.fillStyle = '#c6b47c';
    ctx.fillRect(x + 66, y + 66, w - 132, h - 132);
    ctx.fillStyle = '#d8c991';
    for (let i = 0; i < 100; i++) {
      const grainX = x + 76 + ((i * 67) % (w - 152));
      const grainY = y + 76 + ((i * 41) % (h - 152));
      ctx.fillRect(grainX, grainY, 2, 2);
    }
    ctx.strokeStyle = '#a99466';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = '#f0dfb5';
    ctx.textAlign = 'center';
    ctx.font = '9px "DM Mono"';
    ctx.fillText('TREASURE ROOM · LEVEL 10', x + w / 2, y + h - 19);
    ctx.textAlign = 'left';
  }
  function isInsideTreasureRoom(x, y) {
    return x >= TREASURE_ROOM.x && x <= TREASURE_ROOM.x + TREASURE_ROOM.w
      && y >= TREASURE_ROOM.y && y <= TREASURE_ROOM.y + TREASURE_ROOM.h;
  }
  function drawAltarCourtWalls() {
    ctx.fillStyle = '#665746';
    altarWalls.forEach(wall => ctx.fillRect(wall.x, wall.y, wall.w, wall.h));
    ctx.fillStyle = altarDoor.open ? '#9b9068' : '#171a16';
    ctx.fillRect(altarDoor.x, altarDoor.y, altarDoor.w, altarDoor.h);
    ctx.strokeStyle = altarDoor.open ? '#d2c48d' : '#71644c';
    ctx.lineWidth = 2;
    ctx.strokeRect(altarDoor.x + 2, altarDoor.y + 3, altarDoor.w - 4, altarDoor.h - 6);
    if (!altarDoor.open) {
      ctx.fillStyle = '#e0ca87';
      ctx.font = '9px "DM Mono"';
      ctx.save();
      ctx.translate(altarDoor.x + 22, altarDoor.y + altarDoor.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('SPACE', 0, 0);
      ctx.restore();
    }
  }
  function drawBedchamber() {
    ctx.fillStyle = '#696353';
    ctx.fillRect(1094, 664, 202, 202);
    ctx.fillStyle = '#77654c';
    bedchamberWalls.forEach(wall => ctx.fillRect(wall.x, wall.y, wall.w, wall.h));
    ctx.strokeStyle = '#b09a70';
    ctx.lineWidth = 2;
    ctx.strokeRect(1080, 650, 230, 230);
    ctx.fillStyle = '#383831';
    ctx.fillRect(1141, 700, 98, 52);
    ctx.fillStyle = '#b8a782';
    ctx.fillRect(1147, 706, 31, 40);
    ctx.fillStyle = '#667f82';
    ctx.fillRect(1180, 706, 53, 40);
    ctx.fillStyle = '#d5c69a';
    ctx.font = '9px "DM Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('BEDCHAMBER', BEDCHAMBER.x, 779);
    ctx.textAlign = 'left';
  }
  function drawCrossroadsMerchants() {
    crossroadsMerchants.forEach(merchant => {
      const { x, y, w, h } = merchant.bounds;
      ctx.fillStyle = '#77766b';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#8a897b';
      for (let tileY = y + 15; tileY < y + h - 15; tileY += 32) {
        for (let tileX = x + 15; tileX < x + w - 15; tileX += 32) {
          ctx.fillStyle = ((tileX + tileY) / 32) % 2 ? '#77776c' : '#858477';
          ctx.fillRect(tileX, tileY, 30, 30);
        }
      }
      ctx.fillStyle = '#50483e';
      ctx.fillRect(x, y, w, 14);
      ctx.fillRect(x, y, 14, h);
      ctx.fillRect(x + w - 14, y, 14, h);
      const doorWidth = 60;
      const doorLeft = x + (w - doorWidth) / 2;
      ctx.fillRect(x, y + h - 14, doorLeft - x, 14);
      ctx.fillRect(doorLeft + doorWidth, y + h - 14, x + w - doorLeft - doorWidth, 14);
      ctx.fillStyle = '#78634e';
      for (let col = 0; col < Math.ceil(w / 48); col++) {
        const brickX = x + col * 48;
        if (brickX + 46 <= x + w) {
          ctx.strokeRect(brickX, y + 1, 46, 12);
          ctx.strokeRect(brickX, y + h - 13, 46, 12);
        }
      }
      for (let row = 0; row < Math.ceil(h / 20); row++) {
        const brickY = y + 14 + row * 20;
        if (brickY + 18 < y + h) {
          ctx.strokeRect(x + 1, brickY, 12, 18);
          ctx.strokeRect(x + w - 13, brickY, 12, 18);
        }
      }
    });
    crossroadsShopCounters.forEach(counter => {
      ctx.fillStyle = '#493b2e';
      ctx.fillRect(counter.x, counter.y, counter.w, counter.h);
      ctx.fillStyle = '#9b7950';
      ctx.fillRect(counter.x + 3, counter.y + 3, counter.w - 6, counter.h - 8);
      ctx.fillStyle = '#c6a16a';
      ctx.fillRect(counter.x, counter.y, counter.w, 5);
    });
    crossroadsShopFixtures.forEach(fixture => {
      ctx.fillStyle = fixture.type === 'barrel' ? '#68472e' : '#72583b';
      ctx.fillRect(fixture.x, fixture.y, fixture.w, fixture.h);
      ctx.strokeStyle = '#b09161';
      ctx.lineWidth = 2;
      ctx.strokeRect(fixture.x + 2, fixture.y + 2, fixture.w - 4, fixture.h - 4);
      if (fixture.type === 'barrel') {
        ctx.beginPath();
        ctx.moveTo(fixture.x + 4, fixture.y + 7);
        ctx.lineTo(fixture.x + fixture.w - 4, fixture.y + 7);
        ctx.moveTo(fixture.x + 4, fixture.y + fixture.h - 7);
        ctx.lineTo(fixture.x + fixture.w - 4, fixture.y + fixture.h - 7);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(fixture.x + fixture.w / 2, fixture.y + 4);
        ctx.lineTo(fixture.x + fixture.w / 2, fixture.y + fixture.h - 4);
        ctx.stroke();
      }
    });
    crossroadsMerchants.forEach(merchant => {
      const isWizard = merchant.id === 'wizard';
      ctx.fillStyle = '#171b16';
      ctx.fillRect(merchant.x - 58, merchant.y + 23, 116, 18);
      ctx.fillStyle = merchant.color;
      ctx.beginPath();
      ctx.arc(merchant.x, merchant.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0ead8';
      ctx.beginPath();
      ctx.arc(merchant.x - 5, merchant.y - 2, 2, 0, Math.PI * 2);
      ctx.arc(merchant.x + 5, merchant.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = merchant.hat;
      if (isWizard) {
        ctx.beginPath();
        ctx.moveTo(merchant.x - 15, merchant.y - 11);
        ctx.lineTo(merchant.x, merchant.y - 37);
        ctx.lineTo(merchant.x + 15, merchant.y - 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(merchant.x - 18, merchant.y - 12, 36, 5);
        ctx.fillStyle = '#f2db8b';
        ctx.beginPath();
        ctx.arc(merchant.x, merchant.y - 28, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(merchant.x - 22, merchant.y - 16, 44, 6);
        ctx.fillRect(merchant.x - 13, merchant.y - 27, 26, 12);
        ctx.fillStyle = '#efe3c7';
        ctx.fillRect(merchant.x - 11, merchant.y - 17, 22, 2);
      }
      ctx.fillStyle = '#eee6cc';
      ctx.textAlign = 'center';
      ctx.font = '8px "DM Mono"';
      ctx.fillText(merchant.id === 'wizard' ? "WIZARD'S SHOP" : "COWBOY'S SHOP", merchant.x, merchant.y + 36);
      ctx.font = '7px "DM Mono"';
      ctx.fillText('SPACE TO SHOP', merchant.x, merchant.y + 51);
      ctx.textAlign = 'left';
    });
  }
  function drawGroveStations() {
    groveStations.forEach(station => {
      ctx.fillStyle = '#17201880';
      ctx.beginPath();
      ctx.ellipse(station.x, station.y + 20, 48, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5e624c';
      ctx.fillRect(station.x - 38, station.y - 8, 76, 39);
      ctx.fillStyle = '#81795c';
      ctx.fillRect(station.x - 34, station.y - 13, 68, 32);
      ctx.fillStyle = '#34372e';
      ctx.fillRect(station.x - 30, station.y - 17, 60, 23);
      ctx.fillStyle = station.color;
      if (station.icon === 'anvil') {
        ctx.fillRect(station.x - 18, station.y - 20, 36, 13);
        ctx.fillRect(station.x - 25, station.y - 17, 50, 7);
        ctx.fillRect(station.x - 8, station.y - 8, 16, 13);
      } else if (station.icon === 'furnace') {
        ctx.fillStyle = '#704039';
        ctx.fillRect(station.x - 18, station.y - 30, 36, 39);
        ctx.fillStyle = '#342723';
        ctx.fillRect(station.x - 11, station.y - 20, 22, 24);
        ctx.fillStyle = '#ed9b48';
        ctx.beginPath(); ctx.moveTo(station.x, station.y + 1); ctx.lineTo(station.x + 7, station.y - 10); ctx.lineTo(station.x + 3, station.y - 18); ctx.lineTo(station.x - 5, station.y - 8); ctx.closePath(); ctx.fill();
      } else if (station.icon === 'level') {
        ctx.fillStyle = '#8f7546';
        ctx.fillRect(station.x - 14, station.y - 8, 28, 18);
        ctx.fillStyle = station.color;
        ctx.beginPath(); ctx.moveTo(station.x, station.y - 35); ctx.lineTo(station.x + 14, station.y - 19); ctx.lineTo(station.x, station.y - 4); ctx.lineTo(station.x - 14, station.y - 19); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4df94';
        ctx.beginPath(); ctx.arc(station.x, station.y - 19, 4, 0, Math.PI * 2); ctx.fill();
      } else if (station.icon === 'gambling') {
        ctx.fillStyle = '#55432f';
        ctx.fillRect(station.x - 17, station.y - 3, 34, 17);
        ctx.fillStyle = station.color;
        ctx.beginPath();
        ctx.moveTo(station.x, station.y - 34);
        ctx.lineTo(station.x + 18, station.y - 12);
        ctx.lineTo(station.x, station.y - 3);
        ctx.lineTo(station.x - 18, station.y - 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f1da91';
        ctx.font = '11px "DM Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('?', station.x, station.y - 12);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#756247';
        ctx.fillRect(station.x - 15, station.y - 5, 30, 15);
        ctx.fillStyle = station.color;
        ctx.beginPath(); ctx.moveTo(station.x, station.y - 37); ctx.lineTo(station.x + 14, station.y - 22); ctx.lineTo(station.x, station.y - 7); ctx.lineTo(station.x - 14, station.y - 22); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d8c2ef';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = '#1b211b';
      ctx.fillRect(station.x - 55, station.y + 38, 110, 17);
      ctx.fillStyle = '#eee6cc';
      ctx.textAlign = 'center';
      ctx.font = '9px "DM Mono"';
      ctx.fillText(station.name.toUpperCase(), station.x, station.y + 50);
      ctx.textAlign = 'left';
    });
  }
  function drawExplorerShop() {
    const shop = explorerShopBounds;
    ctx.fillStyle = '#363a32';
    ctx.fillRect(shop.x + 14, shop.y + 14, shop.w - 28, shop.h - 28);
    ctx.strokeStyle = '#41443b';
    ctx.lineWidth = 1;
    for (let y = shop.y + 24; y < shop.y + shop.h - 18; y += 27) {
      ctx.beginPath(); ctx.moveTo(shop.x + 16, y); ctx.lineTo(shop.x + shop.w - 16, y); ctx.stroke();
      const offset = Math.floor((y - shop.y) / 27) % 2 ? 0 : 24;
      for (let x = shop.x + 18 + offset; x < shop.x + shop.w - 16; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13); ctx.stroke();
      }
    }
    ctx.fillStyle = '#665746';
    explorerShopWalls.forEach(wall => ctx.fillRect(wall.x, wall.y, wall.w, wall.h));
    ctx.strokeStyle = '#a58a60';
    ctx.lineWidth = 2;
    ctx.strokeRect(shop.x, shop.y, shop.w, shop.h);
    ctx.fillStyle = '#463b30';
    ctx.fillStyle = '#a37d4f';
    explorerShopCounters.forEach(counter => {
      ctx.fillStyle = '#463b30';
      ctx.fillRect(counter.x, counter.y + 8, counter.w, counter.h - 8);
      ctx.fillStyle = '#a37d4f';
      ctx.fillRect(counter.x + 4, counter.y, counter.w - 8, 11);
    });
    ctx.fillStyle = '#887057';
    ctx.fillRect(shop.x + 35, shop.y + 167, 32, 27);
    ctx.fillRect(shop.x + 77, shop.y + 206, 27, 35);
    ctx.fillStyle = '#d1a962';
    ctx.beginPath(); ctx.arc(shop.x + 170, shop.y + 115, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#564232';
    ctx.fillRect(shop.x + 159, shop.y + 126, 22, 27);
    ctx.fillStyle = '#eee2c6';
    ctx.font = '8px "DM Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('DEALER', shop.x + 170, shop.y + 111);
    ctx.fillStyle = '#ece2c8';
    ctx.textAlign = 'center';
    ctx.font = '9px "DM Mono"';
    ctx.fillText('EXPLORER HOUSE', shop.x + shop.w / 2, shop.y + 34);
    ctx.fillStyle = '#d7c391';
    ctx.font = '8px "DM Mono"';
    ctx.fillText('SPACE · BROWSE', shop.x + shop.w / 2, shop.y + shop.h - 37);
    ctx.fillStyle = explorerDoor.open ? '#9b9068' : '#171a16';
    ctx.fillRect(explorerDoor.x, explorerDoor.y, explorerDoor.w, explorerDoor.h);
    ctx.strokeStyle = explorerDoor.open ? '#d2c48d' : '#71644c';
    ctx.strokeRect(explorerDoor.x + 3, explorerDoor.y + 2, explorerDoor.w - 6, explorerDoor.h - 4);
    if (!explorerDoor.open) ctx.fillText('SPACE', explorerDoor.x + explorerDoor.w / 2, explorerDoor.y + 27);
    ctx.textAlign = 'left';
  }
  function drawAltar() {
    const x = 395, y = 810;
    ctx.fillStyle = '#282723'; ctx.beginPath(); ctx.arc(x, y, 80, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b18d51'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 68, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#61513a'; ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = altar.summon ? '#e77c4f' : altar.countdown ? '#e2be61' : '#84b7ab'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + 21, y); ctx.lineTo(x, y + 24); ctx.lineTo(x - 21, y); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#d7c18d'; ctx.font = '10px "DM Mono"'; ctx.textAlign = 'center'; ctx.fillText('SHARED ALTAR', x, y + 103); ctx.textAlign = 'left';
  }
  function drawMob(m) {
    const data = mobTypes[m.type];
    const radius = m.type === 'glob' ? 19 : m.type === 'wolf' ? 16 : 14;
    ctx.fillStyle = '#10150f77'; ctx.beginPath(); ctx.ellipse(m.x, m.y + radius * .8, radius * 1.15, radius * .56, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.hit > 0 ? '#fff2dd' : data.color;
    ctx.beginPath();
    if (m.type === 'wolf') { ctx.moveTo(m.x, m.y - radius); ctx.lineTo(m.x + radius, m.y + radius * .6); ctx.lineTo(m.x - radius, m.y + radius * .6); ctx.closePath(); }
    else ctx.ellipse(m.x, m.y, radius, radius * .84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#202521'; ctx.beginPath(); ctx.arc(m.x - 4, m.y - 2, 1.7, 0, Math.PI * 2); ctx.arc(m.x + 4, m.y - 2, 1.7, 0, Math.PI * 2); ctx.fill();
    if (m.hp < m.maxHp) {
      ctx.fillStyle = '#20241f'; ctx.fillRect(m.x - 17, m.y - radius - 10, 34, 4);
      ctx.fillStyle = '#d9675c'; ctx.fillRect(m.x - 17, m.y - radius - 10, 34 * m.hp / m.maxHp, 4);
    }
  }
  function drawPlayer() {
    ctx.fillStyle = '#10150f77'; ctx.beginPath(); ctx.ellipse(player.x, player.y + 12, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d2a66b'; ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f1d6a0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#283b32'; ctx.beginPath(); ctx.arc(player.x, player.y + 1, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1d6a0'; ctx.beginPath(); ctx.arc(player.x + Math.cos(player.facing) * 6, player.y + Math.sin(player.facing) * 6, 2, 0, Math.PI * 2); ctx.fill();
    if (player.attack > 0) {
      ctx.strokeStyle = '#f3d386'; ctx.lineWidth = 4; ctx.globalAlpha = Math.min(1, player.attack * 3);
      ctx.beginPath(); ctx.arc(player.x, player.y, 31, player.facing - .8, player.facing + .8); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#f0ead8'; ctx.textAlign = 'center'; ctx.font = '10px Manrope'; ctx.fillText(player.name, player.x, player.y - 22); ctx.textAlign = 'left';
  }
  function drawRemote(p) {
    ctx.fillStyle = '#b7a5d8'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dfd2f1'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f0ead8'; ctx.textAlign = 'center'; ctx.font = '10px Manrope'; ctx.fillText(p.name, p.x, p.y - 20); ctx.textAlign = 'left';
  }
  function rectCircleOverlap(rect, x, y, r) {
    const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
  }
  function canOccupy(x, y, radius, mob = null) {
    if (!isInWorld(x, y)) return false;
    const insideAltarCourt = x - radius > 14 && x + radius < 786 && y - radius > 584 && y + radius < 1046;
    if (mob && mob.summoned && !insideAltarCourt) return false;
    if (mob && mob.type === 'wolf' && rectCircleOverlap({ x: 1080, y: 650, w: 230, h: 230 }, x, y, radius)) return false;
    const insideExplorerShop = rectCircleOverlap(explorerShopBounds, x, y, radius);
    if (mob && insideExplorerShop) return false;
    if (!mob && !inventoryPanel.classList.contains('hidden') && inventoryPanel.getClientRects().length) {
      const canvasRect = canvas.getBoundingClientRect();
      const panelRect = inventoryPanel.getBoundingClientRect();
      const viewCameraX = player.x - canvasRect.width / 2;
      const viewCameraY = player.y - canvasRect.height / 2;
      const screenBounds = {
        x: panelRect.left - canvasRect.left,
        y: panelRect.top - canvasRect.top,
        w: panelRect.width,
        h: panelRect.height,
      };
      if (rectCircleOverlap(screenBounds, x - viewCameraX, y - viewCameraY, radius + 2)) return false;
    }
    return !(altarWalls.some(wall => rectCircleOverlap(wall, x, y, radius))
      || ((!altarDoor.open || (mob && !mob.summoned)) && rectCircleOverlap(altarDoor, x, y, radius))
      || bedchamberWalls.some(wall => rectCircleOverlap(wall, x, y, radius))
      || explorerShopWalls.some(wall => rectCircleOverlap(wall, x, y, radius))
      || ((!explorerDoor.open || mob) && rectCircleOverlap(explorerDoor, x, y, radius))
      || explorerShopCounters.some(counter => rectCircleOverlap(counter, x, y, radius))
      || crossroadsShopWalls.some(wall => rectCircleOverlap(wall, x, y, radius))
      || crossroadsShopCounters.some(counter => rectCircleOverlap(counter, x, y, radius))
      || crossroadsShopFixtures.some(fixture => rectCircleOverlap(fixture, x, y, radius))
      || (mob && crossroadsMerchants.some(merchant => rectCircleOverlap(merchant.bounds, x, y, radius)))
      || crossroadsMerchants.some(merchant => rectCircleOverlap({ x: merchant.x - 18, y: merchant.y - 18, w: 36, h: 36 }, x, y, radius))
      || groveStations.some(station => rectCircleOverlap({ x: station.x - 38, y: station.y - 17, w: 76, h: 48 }, x, y, radius)));
  }
  function movePlayer(dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 7));
    for (let i = 0; i < steps; i++) {
      const nx = player.x + dx / steps, ny = player.y + dy / steps;
      if (canOccupy(nx, ny, player.radius)) { player.x = nx; player.y = ny; }
      else {
        if (canOccupy(nx, player.y, player.radius)) player.x = nx;
        if (canOccupy(player.x, ny, player.radius)) player.y = ny;
      }
    }
  }
  function attack() {
    if (!$('shop-menu').classList.contains('hidden') || !$('altar-menu').classList.contains('hidden') || !$('station-confirm').classList.contains('hidden') || openingChest) return;
    const weapon = hotbar[selectedSlot];
    if (!weapon || weapon.kind !== 'weapon') return;
    if (player.attackCooldown > 0) return;
    const attackCooldown = weapon.attackCooldown || WEAPON_ATTACK_COOLDOWN;
    player.attackCooldown = attackCooldown;
    player.attack = .27;
    const empoweredStrike = Number.isFinite(weapon.specialChance) && Math.random() < weapon.specialChance;
    const damage = ((weapon.damage || 0) + player.damageBoost) * (empoweredStrike ? weapon.specialMultiplier : 1);
    let hitAny = false;
    mobs.forEach(m => {
      if (!m.alive) return;
      const dx = m.x - player.x, dy = m.y - player.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const delta = Math.atan2(Math.sin(angle - player.facing), Math.cos(angle - player.facing));
      const range = weapon.range || (weapon.id === 'slingshot' ? 250 : 57);
      const ranged = range > 100;
      if (dist < range && Math.abs(delta) < (ranged ? .19 : .95)) {
        const sabotage = Number.isFinite(weapon.sabotageChance) && Math.random() < weapon.sabotageChance;
        if (sabotage) {
          m.hp = Math.min(m.maxHp, m.hp + damage * weapon.enemyHealFraction);
          showToast(`${mobTypes[m.type].name} healed instead of damaged.`);
        } else if (damage > 0) m.hp -= damage;
        m.hit = .14; hitAny = true;
        if (Number.isFinite(weapon.stunChance) && Math.random() < weapon.stunChance) {
          m.stunned = weapon.stunDuration;
          showToast(`${mobTypes[m.type].name} stunned for ${weapon.stunDuration} seconds.`);
        }
        if (m.hp <= 0) killMob(m);
      }
    });
    if (!hitAny && weapon && weapon.id === 'slingshot') showToast('The shot missed.');
  }
  function killMob(m, rewardPlayer = true) {
    m.alive = false;
    const data = mobTypes[m.type];
    if (rewardPlayer) {
      player.coins = Math.min(250000, player.coins + data.coins);
      gainXp(data.xp);
    }
    const wildMob = m.type === 'frog' || m.type === 'pig' || m.type === 'wolf';
    const lootIds = [];
    if (wildMob) lootIds.push('meat');
    if (m.type === 'frog' && Math.random() < 1 / 3) lootIds.push('frog-leather');
    if (m.type === 'wolf') lootIds.push('wolf-fur');
    if (m.type === 'pig' && Math.random() < .2) lootIds.push('fat');
    if (m.type === 'pig' && Math.random() < .7) lootIds.push('pig-leather');
    if (m.type === 'frog' && Math.random() < .3) lootIds.push('copper');
    const boneChance = m.type === 'pig' ? .5 : m.type === 'frog' || m.type === 'wolf' ? 1 / 3 : 0;
    if (boneChance && Math.random() < boneChance) lootIds.push('bone');
    if (wildMob && Math.random() < .2) lootIds.push('common-chest');
    lootIds.forEach((id, index) => {
      const amount = id === 'gold-stone' ? 3 + Math.floor(Math.random() * 7) : 1;
      drops.push({
        x: m.x + (index % 3 - 1) * 18,
        y: m.y + (Math.floor(index / 3) - 1) * 18,
        item: createItem(id, amount),
        life: 28,
      });
    });
    if (wildMob && Math.random() < .4) {
      const goldIndex = lootIds.length;
      drops.push({
        x: m.x + (goldIndex % 3 - 1) * 18,
        y: m.y + (Math.floor(goldIndex / 3) - 1) * 18,
        item: createItem('gold-stone', 3 + Math.floor(Math.random() * 7)),
        life: 28,
      });
    }
    if (rewardPlayer && !m.summoned) {
      showToast(`${data.name} defeated · +${data.xp} XP · +${data.coins} coins`);
      updateHud();
    }
  }
  function gainXp(amount) {
    player.xp += amount;
    let leveledUp = false;
    while (player.level < 50) {
      const need = 24 + player.level * 13;
      if (player.xp < need) break;
      player.xp -= need;
      player.level++;
      leveledUp = true;
    }
    if (leveledUp) showToast(`Level up! You are now level ${player.level}.`);
  }
  function pickupNearbyDrop() {
    let nearestDrop = -1;
    let nearestDropDistance = 52;
    drops.forEach((drop, index) => {
      const distance = Math.hypot(drop.x - player.x, drop.y - player.y);
      if (distance < nearestDropDistance) {
        nearestDrop = index;
        nearestDropDistance = distance;
      }
    });
    if (nearestDrop >= 0) {
      const [picked] = drops.splice(nearestDrop, 1);
      if (!addInventory(picked.item)) {
        drops.splice(nearestDrop, 0, picked);
        showToast('Your backpack and hotbar are full.');
      } else showToast(`Picked up ${picked.item.name}.`);
      return;
    }
    showToast('No item nearby to pick up.');
  }
  function interact() {
    if (!explorerDoor.open && rectCircleOverlap({ x: explorerDoor.x - 25, y: explorerDoor.y - 25, w: explorerDoor.w + 50, h: explorerDoor.h + 50 }, player.x, player.y, 1)) {
      explorerDoor.open = true;
      explorerDoorCloseTimer = 3;
      showToast('Explorer shop door opened. Walk through.');
      return;
    }
    const merchant = crossroadsMerchants.find(entry => Math.hypot(player.x - entry.x, player.y - entry.y) < 60);
    if (merchant) {
      openShopMenu(merchant.id === 'wizard'
        ? { title: "Wizard's House", kicker: 'CROSSROADS', description: 'Rare equipment and potions. Wizard materials are not obtainable yet.', recipes: wizardShopRecipes }
        : { title: "Cowboy's House", kicker: 'CROSSROADS', description: 'Shovels for sale. Select a tier to purchase it.', recipes: cowboyShopRecipes });
      return;
    }
    const station = groveStations.find(entry => Math.hypot(player.x - entry.x, player.y - entry.y) < 65);
    if (station) {
      openStationConfirmation(station);
      return;
    }
    if (rectCircleOverlap(explorerShopBounds, player.x, player.y, 1)) {
      openShopMenu();
      return;
    }
    if (!altarDoor.open && rectCircleOverlap({ x: altarDoor.x - 25, y: altarDoor.y - 25, w: altarDoor.w + 50, h: altarDoor.h + 50 }, player.x, player.y, 1)) {
      altarDoor.open = true;
      altarDoorCloseTimer = 3;
      showToast('Altar door opened. Walk through.');
      return;
    }
    const altarDistance = Math.hypot(player.x - 395, player.y - 810);
    if (altarDistance < 122) {
      if (altar.summon) return showToast('A summon is already active.');
      if (altar.loot > 0) return showToast('Wait for the altar loot window to end.');
      showToast('Press R to offer items at the altar.');
      return;
    }
    if (Math.hypot(player.x - 395, player.y - 810) < 185) return showToast('Stand closer to the altar and press Space.');
    showToast('Nothing nearby to interact with.');
  }
  function openAltarMenu() {
    if (Math.hypot(player.x - 395, player.y - 810) > 145) {
      showToast('Move closer to the altar to offer items.');
      return;
    }
    if (altar.summon || altar.loot > 0) {
      showToast(altar.summon ? 'A summon is already active.' : 'Wait for the altar loot window to end.');
      return;
    }
    $('altar-menu').classList.remove('hidden');
    $('offering-amount').value = '1';
    updateAltarMenu();
    $('offering-amount').focus();
    $('offering-amount').select();
  }
  function closeAltarMenu() {
    $('altar-menu').classList.add('hidden');
  }
  function openShopMenu(shop = { title: "Explorer's House", kicker: 'WESTERN GROVE', description: 'Common items for coins and materials. Select a recipe to buy it.', recipes: explorerShopRecipes }) {
    keys.clear();
    closeAltarMenu();
    activeShopRecipes = shop.recipes;
    $('shop-kicker').textContent = shop.kicker;
    $('shop-menu-title').textContent = shop.title;
    $('shop-menu-close').setAttribute('aria-label', `Close ${shop.title}`);
    $('shop-description').textContent = shop.description;
    $('shop-menu').classList.remove('hidden');
    renderShopRecipes(shop.recipes);
  }
  function closeShopMenu() {
    $('shop-menu').classList.add('hidden');
    hideItemTooltip();
  }
  function openStationConfirmation(station) {
    keys.clear();
    pendingStation = station;
    $('station-confirm-title').textContent = station.name;
    $('station-confirm-prompt').textContent = station.id === 'gambling-pedestal'
      ? 'Use the selected hotbar stack: 40% chance to double the entire stack, 60% chance to destroy the entire stack.'
      : `Do you want to use the ${station.name}?`;
    $('station-confirm').classList.remove('hidden');
    $('station-confirm-yes').focus();
  }
  function closeStationConfirmation() {
    $('station-confirm').classList.add('hidden');
    pendingStation = null;
  }
  function confirmStationUse() {
    if (!pendingStation) return;
    const stationMessages = {
      'ancient-anvil': 'Ancient Anvil · convert a held item into XP for 10 coins.',
      'blast-furnace': 'Blast Furnace · cooking and smelting costs 5 coins.',
      'level-pedestal': 'Level Pedestal · use for a risky level attempt (25 coins).',
      'item-pedestal': 'Item Pedestal · station is ready for its item function.',
      'gambling-pedestal': 'Gambling Pedestal · gamble the entire selected stack for a chance to double it.',
    };
    const stationId = pendingStation.id;
    closeStationConfirmation();
    if (stationId === 'blast-furnace') {
      if (inventoryCount('meat') < 1) return showToast('You need Meat to cook.');
      const cookedMeat = createItem('cooked-meat');
      if (!canStoreShopItem(cookedMeat)) return showToast('Your backpack and hotbar are full.');
      consumeInventoryItem('meat', 1);
      addInventory(cookedMeat);
      renderInventory();
      return showToast('Cooked 1 Meat into Cooked Meat.');
    }
    if (stationId === 'gambling-pedestal') {
      const item = hotbar[selectedSlot];
      if (!item) return showToast('Select a held hotbar stack to gamble.');
      if (Math.random() < .4) {
        const doubledStack = { ...item, count: item.count * 2 };
        if (!canStoreItems([doubledStack], hotbar, selectedSlot)) {
          return showToast('Not enough inventory space to double that stack. Nothing was gambled.');
        }
        hotbar[selectedSlot] = null;
        if (!addInventory(doubledStack)) {
          hotbar[selectedSlot] = item;
          return showToast('Could not store the doubled stack. Nothing was gambled.');
        }
        updateHud();
        return showToast(`Gambling success · ${item.name} stack doubled to ${doubledStack.count}.`);
      }
      hotbar[selectedSlot] = null;
      renderInventory();
      updateHud();
      return showToast(`Gambling failed · the entire ${item.name} stack was destroyed.`);
    }
    const message = stationMessages[stationId];
    if (!message) return showToast('This station is not available.');
    showToast(message);
  }
  function offerSelectedItems(event) {
    event.preventDefault();
    if (Math.hypot(player.x - 395, player.y - 810) > 145) return showToast('Move closer to the altar to offer items.');
    const item = hotbar[selectedSlot];
    const amount = Number.parseInt($('offering-amount').value, 10);
    if (!item || !Number.isInteger(item.worth) || item.worth <= 0) return showToast('Select an item with altar worth first.');
    if (item.altarDroppable === false) return showToast('You cannot drop this');
    if (!Number.isInteger(amount) || amount < 1 || amount > item.count) return showToast('Enter a valid amount from the selected stack.');
    if (altar.summon || altar.loot > 0) return showToast('The altar is not accepting offerings right now.');

    item.count -= amount;
    if (item.count === 0) hotbar[selectedSlot] = null;
    altar.offeringWorth += item.worth * amount;
    if (altar.countdown === 0) {
      altar.countdown = 15;
      showToast(`Offering accepted · worth ${altar.offeringWorth} · summon in 15 seconds`);
    } else showToast(`Offering accepted · total worth ${altar.offeringWorth}`);
    closeAltarMenu();
    renderInventory();
    updateHud();
  }
  function tickMobs(dt) {
    mobs.forEach(m => {
      if (!m.alive) return;
      const data = mobTypes[m.type];
      m.hit = Math.max(0, m.hit - dt);
      m.attackCd = Math.max(0, m.attackCd - dt);
      m.stunned = Math.max(0, (m.stunned || 0) - dt);
      if (m.stunned > 0) return;
      const dx = player.x - m.x, dy = player.y - m.y, dist = Math.hypot(dx, dy);
      const hostile = m.summoned || m.type === 'wolf' || m.type === 'glob';
      if (hostile && dist < 390) {
        if (dist > 30) {
          const nx = m.x + dx / Math.max(1, dist) * data.speed * dt;
          const ny = m.y + dy / Math.max(1, dist) * data.speed * dt;
          if (canOccupy(nx, ny, 13, m)) { m.x = nx; m.y = ny; }
          else {
            if (canOccupy(nx, m.y, 13, m)) m.x = nx;
            if (canOccupy(m.x, ny, 13, m)) m.y = ny;
          }
        } else if (hostile && m.attackCd <= 0) {
          if (Math.random() < carriedItemBonus('dodgeChance') / 100) {
            m.attackCd = 1.1;
            showToast('You dodged the attack.');
            return;
          }
          player.health -= data.damage;
          m.attackCd = 1.1;
          showToast(`${data.name} hit you for ${data.damage}.`);
        }
      } else if (m.type === 'wolf') {
        let prey = null;
        let preyDistance = 280;
        mobs.forEach(candidate => {
          if (!candidate.alive || (candidate.type !== 'frog' && candidate.type !== 'pig')) return;
          const distance = Math.hypot(candidate.x - m.x, candidate.y - m.y);
          if (distance < preyDistance) {
            prey = candidate;
            preyDistance = distance;
          }
        });
        if (prey && preyDistance > 30) {
          const preyDx = prey.x - m.x, preyDy = prey.y - m.y;
          const nx = m.x + preyDx / preyDistance * data.speed * dt;
          const ny = m.y + preyDy / preyDistance * data.speed * dt;
          if (canOccupy(nx, ny, 13, m)) { m.x = nx; m.y = ny; }
          else {
            if (canOccupy(nx, m.y, 13, m)) m.x = nx;
            if (canOccupy(m.x, ny, 13, m)) m.y = ny;
          }
        } else if (prey && m.attackCd <= 0) {
          prey.hp -= data.damage;
          prey.hit = .14;
          m.attackCd = 1.1;
          if (prey.hp <= 0) killMob(prey, false);
        } else {
          m.wander -= dt;
          if (m.wander <= 0) { m.dir += (Math.random() - .5) * 2; m.wander = 1.2 + Math.random() * 2.3; }
          const nx = m.x + Math.cos(m.dir) * data.speed * .2 * dt;
          const ny = m.y + Math.sin(m.dir) * data.speed * .2 * dt;
          if (canOccupy(nx, ny, 13, m)) { m.x = nx; m.y = ny; }
        }
      } else {
        m.wander -= dt;
        if (m.wander <= 0) { m.dir += (Math.random() - .5) * 2; m.wander = 1.2 + Math.random() * 2.3; }
        const nx = m.x + Math.cos(m.dir) * data.speed * .2 * dt;
        const ny = m.y + Math.sin(m.dir) * data.speed * .2 * dt;
        if (canOccupy(nx, ny, 13, m)) { m.x = nx; m.y = ny; }
        else {
          if (canOccupy(nx, m.y, 13, m)) m.x = nx;
          if (canOccupy(m.x, ny, 13, m)) m.y = ny;
          m.dir += Math.PI * (.5 + Math.random());
        }
      }
    });
  }
  function isInsideAltarCourt(x, y) {
    return x > 14 && x < 786 && y > 584 && y < 1046;
  }
  function update(dt) {
    const zone = zoneAt(player.x, player.y);
    player.health = Math.min(player.health, playerMaxHealth());
    player.hunger = Math.min(player.hunger, playerMaxHunger());
    const currentSpeed = Math.min(playerMaxSpeed(), 6 + player.speedBonus + (player.energyBoost > 0 ? 2.5 : 0));
    const speed = player.speed * currentSpeed / 6 * (player.hunger < 25 ? .7 : 1);
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy--;
    if (keys.has('s') || keys.has('arrowdown')) dy++;
    if (keys.has('a') || keys.has('arrowleft')) dx--;
    if (keys.has('d') || keys.has('arrowright')) dx++;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx = dx / len * speed * dt; dy = dy / len * speed * dt;
      movePlayer(dx, dy);
    }
    if (altarDoor.open) {
      altarDoorCloseTimer -= dt;
      if (altarDoorCloseTimer <= 0 && !rectCircleOverlap(altarDoor, player.x, player.y, player.radius)) {
        altarDoor.open = false;
        altarDoorCloseTimer = 0;
      }
    }
    if (explorerDoor.open) {
      explorerDoorCloseTimer -= dt;
      if (explorerDoorCloseTimer <= 0 && !rectCircleOverlap(explorerDoor, player.x, player.y, player.radius)) {
        explorerDoor.open = false;
        explorerDoorCloseTimer = 0;
      }
    }
    player.hunger = Math.max(0, player.hunger - .02 * dt);
    if (player.hunger <= 0) player.health = Math.max(0, player.health - 2 * dt);
    if (player.energyBoost > 0) {
      player.energyBoost = Math.max(0, player.energyBoost - dt);
      if (player.energyBoost === 0) showToast('Energy Drink effect ended.');
    }
    if (player.damageBoost > 0) {
      player.damageBoost = Math.max(0, player.damageBoost - dt);
      if (player.damageBoost === 0) showToast('Rage Potion effect ended.');
    }
    if (player.luckBoost > 0) {
      player.luckBoost = Math.max(0, player.luckBoost - dt);
      if (player.luckBoost === 0) showToast('Luck Potion effect ended.');
    }
    if (openingChest) {
      openingChest.remaining = Math.max(0, openingChest.remaining - dt);
      updateChestOpening();
      if (openingChest.remaining === 0) finishCommonChest();
    }
    player.attack -= dt; player.attackCooldown -= dt;
    tickMobs(dt);
    drops.forEach(d => d.life -= dt);
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life <= 0) drops.splice(i, 1);
    const playersInAltar = isInsideAltarCourt(player.x, player.y)
      || remotePlayers.some(remote => isInsideAltarCourt(remote.x, remote.y));
    if ((altar.countdown > 0 || altar.summon || altar.loot > 0) && !playersInAltar) {
      mobs.forEach(mob => {
        if (mob.summoned) mob.alive = false;
      });
      altar = { offeringWorth: 0, countdown: 0, summon: 0, fight: 0, boss: null, tier: null, loot: 0 };
      showToast('The altar resets because no players remain in the court.');
    } else if (altar.countdown > 0) {
      altar.countdown -= dt;
      if (altar.countdown <= 0) {
        const tier = getAltarTier(altar.offeringWorth);
        if (!tier) {
          altar = { offeringWorth: 0, countdown: 0, summon: 0, fight: 0, boss: null, tier: null, loot: 0 };
          showToast('The offering was not valuable enough to summon a monster.');
        } else {
          altar.countdown = 0;
          altar.summon = 1;
          altar.fight = 120;
          altar.boss = mobTypes[tier.type].name;
          altar.tier = tier.tier;
          const summonedMob = makeMob(tier.type, 395, 704, Date.now() % 50);
          summonedMob.summoned = true;
          mobs.push(summonedMob);
          showToast(`${tier.tier} summon · ${altar.boss} has arrived!`);
        }
      }
    } else if (altar.summon) {
      altar.fight -= dt;
      const livingSummons = mobs.filter(m => m.summoned && m.alive);
      if (!livingSummons.length) {
        altar.summon = 0;
        altar.loot = 15;
        altar.boss = null;
        altar.tier = null;
        const xpReward = altar.offeringWorth * 50;
        gainXp(xpReward);
        showToast(`Summon defeated · +${xpReward} XP · loot window: 15 seconds.`);
      } else if (altar.fight <= 0) {
        livingSummons.forEach(mob => { mob.alive = false; });
        altar.summon = 0;
        altar.boss = null;
        altar.tier = null;
        altar.offeringWorth = 0;
        showToast('The summon escaped. The altar resets without loot.');
      }
    } else if (altar.loot > 0) {
      altar.loot -= dt;
      if (altar.loot <= 0) { altar.offeringWorth = 0; altar.loot = 0; }
    }
    if (player.health <= 0) {
      let revived = false;
      if (Math.random() < .8) {
        for (const slots of [hotbar, inventory]) {
          const soulSlot = slots.findIndex(item => item && item.id === 'soul-stone');
          if (soulSlot < 0) continue;
          consumeInventoryItem('soul-stone', 1);
          revived = true;
          break;
        }
      }
      if (revived) {
        player.health = playerMaxHealth();
        player.x = BEDCHAMBER.x;
        player.y = BEDCHAMBER.y;
        renderInventory();
        showToast('Soul Stone revived you in the bedchamber.');
      } else {
      player.health = playerMaxHealth(); player.hunger = Math.max(player.hunger, 25); player.level = Math.max(0, player.level - 1); player.xp = 0; player.x = BEDCHAMBER.x; player.y = BEDCHAMBER.y;
      showToast('You fell in battle. Respawned in the bedchamber; lost one level.');
      }
    }
    updateHud();
    void zone;
  }
  function frame(now) {
    const dt = Math.min(.04, (now - lastTime) / 1000);
    lastTime = now;
    if (!paused) update(dt);
    drawWorld();
    requestAnimationFrame(frame);
  }
  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left + camera.x, y: event.clientY - rect.top + camera.y };
  }
  canvas.addEventListener('mousemove', event => {
    const p = worldPoint(event);
    player.facing = Math.atan2(p.y - player.y, p.x - player.x);
  });
  canvas.addEventListener('mousedown', event => { if (event.button === 0) attack(); });
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (key === 'escape' && !$('shop-menu').classList.contains('hidden')) {
      event.preventDefault();
      closeShopMenu();
      return;
    }
    if (key === 'escape' && !$('altar-menu').classList.contains('hidden')) {
      event.preventDefault();
      closeAltarMenu();
      return;
    }
    if (key === 'escape' && !$('station-confirm').classList.contains('hidden')) {
      event.preventDefault();
      closeStationConfirmation();
      return;
    }
    if (key === 'escape' && openingChest) {
      event.preventDefault();
      cancelChestOpening();
      return;
    }
    if (!$('shop-menu').classList.contains('hidden') || !$('altar-menu').classList.contains('hidden') || !$('station-confirm').classList.contains('hidden')) return;
    if (openingChest) return;
    if (event.target instanceof HTMLInputElement) return;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat && [' ', 'i', 'f'].includes(key)) return;
    keys.add(key);
    if (key >= '1' && key <= '9') { selectedSlot = Number(key) - 1; renderInventory(); updateAltarMenu(); }
    if (key === ' ') interact();
    if (key === 'e') pickupNearbyDrop();
    if (key === 'f') {
      const item = hotbar[selectedSlot];
      if (item) useItem(item, hotbar, selectedSlot);
      else showToast('Select an item to use.');
    }
    if (key === 'i') toggleInventory();
    if (key === 'r') openAltarMenu();
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  function toggleInventory() {
    const isOpen = $('inventory-panel').classList.toggle('hidden') === false;
    $('inventory-toggle').setAttribute('aria-expanded', String(isOpen));
  }
  $('inventory-toggle').addEventListener('click', toggleInventory);
  $('altar-menu-close').addEventListener('click', closeAltarMenu);
  $('shop-menu-close').addEventListener('click', closeShopMenu);
  $('station-confirm-close').addEventListener('click', closeStationConfirmation);
  $('station-confirm-no').addEventListener('click', closeStationConfirmation);
  $('station-confirm-yes').addEventListener('click', confirmStationUse);
  $('chest-opening-cancel').addEventListener('click', cancelChestOpening);
  $('altar-cancel').addEventListener('click', closeAltarMenu);
  $('altar-offer-form').addEventListener('submit', offerSelectedItems);
  $('offering-amount').addEventListener('input', updateAltarMenu);
  $('chat-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (networkId) {
      try {
        await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: networkId, name: player.name, text }) });
      } catch (error) { addChat(player.name, text); }
    } else addChat(player.name, text);
  });
  function addChat(name, text, system = false) {
    const row = document.createElement('div');
    row.className = system ? 'system-message' : 'chat-line';
    if (system) row.textContent = text;
    else { const b = document.createElement('b'); b.textContent = `${name}: `; row.append(b, document.createTextNode(text)); }
    $('chat-log').appendChild(row);
    while ($('chat-log').children.length > 30) $('chat-log').firstChild.remove();
    $('chat-log').scrollTop = $('chat-log').scrollHeight;
  }
  async function networkTick() {
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: networkId, name: player.name, level: player.level, x: player.x, y: player.y }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!networkId) networkId = data.id;
      remotePlayers = data.players.filter(p => p.id !== networkId);
      $('player-count').textContent = data.players.length;
      $('server-lifespan').textContent = `${data.uptimeMinutes} minutes`;
      $('players-list').innerHTML = '';
      data.players.sort((a, b) => b.level - a.level).forEach(p => {
        const row = document.createElement('li');
        row.textContent = p.name;
        const level = document.createElement('span');
        level.textContent = `Level ${p.level}`;
        row.appendChild(level);
        $('players-list').appendChild(row);
      });
      $('connection-label').textContent = 'Co-op session';
      $('connection-dot').classList.add('connected');
      const chatRes = await fetch(`/api/chat?since=${chatSince}`);
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        chatData.messages.forEach(m => { if (m.id !== networkId || m.fromServer) addChat(m.name, m.text, m.fromServer); chatSince = Math.max(chatSince, m.seq); });
      }
    } catch (error) {
      remotePlayers = [];
      $('players-online').textContent = 'Solo world';
      $('connection-label').textContent = 'Local prototype';
      $('connection-dot').classList.remove('connected');
    }
  }
  async function connect() {
    try {
      const response = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: player.name, level: player.level, x: player.x, y: player.y }) });
      if (!response.ok) throw new Error('Local server unavailable');
      const data = await response.json();
      networkId = data.id;
      $('player-count').textContent = data.players.length;
      $('server-lifespan').textContent = `${data.uptimeMinutes} minutes`;
      $('players-list').innerHTML = '';
      data.players.forEach(p => {
        const row = document.createElement('li');
        row.textContent = p.name;
        const level = document.createElement('span');
        level.textContent = `Level ${p.level}`;
        row.appendChild(level);
        $('players-list').appendChild(row);
      });
      $('connection-label').textContent = 'Co-op session';
      $('connection-dot').classList.add('connected');
      addChat('', 'Co-op server connected. Share this address to play together.', true);
      netInterval = setInterval(networkTick, 500);
    } catch (error) {
      $('connection-label').textContent = 'Local prototype';
    }
  }
  window.addEventListener('beforeunload', () => { if (netInterval) clearInterval(netInterval); });
  renderInventory();
  updateHud();
  connect();
  requestAnimationFrame(frame);
})();

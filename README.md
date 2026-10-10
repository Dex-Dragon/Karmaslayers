# Karmaslayers — Co-op Prototype

A small, original-art browser prototype for testing the top-down co-op direction. The UI follows the supplied arrangement: world view across the screen, player list at the upper right, 6×3 backpack at the right, chat at lower left, and a 9-slot hotbar with health, speed, hunger, and experience bars at bottom center. It uses simple canvas-drawn placeholder visuals rather than the reference game's art.

## Run

Install Node.js, then from this folder run:

```powershell
node server.js
```

Open `http://localhost:8080` in a browser. To test co-op on the same network, open that address on other devices using this computer's local IP address. There are no external packages to install.

## Controls

- **WASD / arrow keys:** move
- **Mouse:** aim
- **Left click:** attack with selected hotbar item
- **1–9:** select hotbar slot
- **E:** pick up nearby loot
- **F:** use the selected hotbar consumable or open a selected Common Chest
- **Space:** open a nearby door
- **Space near a grove station:** open a Yes/No confirmation before using it; the Gambling Pedestal wagers the entire selected hotbar stack
- **R near the altar:** open the offering menu; enter a quantity from the selected hotbar stack
- **I** or the **Backpack** button: open/close the 6×3 backpack
- **Chat box:** send shared messages when connected to the server

The connected map has a bedchamber, altar court, marsh, mudfields, and wolfwood. The western grove contains the Ancient Anvil, Blast Furnace, Level Pedestal, Item Pedestal, Gambling Pedestal, and the walk-in Explorer Shop with a Space-operated door, L-shaped counter, and shopkeeper. The station clearing is now the sandy Treasure Room, with the reference's Level 10 label; item-granted XP is doubled while inside. Press **Space** near a station for its Yes/No confirmation; the Blast Furnace cooks one Meat into Cooked Meat, and the Gambling Pedestal has a 40% chance to double the entire selected hotbar stack or a 60% chance to destroy the entire stack.

Press **Space** inside the Explorer Shop to view recipes. In addition to the listed Wolf Helmet (8 Wolf Fur), Bone Mace (3 Bone), Bone Bow (3 Bone), 16 Energy Drinks (1 Wolf Fur, 2 Bone), Frog Helmet (12 Frog Leather), 32 Med Kits (5 Bone, 3 Pig Leather), Pig Helmet (12 Pig Leather), Bone Helmet (125 Coins, 12 Bone), Pig Totem (24 Pig Leather), Wolf Totem (16 Wolf Fur), Frog Totem (24 Frog Leather), Bloody Spine (125 Coins, 4 Bone, 4 Meat), Bone Spear (125 Coins, 12 Bone), Beginner Emblem (125 Coins, 24 Frog Leather, 4 Copper), and Copper Shield (125 Coins, 4 Copper), the shop now offers Fur Helmet (5 Wolf Fur) and Leather Helmet (8 Frog Leather). Purchases validate their costs and inventory space before charging or consuming materials.

Armor and charms apply their passive stats whenever carried in either the hotbar or backpack; there are no separate equipment slots. Each distinct item type contributes its passive stats once while carried. Fur Helmet increases max health by 25%; Leather Helmet raises the speed cap to 22 and gives a 5% dodge chance; Pig Helmet raises max hunger to 150; Fabric Helmet's listed 25% bonus is for Magic Pot gold, but that feature is not in the prototype yet. Med Kits restore 20 health, Meat restores 10 hunger, Cooked Meat restores 25 hunger and grants 125 XP, and Energy Drinks restore 10 hunger and give +2.5 speed for 10 seconds (a temporary duration chosen for this prototype because the reference does not specify one). The Knife is a starter weapon with 25 base damage and a 500 ms cooldown. Bone Mace has the listed 25% chance to triple regular damage, and Bone Bow has the listed 25% chance to stun for 3 seconds; their base damage uses existing prototype weapon baselines because the references do not specify those values.

Wild-enemy loot uses the specified chances: Frog Leather drops from frogs at 1/3; Bone drops at 1/3 from frogs and wolves and 1/2 from pigs; Pig Leather drops from pigs at 70%; Fat drops from pigs at 20%; Copper drops from frogs at 30%; Common Chests drop from frogs, pigs, and wolves at 20%; and Gold Stones drop from each of those wild enemies at 40% in stacks of 3–9. Meat drops from frogs, pigs, and wolves, and Wolf Fur drops from wolves. Common Chests take 20 seconds to open by clicking them in the backpack or selecting one and pressing **F**. Opening yields 5–7 Gold Stones, one Fabric Helmet, and one Pebble Stone directly into inventory, provided there is room for all loot.

The Crossroads has walk-in Cowboy's and Wizard's Houses with shop menus. Shop entries show the same item tooltip as hotbar items when hovered. The Cowboy sells Common, Uncommon, Rare, Epic, Legendary, and Mythic Shovels for 125, 250, 500, 1,000, 2,000, and 4,000 Coins respectively. The Wizard sells Gold Helmet (1 Battle Helmet + 2,500 Coins), Gold Sword (1 Battle Mace + 2,500 Coins), Gold Shield (5 Rage Potions + 2,500 Coins), Gold Bow (1 Battle Bow + 2,500 Coins), and Mythic Potion (5 Growth Potions + 5 Rage Potions + 2,500 Coins). The documented Legendary items are registered with their shown rarity, altar worth, stack size, effects, and weapon stats: Battle Helmet, Battle Mace, Battle Bow, Gold Skull, Soul Stone, Rush Staff, Rage Potion, Magical Scythe, Incineration Cannon, Growth Potion, Legendary Chest, and Legendary Shovel. Rage Potion grants +2.5 damage for 60 seconds, Growth Potion grants 2,500 XP, and Soul Stone consumes itself on a successful 80% revival. Legendary Chests take 360 seconds to open and give one weighted reward: 70% for 5–7 Gold Skulls, 20% for Battle Helmet, or 10% for Soul Stone. Shop item tooltips include recipe costs. Several listed sources are not available yet because the named Legendary bosses, Speedster, and Treasure Room are not implemented. Rush Staff's speed proc has no specified duration and the Gold Skull's Furnace recipe is unspecified. The Magical Scythe has a 12.5% chance to heal the enemy for half its normal hit damage instead of dealing damage on that hit. Weapon stats missing from the references use clearly noted prototype baselines.

Gold Stone's 1:1 coin crafting bench and listed special-drop sources are not present; Pebble Stone currently comes only from Common Chests. The Item Pedestal and Magic Pot are not implemented. Treasure Room treasure mining and chest-finding mechanics remain unimplemented.

Epic items from the supplied references are included: Epic Shovel (1,000 Coins at the Cowboy; 168 damage, 1-second cooldown, worth 24), Ceaseless Bow (42 damage every 250 ms), Recurve Bow (about 340.14 DPS; modeled as 340.14 damage every second because its cooldown is not listed), Frosty Staff (33.6 damage every 250 ms with a listed 6.25% Frozen chance), Heavy Sword (67.2 damage every 500 ms with a 12.5% chance to triple damage), Iron Helmet (+100% maximum health), Luck Potion (60-second timer), Recovery Potion (+250 health, +20 hunger, +5 speed, +500 XP), Medieval Club (prototype melee baseline because stats are not listed), and Explosive Stone (840 DPS modeled as 840 ranged damage once per second). Epic Chests take 180 seconds and roll one reward: 70% for 5–7 Gold Horseshoes, 20% Iron Helmet, or 10% Underground Stone. Boss and shop drop chances were not specified, so these sources are not simulated. Item XP attributes are doubled inside the Treasure Room. Frozen, Luck effects, Treasure Room mining, and Gambling Pedestal loot bonuses are not implemented yet.

The world sits on a surrounding void, and the camera remains centered on the player even at map edges; players cannot leave the map bounds. When the backpack panel is visible, its on-screen area blocks player movement so the character cannot pass beneath the inventory.

Outdoor areas are otherwise freely connected without doors; the altar court has a Space-operated door that closes automatically after opening. Wild mobs cannot enter the altar court, summoned enemies cannot leave it, and wolves cannot enter the bedchamber. When no player is within aggro range, wolves hunt nearby frogs and pigs. An active altar countdown, summon, or loot window resets when the court becomes empty. Items store altar `worth` separately from `altarDroppable`; altar offerings consume the selected hotbar stack and add each eligible item's worth. An offering starts a 15-second countdown and a successful summon awards 50 XP per offered worth. Supported tiers are Uncommon (worth 1+, Snotty Glob; 140+, Minotaur), Rare (500+, Cyclops), Epic (1060+, Demon), and Legendary (1820+, Dragon). Only one representative monster for the reached tier spawns; mixed altar groups are not implemented. The server synchronizes player presence/positions and chat, but combat, mobs, inventory, and altar simulation remain local to each browser. This is an early gameplay prototype, not a production persistence or authoritative multiplayer build.

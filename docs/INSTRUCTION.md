# Structure and Content Guide for Santaa Project

<p align="center">
  <a href="#1-overall-folder-structure">STRUCTURE</a> ·
  <a href="#2-how-bot-loads-commands">HOW BOT LOAD COMMANDS</a> ·
  <a href="#3-how-to-add-a-new-command">HOW TO ADD A NEW COMMAND</a> ·
  <a href="#4-item-system-srct-items">ITEMS SYSTEM</a> ·
  <a href="#5-minigames-system-srct-minigames">MINIGAMES</a> ·
  <a href="#6-data-management-database">DATABASE</a> ·
  <a href="#7-boss--memory-system">PVP BOSSES</a> ·
  <a href="#8-TO-DO">TODOs</a>
</p>

> ⚠️ **Huge Warning:** Do not delete any folders, files, or working logic in the bot's command loading section. If unsure, only add new items; do not deleted existing ones. (YOU HAVE TO FINISH SETUP ON README.md BEFORE READ THIS)

## 1. Overall Folder Structure

```text
Santaa/
├── docs/                   # Documents
├── database/               # SQLite data management (.db) and JSON config
│   ├── bosses/             # Boss configurations (JSON)
│   ├── bosses_memory/      # Boss state memory
│   ├── balance.db          # DB for money, bank, jobs (dbmanager.js)
│   ├── rpg.db              # DB for inventory, stats, pvp (rpgmanager.js)
│   ├── dbmanager.js        # Manages balance & jobs
│   └── rpgmanager.js       # Manages RPG (stats, items, pvp)
├── src/                    # Main bot source code
│   ├── index.js            # Entry point
│   ├── commands/           # Commands divided by category
│   │   ├── EconomicCMD/
│   │   ├── MainCMD/
│   │   ├── ownerCMD/
│   │   ├── UtilsCMD/        
│   │   ├── PVP/
│   │   ├── shop/
│   │   └── Utils/
│   ├── items/              # Item definitions (data-only)
│   │   ├── fish/           # Fish items
│   │   ├── mine/           # Material mining items
│   │   └── shopItems/      # Shop items (divided by shop: kimori, gepora)
│   ├── memes/              # Meme modules/commands
│   └── minigames/          # Minigames stuff
│       ├── Fishing/
│       ├── Mining/
│       └── Other/          # Other minigames (guessmeme, olympac)
├── README.md               # General project documentation
└── package.json            # Where running `npm run` scripts

(Other minor file or not necessary will not list here)
```

## 2. How Bot Loads Commands

In `src/index.js`, the bot uses the `commandFolders` array:
```js
const commandFolders = ['commands', 'minigames', 'memes'];
```
The bot recursively scans all `.js` files in these folders

**Rules:**
- Add a `.js` file to a subfolder of `commands`, `minigames`, `memes` $\rightarrow$ Bot loads it automatically.
- Add a new folder at the same level as `commands` $\rightarrow$ You must add that folder name to `commandFolders`.

## 3. How to add a new Command

1. **Create file:** Example `src/commands/MainCMD/hello.js` (Note: Creating a .js file directly inside the root commands folder is not recommended)
2. **Export structure:**
```js

// Add import or some function here, Make sure you move module.export at bottom

module.exports = {
  name: 'hello',
  description: 'Bot greeting command',
  category: 'gnr', // eco: Economic, gnr: General, owner: Owner, utl: Utils, mie: Minigames
  execute(message, args) {
    message.reply('Hello!');
  },
};
(To add a custom category, edit getOptions function in commands/utils/NavigateManager.js)
```
3. **Restart the bot.**

## 4. Item System (`src/items`)

This folder contains only data, not command execution logic.

### Folder Structure:
- `[mine/fish]/[Rarity]/item.js`: Divided by rarity (Common $\rightarrow$ Mythic) for the two minigames.
- `shopItems/[ShopName]/item.js`: Divided by shop name.

### Item File Format:
```js
module.exports = {
    id: 'stone',
    name: 'Stone',
    sell: 10,
    desc: 'Item description',
    type: ['consumable', 'sellable']
};

// By default, if the item belongs to only one type or than other types (such as equippable, consumable...) that are not related to:
// SELLABLE, UNSELLABLE, UNTRADEABLE-SELLABLE, UNTRADEABLE-UNSELLABLE, it will be default cannot be sold (but can still be traded).
```
## 5. Minigames System (`src/minigames`)

Complex minigames are usually divided into 3 parts:
- **Core (`...Core.js`):** Handles main logic and calculations.
- **UI (`...UI.js` or `...Board.js`):** Handles display and message formatting for the user.
- **List (`...list.js`):** List of items/rewards that can be obtained.
- **Main (`...js`):** Main command file connecting Core and UI.

Simple or other minigames type: only 1 single file .js

## 6. Data Management (Database)

The project uses SQLite, managed via two main modules in `database/`:

### `dbmanager.js` (Database: `balance.db`)
Manages finances and careers:
- **`balances` table:** `balance` (cash), `bank` (bank), `total_earned` (total earned).
- **`job_states` table:** Job status, number of times worked, time until fired.

### `rpgmanager.js` (Database: `rpg.db`)
Manages role-playing elements:
- **`inventory` table:** Stores items owned by the user.
- **`stats` table:** `health`, `stamina`, `attack`, `defense`, `level`, `exp`, `steals`, `equipped_items`.
- **`pvp_history` table:** PVP combat history, wins/losses.

## 7. Boss & Memory System

- `database/bosses/*.json`: Contains boss stats and skill configurations.
- `database/bosses_memory/*.json`: Stores current boss state (e.g., remaining health) so it isn't reset when the bot restarts.
---

## 8. TO DO
### ⚠️ Things not to do
- Do not delete/rename main folders: `commands`, `minigames`, `memes`, `items`, `database`.
- Do not modify the file scanning logic in `src/index.js` unless you fully understand it.
- Do not delete files without checking if they are imported anywhere.

### ✅ THINGS TO DO
- [ ] Remove all custom emojis (in `commands/utils/NavigateManager.js` and related button functions).
- [ ] Update emoji currency via `config.js` in the same folder.
- [ ] Implement reward logic in `src/minigames/Other/olympac.js`.

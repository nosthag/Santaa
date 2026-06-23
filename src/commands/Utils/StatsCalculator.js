const rpgmanager = require('../../../database/rpgmanager');
const path = require('path');
const fs = require('fs');

/**
 * Loads all item definitions from shopUtils directories.
 */
const loadItems = () => {
    const shopUtilsPath = path.join(__dirname, '..', 'shop', 'shopUtils');
    const allItems = new Map();
    const dirs = ['gepora', 'kimori'];

    for (const d of dirs) {
        const dirPath = path.join(shopUtilsPath, d);
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const item = require(path.join(dirPath, file));
                allItems.set(item.id, item);
            }
        }
    }
    return allItems;
};

// Cache items to avoid repeated disk reads
const allItemsCache = loadItems();

/**
 * Calculates the final stats for a user by combining base stats from DB 
 * with bonuses from their equipped item.
 */
async function getTotalStats(userId) {
    const baseStats = await rpgmanager.getStats(userId);

    let maxHealth = 100;
    let maxStamina = 100;
    let totalAttack = baseStats.attack;
    let totalDefense = baseStats.defense || 0;
    let equippedItemName = "None";

    if (baseStats.equipped_item_id) {
        const eqItem = allItemsCache.get(baseStats.equipped_item_id);
        if (eqItem) {
            equippedItemName = eqItem.name;
            if (eqItem.stats) {
                if (eqItem.stats.health) maxHealth += eqItem.stats.health;
                if (eqItem.stats.stamina) maxStamina += eqItem.stats.stamina;
                if (eqItem.stats.attack) totalAttack += eqItem.stats.attack;
                if (eqItem.stats.defense) totalDefense += eqItem.stats.defense;
            }
        }
    }

    return {
        ...baseStats,
        maxHealth,
        maxStamina,
        totalAttack,
        totalDefense,
        equippedItemName
    };
}

module.exports = { getTotalStats, allItemsCache };

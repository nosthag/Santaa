const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

module.exports = {
    async init() {
        db = await open({
            filename: './database/rpg.db',
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                item_id TEXT,
                item_name TEXT,
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS stats (
                user_id TEXT PRIMARY KEY,
                health INTEGER DEFAULT 100,
                stamina INTEGER DEFAULT 100,
                attack INTEGER DEFAULT 5,
                equipped_item_id TEXT DEFAULT NULL
            )
        `);
    },

    // Add item to inventory
    async addItem(userId, itemId, itemName) {
        return await db.run('INSERT INTO inventory (user_id, item_id, item_name) VALUES (?, ?, ?)', [userId, itemId, itemName]);
    },

    // Get user inventory
    async getInventory(userId) {
        return await db.all('SELECT * FROM inventory WHERE user_id = ? ORDER BY id ASC', [userId]);
    },

    // Remove single item from inventory
    async removeItem(inventoryId) {
        return await db.run('DELETE FROM inventory WHERE id = ?', [inventoryId]);
    },

    // Get user stats
    async getStats(userId) {
        let stats = await db.get('SELECT * FROM stats WHERE user_id = ?', [userId]);
        if (!stats) {
            await db.run('INSERT OR IGNORE INTO stats (user_id, health, stamina, attack, equipped_item_id) VALUES (?, 100, 100, 5, NULL)', [userId]);
            stats = { user_id: userId, health: 100, stamina: 100, attack: 5, equipped_item_id: null };
        }
        return stats;
    },

    // Update user stats (health, stamina)
    async updateStats(userId, health, stamina) {
        return await db.run('UPDATE stats SET health = ?, stamina = ? WHERE user_id = ?', [health, stamina, userId]);
    },

    // Equip item
    async equipItem(userId, itemId) {
        return await db.run('UPDATE stats SET equipped_item_id = ? WHERE user_id = ?', [itemId, userId]);
    },

    // Transfer an inventory item to another user (for trade)
    async transferItem(inventoryId, newUserId) {
        return await db.run('UPDATE inventory SET user_id = ? WHERE id = ?', [newUserId, inventoryId]);
    }
};

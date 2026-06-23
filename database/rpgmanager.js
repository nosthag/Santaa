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
                defense INTEGER DEFAULT 2,
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                equipped_item_id TEXT DEFAULT NULL
            )
        `);

        // Ensure columns exist for existing databases
        await db.exec(`
            ALTER TABLE stats ADD COLUMN defense INTEGER DEFAULT 2;
            ALTER TABLE stats ADD COLUMN level INTEGER DEFAULT 1;
            ALTER TABLE stats ADD COLUMN exp INTEGER DEFAULT 0;
        `).catch(() => { }); // Ignore error if columns already exist
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
            await db.run('INSERT OR IGNORE INTO stats (user_id, health, stamina, attack, defense, level, exp, equipped_item_id) VALUES (?, 100, 100, 5, 2, 1, 0, NULL)', [userId]);
            stats = { user_id: userId, health: 100, stamina: 100, attack: 5, defense: 2, level: 1, exp: 0, equipped_item_id: null };
        }
        return stats;
    },

    // Update general stats
    async updateStats(userId, health, stamina) {
        return await db.run('UPDATE stats SET health = ?, stamina = ? WHERE user_id = ?', [health, stamina, userId]);
    },

    // Specifically update attack/defense/level/exp
    async updateProgress(userId, { attack, defense, level, exp }) {
        const updates = [];
        const params = [];
        if (attack !== undefined) { updates.push('attack = ?'); params.push(attack); }
        if (defense !== undefined) { updates.push('defense = ?'); params.push(defense); }
        if (level !== undefined) { updates.push('level = ?'); params.push(level); }
        if (exp !== undefined) { updates.push('exp = ?'); params.push(exp); }

        if (updates.length === 0) return;
        params.push(userId);
        return await db.run(`UPDATE stats SET ${updates.join(', ')} WHERE user_id = ?`, params);
    },

    // Equip item
    async equipItem(userId, itemId) {
        return await db.run('UPDATE stats SET equipped_item_id = ? WHERE user_id = ?', [itemId, userId]);
    },

    // Transfer an inventory item to another user (for trade)
    async transferItem(inventoryId, newUserId) {
        return await db.run('UPDATE inventory SET user_id = ? WHERE id = ?', [newUserId, inventoryId]);
    },
};

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

module.exports = {
    async init() {
        db = await open({
            filename: './database/balance.db',
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS balances (
                user_id TEXT PRIMARY KEY,
                balance INTEGER DEFAULT 0,
                bank INTEGER DEFAULT 0
            )
        `);
        // for debug @
        // console.log("Database initialized and ready to use.");
    },

    // get user info
    async getUser(userId) {
        let user = await db.get('SELECT * FROM balances WHERE user_id = ?', [userId]);
        if (!user) {
            await db.run('INSERT OR IGNORE INTO balances (user_id, balance, bank) VALUES (?, 0, 0)', [userId]);
            user = { user_id: userId, balance: 0, bank: 0 };
        }
        return user;
    },

    // Update user info to database

    // Add money to user balance
    async addMoney(userId, amount) {
        return await db.run('UPDATE balances SET balance = balance + ? WHERE user_id = ?', [amount, userId]);
    },
    // Set user money
    async setMoney(userId, amount) {
        return await db.run('UPDATE balances SET balance = ? WHERE user_id = ?', [amount, userId]);
    },

    // Remove money from user balance
    async removeMoney(userId, amount) {
        return await db.run('UPDATE balances SET balance = balance - ? WHERE user_id = ?', [amount, userId]);
    },

    // Reset user balance to 0
    async resetMoney(userId) {
        return await db.run('UPDATE balances SET balance = 0 WHERE user_id = ?', [userId]);
    },

    // Remove money from user bank
    async removeBank(userId, amount) {
        return await db.run('UPDATE balances SET bank = bank - ? WHERE user_id = ?', [amount, userId]);
    },

    // Add money to user bank
    async addBank(userId, amount) {
        return await db.run('UPDATE balances SET bank = bank + ? WHERE user_id = ?', [amount, userId]);
    }
};
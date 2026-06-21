const {Collection, time} = require('discord.js');

const cooldown = new Collection();

module.exports = {
    /** 
     * @param {string} userID - ID of the user
     * @param {string} cmdName - Command name
     * @param {number} timeInMS - Cooldown time in milliseconds
     * @return {string|null} - return time left in human readable format or null if cooldown expired
     */
    checkCooldown(userID, cmdName, timeInMS) {
        if (!cooldown.has(cmdName)) {
            cooldown.set(cmdName, new Collection());
        }
        const now = Date.now();
        const timestamps = cooldown.get(cmdName);

        if (timestamps.has(userID)) {
            const expTime = timestamps.get(userID) + timeInMS;
            if (now < expTime) {
                const timeLeft = Math.ceil((expTime - now) / 1000);
                const minute = Math.floor(timeLeft / 60);
                const second = timeLeft % 60;

                return minute > 0 ? `${minute}m ${second}s` : `${second}s`;
            }
        }
        timestamps.set(userID, now);
        setTimeout(() => timestamps.delete(userID), timeInMS);
        return null;
    }
}
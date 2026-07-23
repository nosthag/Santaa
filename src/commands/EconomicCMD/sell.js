const { EmbedBuilder } = require('discord.js');
const rpgmanager = require('../../../database/rpgmanager');
const dbmanager = require('../../../database/dbmanager');
const { allItemsCache } = require('../Utils/StatsCalculator');

/**
 * @param {string}   userId    Discord user ID
 * @param {object}   itemData  Item definition from allItemsCache
 * @param {number}   quantity  Number of items to sell
 * @param {Function} replyFn   Async fn(content | { embeds }) to send a response
 * @returns {boolean}          true if sale completed, false on error
 */
async function executeSell(userId, itemData, quantity, replyFn) {
    // Guard: is_sellable
    if (!itemData.is_sellable) {
        await replyFn(`**${itemData.name}** is unsellable!`);
        return false;
    }

    // Guard: sell price
    const unitPrice = itemData.sell ?? 0;
    if (unitPrice <= 0) {
        await replyFn(`**${itemData.name}** is worthless, can't sell it.`);
        return false;
    }

    // Get inventory and find matching stack
    const inventory = await rpgmanager.getInventory(userId);
    const matchingItems = inventory.filter(inv => inv.item_id === itemData.id);

    if (matchingItems.length === 0) {
        await replyFn(`You don't have **${itemData.name}** in your inventory.`);
        return false;
    }

    if (matchingItems.length < quantity) {
        await replyFn(`You only have **${matchingItems.length}x ${itemData.name}**, not enough to sell **${quantity}**.`);
        return false;
    }

    // Unequip if equipped before selling
    const userStats = await rpgmanager.getStats(userId);
    let equippedArr = [];
    try { equippedArr = JSON.parse(userStats.equipped_items || '[]'); } catch (e) { }

    const isEquipped = equippedArr.includes(itemData.id);
    if (isEquipped) await rpgmanager.unequipItem(userId, itemData.id);

    // Remove items from inventory
    const toRemove = matchingItems.slice(0, quantity);
    for (const inv of toRemove) await rpgmanager.removeItem(inv.id);

    // Add money to balance
    const totalEarned = unitPrice * quantity;
    await dbmanager.addMoney(userId, totalEarned, { trackEarning: true });

    // Build result embed
    const userDb = await dbmanager.getUser(userId);

    const embed = new EmbedBuilder()
        .setTitle('Successfully sold an item!')
        .setColor(0x57F287)
        .addFields(
            { name: 'Item', value: `**${itemData.name}** x${quantity}`, inline: true },
            { name: 'Unit Price', value: `$${unitPrice.toLocaleString()}`, inline: true },
            { name: 'Total Earned', value: `**$${totalEarned.toLocaleString()}**`, inline: true },
            { name: 'Your Balance', value: `$${userDb.balance.toLocaleString()}`, inline: false },
        )
        .setFooter({ text: isEquipped ? 'Item was unequipped before selling.' : `Remaining in inventory: ${matchingItems.length - quantity}x ${itemData.name}` })
        .setTimestamp();

    await replyFn({ embeds: [embed] });
    return true;
}

module.exports = {
    name: 'sell',
    description: 'Sell items from your inventory for money',
    category: 'eco',
    usage: 'Zsell <item_name_or_id> <quantity>',

    executeSell, // re-exported for use by inventory.js sell button

    async execute(message, args) {
        if (!args || args.length === 0) {
            return message.reply('Usage: `Zsell <item name or id> <quantity>`');
        }

        // Parse quantity — last arg if it's a number, else default 1
        let quantity = 1;
        let itemQuery;

        const lastArg = args[args.length - 1];
        if (!isNaN(lastArg) && parseInt(lastArg) > 0) {
            quantity = parseInt(lastArg);
            itemQuery = args.slice(0, -1).join(' ').toLowerCase().trim();
        } else {
            itemQuery = args.join(' ').toLowerCase().trim();
        }

        if (!itemQuery) {
            return message.reply('Usage: `Zsell <item name or id> <quantity>`');
        }

        // Find item definition by name or id (case-insensitive)
        let itemData = null;
        for (const [, item] of allItemsCache) {
            if (item.id?.toLowerCase() === itemQuery || item.name?.toLowerCase() === itemQuery) {
                itemData = item;
                break;
            }
        }

        if (!itemData) {
            return message.reply(`Item **"${itemQuery}"** not found. Check the name and try again.`);
        }

        await executeSell(message.author.id, itemData, quantity, (content) => message.reply(content));
    }
};

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const rpgmanager = require('../../../database/rpgmanager');
const { getPaginationRow } = require('../Utils/NavigateManager');
const { getTotalStats, allItemsCache } = require('../Utils/StatsCalculator');

module.exports = {
    name: 'inventory',
    description: 'Check your stats and purchased items',
    category: 'eco',
    async execute(message, args) {
        let inventoryItems = await rpgmanager.getInventory(message.author.id);
        const allItems = allItemsCache;

        const itemsPerPage = 5;
        let totalPages = Math.max(1, Math.ceil(inventoryItems.length / itemsPerPage));
        let currentPage = 0;
        let selectedInventoryId = null;

        const generateEmbedAndComponents = async (page) => {
            const userStats = await getTotalStats(message.author.id);
            inventoryItems = await rpgmanager.getInventory(message.author.id);
            totalPages = Math.max(1, Math.ceil(inventoryItems.length / itemsPerPage));

            // Group items by item_id
            const groupedItems = [];
            const counts = {};
            inventoryItems.forEach(item => {
                if (!counts[item.item_id]) {
                    counts[item.item_id] = { ...item, count: 1 };
                    groupedItems.push(counts[item.item_id]);
                } else {
                    counts[item.item_id].count++;
                }
            });

            totalPages = Math.max(1, Math.ceil(groupedItems.length / itemsPerPage));

            // Stat Display
            let desc = `**❤️ Health:** ${userStats.health} / ${userStats.maxHealth}\n`;
            desc += `**⚡ Stamina:** ${userStats.stamina} / ${userStats.maxStamina}\n`;
            desc += `**🗡️ Attack:** ${userStats.totalAttack}\n`;
            desc += `**🛡️ Equipped:** ${userStats.equippedItemName || 'None'}\n\n`;

            const start = page * itemsPerPage;
            const currentItems = groupedItems.slice(start, start + itemsPerPage);

            if (groupedItems.length === 0) {
                desc += "🎒 *Your inventory is empty!*";
            } else {
                desc += "**Your Items:**\n" + currentItems.map((item, index) => {
                    return `**${start + index + 1}.** ${item.item_name} (x${item.count})`;
                }).join('\n');
            }


            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${message.author.username}'s Profile & Inventory`)
                .setDescription(desc)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total items: ${inventoryItems.length}` });

            const components = [];

            if (groupedItems.length > 0) {
                // Add Item Select Menu
                const selectOptions = currentItems.map((item, index) => ({
                    label: `${start + index + 1}. ${item.item_name}`,
                    value: item.item_id.toString(), // the item_id
                    description: `Quantity: x${item.count}`
                }));

                const selectRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('inv_select')
                        .setPlaceholder('Select an item to Use or Equip...')
                        .addOptions(selectOptions)
                );
                components.push(selectRow);
            }


            // Add Interaction Buttons if an item is selected
            if (selectedInventoryId) {
                const selectedInvItem = groupedItems.find(i => i.item_id.toString() === selectedInventoryId);
                if (selectedInvItem) {
                    const itemData = allItems.get(selectedInvItem.item_id);
                    if (itemData) {
                        const btnRow = new ActionRowBuilder();
                        if (itemData.type === 'consumable') {
                            btnRow.addComponents(new ButtonBuilder().setCustomId('inv_use').setLabel('Use').setStyle(ButtonStyle.Success).setEmoji('🍎'));
                        } else if (itemData.type === 'equippable') {
                            const isEquipped = userStats.equippedItemId === selectedInvItem.item_id;
                            btnRow.addComponents(new ButtonBuilder()
                                .setCustomId('inv_equip')
                                .setLabel(isEquipped ? 'Equipped' : 'Equip')
                                .setStyle(isEquipped ? ButtonStyle.Secondary : ButtonStyle.Primary)
                                .setDisabled(isEquipped)
                                .setEmoji('🛡️'));
                        }
                        if (btnRow.components.length > 0) components.push(btnRow);
                    }
                } else {
                    selectedInventoryId = null; // Item might have been consumed
                }
            }


            if (totalPages > 1) {
                components.push(getPaginationRow(page, totalPages));
            }

            return { embeds: [embed], components };
        };

        const response = await message.channel.send(await generateEmbedAndComponents(currentPage));

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Not your menu!', ephemeral: true });

            if (i.isStringSelectMenu() && i.customId === 'inv_select') {
                selectedInventoryId = i.values[0];
                await i.update(await generateEmbedAndComponents(currentPage));
                return;
            }

            if (i.isButton()) {
                if (['prev', 'next', 'first', 'last'].includes(i.customId)) {
                    switch (i.customId) {
                        case 'prev': currentPage--; break;
                        case 'next': currentPage++; break;
                        case 'first': currentPage = 0; break;
                        case 'last': currentPage = totalPages - 1; break;
                    }
                    selectedInventoryId = null; // reset selection on page change
                    await i.update(await generateEmbedAndComponents(currentPage));
                    return;
                }

                if (i.customId === 'inv_use' || i.customId === 'inv_equip') {
                    const rawInventory = await rpgmanager.getInventory(i.user.id);
                    const itemInstance = rawInventory.find(item => item.item_id.toString() === selectedInventoryId);

                    if (!itemInstance) return i.reply({ content: 'Item not found in inventory!', ephemeral: true });

                    const itemData = allItems.get(selectedInventoryId);
                    if (!itemData) return i.reply({ content: 'Invalid item data!', ephemeral: true });

                    let userStats = await rpgmanager.getStats(i.user.id);

                    if (i.customId === 'inv_use' && itemData.type === 'consumable') {
                        const fullStats = await getTotalStats(i.user.id);

                        let newHealth = userStats.health;
                        let newStamina = userStats.stamina;

                        if (itemData.effects.health) newHealth = Math.min(fullStats.maxHealth, newHealth + itemData.effects.health);
                        if (itemData.effects.stamina) newStamina = Math.min(fullStats.maxStamina, newStamina + itemData.effects.stamina);

                        await rpgmanager.updateStats(i.user.id, newHealth, newStamina);
                        await rpgmanager.removeItem(itemInstance.id);

                        selectedInventoryId = null;
                        await i.reply({ content: `✅ You used **${itemData.name}**!`, ephemeral: true });
                    } else if (i.customId === 'inv_equip' && itemData.type === 'equippable') {
                        if (userStats.equipped_item_id === itemData.id) {
                            return i.reply({ content: `You have already equipped **${itemData.name}**!`, ephemeral: true });
                        }
                        await rpgmanager.equipItem(i.user.id, itemData.id);
                        await i.reply({ content: `✅ You equipped **${itemData.name}**!`, ephemeral: true });
                    }

                    await response.edit(await generateEmbedAndComponents(currentPage));
                }

            }
        });

        collector.on('end', () => {
            if (response.components) {
                const disabledComponents = response.components.map(actionRow => {
                    return new ActionRowBuilder().addComponents(
                        actionRow.components.map(component => {
                            if (component.type === ComponentType.Button) {
                                return ButtonBuilder.from(component).setDisabled(true);
                            }
                            if (component.type === ComponentType.StringSelect) {
                                return StringSelectMenuBuilder.from(component).setDisabled(true);
                            }
                            return component;
                        })
                    );
                });
                response.edit({ components: disabledComponents }).catch(() => { });
            }
        });
    }
};

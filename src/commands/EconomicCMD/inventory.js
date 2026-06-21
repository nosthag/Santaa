const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const rpgmanager = require('../../../database/rpgmanager');
const { getPaginationRow } = require('../Utils/NavigateManager');
const fs = require('fs');
const path = require('path');

// Load all items into a map
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

module.exports = {
    name: 'inventory',
    description: 'Check your stats and purchased items',
    category: 'eco',
    async execute(message, args) {
        let inventoryItems = await rpgmanager.getInventory(message.author.id);
        const allItems = loadItems();

        const itemsPerPage = 5;
        let totalPages = Math.max(1, Math.ceil(inventoryItems.length / itemsPerPage));
        let currentPage = 0;
        let selectedInventoryId = null;

        const generateEmbedAndComponents = async (page) => {
            let userStats = await rpgmanager.getStats(message.author.id);
            inventoryItems = await rpgmanager.getInventory(message.author.id);
            totalPages = Math.max(1, Math.ceil(inventoryItems.length / itemsPerPage));

            // Calculate max health/stamina and total attack based on equipped item
            let maxHealth = 100;
            let maxStamina = 100;
            let totalAttack = 5;
            let equippedItemName = "None";

            if (userStats.equipped_item_id) {
                const eqItem = allItems.get(userStats.equipped_item_id);
                if (eqItem) {
                    equippedItemName = eqItem.name;
                    if (eqItem.stats) {
                        if (eqItem.stats.health) maxHealth += eqItem.stats.health;
                        if (eqItem.stats.stamina) maxStamina += eqItem.stats.stamina;
                        if (eqItem.stats.attack) totalAttack += eqItem.stats.attack;
                    }
                }
            }

            // Stat Display
            let desc = `**❤️ Health:** ${userStats.health} / ${maxHealth}\n`;
            desc += `**⚡ Stamina:** ${userStats.stamina} / ${maxStamina}\n`;
            desc += `**🗡️ Attack:** ${totalAttack}\n`;
            desc += `**🛡️ Equipped:** ${equippedItemName}\n\n`;

            const start = page * itemsPerPage;
            const currentItems = inventoryItems.slice(start, start + itemsPerPage);

            if (inventoryItems.length === 0) {
                desc += "🎒 *Your inventory is empty!*";
            } else {
                desc += "**Your Items:**\n" + currentItems.map((item, index) => {
                    return `**${start + index + 1}.** ${item.item_name} (\`${item.item_id}\`)`;
                }).join('\n');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${message.author.username}'s Profile & Inventory`)
                .setDescription(desc)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total items: ${inventoryItems.length}` });

            const components = [];

            if (inventoryItems.length > 0) {
                // Add Item Select Menu
                const selectOptions = currentItems.map((item, index) => ({
                    label: `${start + index + 1}. ${item.item_name}`,
                    value: item.id.toString(), // the inventory id (primary key)
                    description: `ID: ${item.item_id}`
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
                const selectedInvItem = inventoryItems.find(i => i.id.toString() === selectedInventoryId);
                if (selectedInvItem) {
                    const itemData = allItems.get(selectedInvItem.item_id);
                    if (itemData) {
                        const btnRow = new ActionRowBuilder();
                        if (itemData.type === 'consumable') {
                            btnRow.addComponents(new ButtonBuilder().setCustomId('inv_use').setLabel('Use').setStyle(ButtonStyle.Success).setEmoji('🍎'));
                        } else if (itemData.type === 'equippable') {
                            btnRow.addComponents(new ButtonBuilder().setCustomId('inv_equip').setLabel('Equip').setStyle(ButtonStyle.Primary).setEmoji('🛡️'));
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
                    const selectedInvItem = inventoryItems.find(item => item.id.toString() === selectedInventoryId);
                    if (!selectedInvItem) return i.reply({ content: 'Item not found in inventory!', ephemeral: true });

                    const itemData = allItems.get(selectedInvItem.item_id);
                    if (!itemData) return i.reply({ content: 'Invalid item data!', ephemeral: true });

                    let userStats = await rpgmanager.getStats(i.user.id);

                    if (i.customId === 'inv_use' && itemData.type === 'consumable') {
                        // Calculate max stats to cap healing
                        let maxHealth = 100;
                        let maxStamina = 100;
                        if (userStats.equipped_item_id) {
                            const eqItem = allItems.get(userStats.equipped_item_id);
                            if (eqItem && eqItem.stats) {
                                if (eqItem.stats.health) maxHealth += eqItem.stats.health;
                                if (eqItem.stats.stamina) maxStamina += eqItem.stats.stamina;
                            }
                        }

                        let newHealth = userStats.health;
                        let newStamina = userStats.stamina;

                        if (itemData.effects.health) newHealth = Math.min(maxHealth, newHealth + itemData.effects.health);
                        if (itemData.effects.stamina) newStamina = Math.min(maxStamina, newStamina + itemData.effects.stamina);

                        await rpgmanager.updateStats(i.user.id, newHealth, newStamina);
                        await rpgmanager.removeItem(selectedInvItem.id);

                        selectedInventoryId = null;
                        await i.reply({ content: `✅ You used **${itemData.name}**!`, ephemeral: true });
                    } else if (i.customId === 'inv_equip' && itemData.type === 'equippable') {
                        await rpgmanager.equipItem(i.user.id, itemData.id);
                        await i.reply({ content: `✅ You equipped **${itemData.name}**!`, ephemeral: true });
                    }

                    // Re-render
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

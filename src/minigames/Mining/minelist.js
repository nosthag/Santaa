const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { RARITY_CONFIG, mineralData } = require('./mineCore');
const { getPaginationRow } = require('../../commands/Utils/NavigateManager');

module.exports = {
    name: 'minelist',
    description: 'Display all mineable minerals categorized by rarity',
    category: 'mie',
    usage: 'Zminelist',
    async execute(message, args) {
        let currentPage = 0;
        const itemsPerPage = 5;
        let currentCategory = 'COMMON';

        const categories = Object.keys(RARITY_CONFIG).map(key => ({
            label: RARITY_CONFIG[key].label,
            value: key,
            emoji: RARITY_CONFIG[key].emoji
        }));

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('minelist_menu')
                .setPlaceholder('Select a rarity to view minerals...')
                .addOptions(categories)
        );

        const colorFor = (rarity) => {
            switch (rarity) {
                case 'COMMON': return 'Grey';
                case 'UNCOMMON': return 'Green';
                case 'RARE': return 'Blue';
                case 'EPIC': return 'Purple';
                case 'LEGENDARY': return 'Gold';
                case 'MYTHIC': return 'Red';
                default: return 'Grey';
            }
        };

        const generateEmbed = (category, page) => {
            const list = [...(mineralData[category] || [])].sort((a, b) => {
                return (a.sell - b.sell) || a.name.localeCompare(b.name);
            });
            const totalPages = Math.ceil(list.length / itemsPerPage) || 1;
            const start = page * itemsPerPage;
            const paged = list.slice(start, start + itemsPerPage);

            const displayContent = paged.map((item, index) => {
                return `**${start + index + 1}. ${item.name}** *${item.desc || ''}*\nValue: ${item.sell} coins`;
            }).join('\n\n') || 'No minerals found in this rarity.';

            return {
                embed: new EmbedBuilder()
                    .setTitle(`Mineral List - ${RARITY_CONFIG[category].label}`)
                    .setDescription(displayContent)
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}` }),
                totalPages
            };
        };

        const initial = generateEmbed(currentCategory, currentPage);
        const response = await message.reply({
            embeds: [initial.embed],
            components: [menuRow, ...(initial.totalPages > 1 ? [getPaginationRow(currentPage, initial.totalPages)] : [])]
        });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Not your menu!', ephemeral: true });

            if (i.isStringSelectMenu() && i.customId === 'minelist_menu') {
                currentCategory = i.values[0];
                currentPage = 0;
            } else if (i.isButton()) {
                switch (i.customId) {
                    case 'prev': currentPage--; break;
                    case 'next': currentPage++; break;
                    case 'first': currentPage = 0; break;
                    case 'last': {
                        const totalPages = Math.ceil((mineralData[currentCategory] || []).length / itemsPerPage);
                        currentPage = Math.max(0, totalPages - 1);
                        break;
                    }
                }
            }

            const result = generateEmbed(currentCategory, currentPage);
            const components = [menuRow];
            if (result.totalPages > 1) components.push(getPaginationRow(currentPage, result.totalPages));

            await i.update({ embeds: [result.embed], components });
        });
    }
};

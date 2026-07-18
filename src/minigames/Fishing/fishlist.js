const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { RARITY_CONFIG, fishData } = require('./fishCore');
const { getPaginationRow } = require('../../commands/Utils/NavigateManager');

module.exports = {
    name: 'fishlist',
    description: 'Display all catchable fish categorized by rarity',
    category: 'mie',
    async execute(message, args) {
        let currentPage = 0;
        const itemsPerPage = 5;
        let currentCategory = 'COMMON';

        const categories = Object.keys(RARITY_CONFIG).map(key => ({
            label: RARITY_CONFIG[key].label,
            value: key,
            emoji: RARITY_CONFIG[key].color
        }));

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('fishlist_menu')
                .setPlaceholder('Select a rarity to view fish...')
                .addOptions(categories)
        );

        const generateEmbed = (category, page) => {
            const fishList = [...(fishData[category] || [])].sort((a, b) => {
                return (a.sell - b.sell) || a.name.localeCompare(b.name);
            });
            const totalPages = Math.ceil(fishList.length / itemsPerPage) || 1;
            const start = page * itemsPerPage;
            const pagedFish = fishList.slice(start, start + itemsPerPage);

            const displayContent = pagedFish.map((fish, index) => {
                return `**${start + index + 1}. ${fish.name}** *${fish.desc}*\n💰 Value: ${fish.sell} coins`;
            }).join('\n\n') || 'No fish found in this rarity.';

            return {
                embed: new EmbedBuilder()
                    .setTitle(`🐟 Fish List - ${RARITY_CONFIG[category].label}`)
                    .setDescription(displayContent)
                    .setColor((() => {
                        const emoji = RARITY_CONFIG[category].color;
                        if (emoji === '⚪') return 'Grey';
                        if (emoji === '🟢') return 'Green';
                        if (emoji === '🟣') return 'Purple';
                        if (emoji === '🔵') return 'Blue';
                        if (emoji === '🟡') return 'Gold';
                        if (emoji === '🔴') return 'Red';
                        return 'Grey';
                    })())
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

            if (i.isStringSelectMenu() && i.customId === 'fishlist_menu') {
                currentCategory = i.values[0];
                currentPage = 0;
            } else if (i.isButton()) {
                switch (i.customId) {
                    case 'prev': currentPage--; break;
                    case 'next': currentPage++; break;
                    case 'first': currentPage = 0; break;
                    case 'last': {
                        const totalPages = Math.ceil((fishData[currentCategory] || []).length / itemsPerPage);
                        currentPage = Math.max(0, totalPages - 1);
                        break;
                    }
                }
            }

            const result = generateEmbed(currentCategory, currentPage);
            const components = [menuRow];
            if (result.totalPages > 1) {
                components.push(getPaginationRow(currentPage, result.totalPages));
            }

            await i.update({ embeds: [result.embed], components: components });
        });
    }
};

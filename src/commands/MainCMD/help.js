const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
require('dotenv').config();
const { getMenuRow, getPaginationRow, getOptions } = require('../Utils/NavigateManager');

module.exports = {
    name: 'help',
    description: 'Display help commands and bot information',
    category: 'gnr',
    async execute(message, args) {
        let currentPage = 0;
        const itemsPerPage = 5;
        let currentCategory = '';
        const { commands } = message.client;
        const isOwner = message.author.id === process.env.OWNER_ID;

        // Filter commands based on category and ownership
        const getFilteredCmds = (cat) => {
            return commands.filter(cmd => {
                if (!isOwner && cmd.category === 'owner') return false;
                if (cat === 'all') return true;
                return cmd.category === cat;
            });
        };

        // Help embed
        const helpEmbed = new EmbedBuilder()
            .setAuthor({ name: 'HELP MENU', iconURL: message.client.user.displayAvatarURL() })
            .addFields({ name: '', value: 'To get more information about a command, use `Zhelp <command>`', inline: false })
            .setFooter({ text: `${process.env.BOT_VER} ${process.env.TYPE} | meh23_.`})

        // Menu row — show Owner option only for bot owner
        const menuOptions = isOwner
            ? [...getOptions(), { label: 'Owner', value: 'owner', emoji: '👑' }]
            : getOptions();
        const menuRow = getMenuRow('help_slt', menuOptions);

        const response = await message.channel.send({ embeds: [helpEmbed], components: [menuRow] });

        // Component collector for menu and pagination
        const collector = response.createMessageComponentCollector({ time: 60000 });

        // Handle menu selection and pagination
        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Not your menu!', ephemeral: true });

            // Handle menu selection and pagination
            if (i.isStringSelectMenu()) {
                currentCategory = i.values[0];
                currentPage = 0;
            } else if (i.isButton()) {
                switch (i.customId) {
                    // Pagination buttons
                    case 'prev': currentPage--; break;
                    case 'next': currentPage++; break;
                    case 'first': currentPage = 0; break;
                    case 'last': {
                        // Calculate total pages based on current category
                        const totalItems = getFilteredCmds(currentCategory).size;
                        currentPage = Math.max(0, Math.ceil(totalItems / itemsPerPage) - 1); // Set to last page index
                        break;
                    }
                }
            }

            // dont care ts
            if (currentCategory === 'gau3') {
                return i.update({
                    embeds: [new EmbedBuilder().setTitle('❓ Hidden Area').setDescription('You bastard! You just into owner\'s bot bedroom 🤨')],
                    components: [menuRow]
                });
            }

            // Get category commands and paginate
            const filteredArray = Array.from(getFilteredCmds(currentCategory).values());
            const totalPages = Math.ceil(filteredArray.length / itemsPerPage);

            // Pagination logic
            const start = currentPage * itemsPerPage;
            const pagedCmds = filteredArray.slice(start, start + itemsPerPage);

            // Format command list
            const displayContent = pagedCmds.map(cmd => {
                const prefix = cmd.folder === 'adminCMD' ? '🛡️ ' : '';
                return `**${prefix}${cmd.name.toUpperCase()}**\n${cmd.description}`; // Format each command with name and description
            }).join('\n\n') || 'No commands in this category.';

            // Page embed
            const pageEmbed = new EmbedBuilder()
                .setTitle(`Commands\n` +
                    `> If you found bug then dm to meh32_.!`
                )
                .setDescription(displayContent) // Set description to command list
                .setFooter({ text: `Page ${currentPage + 1} of ${totalPages || 1}` });

            // Button state
            const btnRow = getPaginationRow(currentPage, totalPages);

            // Menu page
            const components = filteredArray.length > itemsPerPage ? [menuRow, btnRow] : [menuRow];

            await i.update({ embeds: [pageEmbed], components: components });
        });

        collector.on('end', () => {
            menuRow.components[0].setDisabled(true);
            response.edit({ components: [menuRow] }).catch(() => { });
        });
    },
};
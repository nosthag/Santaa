const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const getOptions = () => {
    const options = [
        { label: 'All', value: 'all' },
        { label: 'General', value: 'gnr', emoji: '<:check:1502935345598300301>' },  // change this to your custom emoji
        { label: 'Economic', value: 'eco', emoji: '<:check:1502935333426430074>' },  // change this to your custom emoji
        { label: 'Utils', value: 'utl', emoji: '<:check:1518787835686031491>' },  // change this to your custom emoji
    ];
    options.push({ label: 'Unknown', value: 'gau3', emoji: '❓' });
    return options;
};

const getMenuRow = (customId, customOptions = null) => {
    const options = customOptions || getOptions();
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Select a category').addOptions(options)
    );
};

const getPaginationRow = (currentPage, totalPages) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('first')
            .setEmoji('1502938730648961135') // change this to your custom emoji
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId('prev')
            .setEmoji('1502935282272436306')  // change this to your custom emoji
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId('next')
            .setEmoji('1502935300677046412')  // change this to your custom emoji
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1 || totalPages === 0),
        new ButtonBuilder()
            .setCustomId('last')
            .setEmoji('1502938713540530226')  // change this to your custom emoji
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1 || totalPages === 0)
    );
};

module.exports = { getOptions, getMenuRow, getPaginationRow };

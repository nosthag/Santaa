const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../Utils/Cooldown');
const { CURRENCY_EMOJI } = require('../Utils/config');

module.exports = {
    name: 'daily',
    description: 'Claim your daily reward',
    category: 'eco',
    async execute(message) {
        // Database manager
        const { client, author } = message;
        const dbManager = message.client.db;

        // Cooldown
        const timeLeft = checkCooldown(author.id, this.name);

        if (timeLeft) {
            return message.reply(`Please wait ${timeLeft} before using the \`${this.name}\` command again.`);
        }

        // Random daily reward
        const dailyReward = Math.floor(Math.random() * (50 - 20 + 1)) + 20; // Random reward between 20 and 50

        try {
            await dbManager.addMoney(message.author.id, dailyReward, { trackEarning: true });
            const dailyEmbed = new EmbedBuilder()
                .setTitle('Daily Reward Claimed!')
                .setDescription(`You have claimed your daily reward of **${dailyReward.toLocaleString()}${CURRENCY_EMOJI}**, come back tomorrow for more!`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            message.channel.send({ embeds: [dailyEmbed] });
        } catch (error) {
            console.error('Error occurred while claiming daily reward:', error);
        }

    }
}
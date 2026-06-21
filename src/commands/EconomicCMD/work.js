const { EmbedBuilder } = require('discord.js');
const { jobs , jobs_txt} = require('../Utils/tips'); // Import job from tips.js
const { checkCooldown } = require('../Utils/Cooldown'); // Import cooldown function from Cooldown.js

module.exports = {
    name: 'parttime',
    description: 'Work to earn money (4 minute cooldown)',
    category: 'eco',
    async execute(message) {
        const { client , author } = message;
        const dbManager = message.client.db;

        // Cooldown
        const clntime = 4 * 60 * 1000; // 4 minute cooldown
        const timeLeft = checkCooldown(author.id, this.name, clntime);

        if (timeLeft) {
            return message.reply(`Please wait ${timeLeft} before using the \`${this.name}\` command again.`);
        }

        // rand fuc
        const randJob = jobs[Math.floor(Math.random() * jobs.length)];
        const jobQuote = jobs_txt[Math.floor(Math.random() * jobs_txt.length)];

        // Random job paid
        const amountEarned = Math.floor(Math.random() * (50 - 5 + 1)) + 5;

        try {
            await dbManager.addMoney(message.author.id, amountEarned);

            // work embed
            const workEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setDescription(
                    `${randJob.icon} **${randJob.name}**` +
                    ` and you earned **$${amountEarned.toLocaleString()}**!\n\n` +
                    `*"${jobQuote}"*`
                )
                .setTimestamp();
            message.channel.send({ embeds: [workEmbed] });
        } catch (error) {
            console.error('Error occurred while updating user balance:', error);
        }
    }
};
const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../Utils/Cooldown');
const { CrimeSuccess, CrimeFail, CrimeWorse } = require('../Utils/misc');
const { CURRENCY_EMOJI } = require('../Utils/config');

module.exports = {
    name: 'crime',
    description: 'What is faster than work hard? Commit a crime somewhere in nevada and get rich quick! (or not)',
    category: 'eco',
    async execute(message) {
        const { client, author } = message;
        const dbManager = client.db;
        const rpgManager = client.rpg;

        // Cooldown
        const timeLeft = checkCooldown(author.id, this.name);

        if (timeLeft) {
            return message.reply({ content: `Please wait ${timeLeft} before using the \`${this.name}\` command again.`, ephemeral: true });
        }

        try {
            const stats = await rpgManager.getStats(author.id);
            const currentHealth = stats.health;
            const currentStamina = stats.stamina;

            let successChance = 20;
            let failChance = 40;
            let worseChance = 40;

            if (currentStamina < 50) {
                successChance -= 10;
                failChance += 5;
                worseChance += 5;
            }

            const roll = Math.floor(Math.random() * 100) + 1;
            let chance;

            if (roll <= successChance) {
                chance = 1; // Success
            } else if (roll <= successChance + failChance) {
                chance = 2; // Fail
            } else {
                chance = 3; // Worse
            }

            const amount = Math.floor(Math.random() * 200) + 100; // Reward/Penalty range
            const embed = new EmbedBuilder();
            const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

            if (chance === 1) {
                await dbManager.addMoney(author.id, amount, { trackEarning: true });
                embed.setTitle('Crime Successful!')
                    .setDescription(`${getRandom(CrimeSuccess)}\n\nYou stole **${amount.toLocaleString()}${CURRENCY_EMOJI}**!`)
                    .setColor('#16A34A');
            } else if (chance === 2) {
                // Fail: lose money, health, 20 stamina
                const penaltyMoney = Math.floor(amount / 2);
                const healthLoss = 10;
                const staminaLoss = 20;

                await dbManager.removeMoney(author.id, penaltyMoney);
                const newHealth = Math.max(0, currentHealth - healthLoss);
                const newStamina = Math.max(0, currentStamina - staminaLoss);
                await rpgManager.updateStats(author.id, newHealth, newStamina);

                embed.setTitle('Crime Failed!')
                    .setDescription(`${getRandom(CrimeFail)}\n\nYou lost **${penaltyMoney.toLocaleString()}${CURRENCY_EMOJI}**, **${healthLoss} HP**, and **${staminaLoss} Stamina**!`)
                    .setColor('#DC2626');
            } else {
                // Worse: lose money, 50 health, 50 stamina
                const penaltyMoney = amount;
                const healthLoss = 50;
                const staminaLoss = 50;

                await dbManager.removeMoney(author.id, penaltyMoney);
                const newHealth = Math.max(0, currentHealth - healthLoss);
                const newStamina = Math.max(0, currentStamina - staminaLoss);
                await rpgManager.updateStats(author.id, newHealth, newStamina);

                embed.setTitle('Crime Went Horribly!')
                    .setDescription(`${getRandom(CrimeWorse)}\n\nYou lost **${penaltyMoney.toLocaleString()}${CURRENCY_EMOJI}**, **${healthLoss} HP**, and **${staminaLoss} Stamina**!`)
                    .setColor('#DC2626');
            }

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error occurred while committing crime:', error);
            message.reply('An error occurred while executing the command.');
        }
    }
}

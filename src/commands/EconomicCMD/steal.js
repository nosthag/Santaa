const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../Utils/Cooldown');
const { StealSuccess, StealFail, StealBusted } = require('../Utils/misc');
const { CURRENCY_EMOJI } = require('../Utils/config');

const MIN_TARGET_BALANCE = 50; // target must have at least this much to be steal-able

module.exports = {
    name: 'steal',
    description: 'You so broke that begging aint work so you try attempt to steal money from another user\'s wallet (Zsteal @user)',
    category: 'eco',
    async execute(message) {
        const { author } = message;
        const dbManager = message.client.db;
        const rpgManager = message.client.rpg;

        // ── Target validation ──────────────────────────────────────────────
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('You must mention a user to steal from. Example: `Zsteal @username`');
        }
        if (targetUser.id === author.id) {
            return message.reply('You can\'t steal from yourself, that\'s just called losing money.');
        }
        if (targetUser.bot) {
            return message.reply('Bots don\'t carry wallets. Nice try though.');
        }

        // ── Cooldown ───────────────────────────────────────────────────────
        const timeLeft = checkCooldown(author.id, this.name);
        if (timeLeft) {
            return message.reply(`Please wait **${timeLeft}** before attempting to steal again.`);
        }

        try {
            // ── Check target balance ──────────────────────────────────────
            const targetData = await dbManager.getUser(targetUser.id);
            if (targetData.balance < MIN_TARGET_BALANCE) {
                return message.reply(
                    `${targetUser.username} is too broke to steal from. (Needs at least **${MIN_TARGET_BALANCE}${CURRENCY_EMOJI}** in wallet)`
                );
            }

            // ── Outcome roll ──────────────────────────────────────────────
            const roll = Math.floor(Math.random() * 100) + 1;
            // 30% success, 40% fail, 30% busted
            let outcome;
            if (roll <= 30) outcome = 'success';
            else if (roll <= 70) outcome = 'fail';
            else outcome = 'busted';

            const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
            const embed = new EmbedBuilder()
                .setAuthor({ name: author.username, iconURL: author.displayAvatarURL() });

            if (outcome === 'success') {
                // Steal 10–25% of target balance, capped at $500
                const pct = (Math.floor(Math.random() * 16) + 10) / 100; // 0.10 – 0.25
                const stolen = Math.min(500, Math.max(1, Math.floor(targetData.balance * pct)));

                await dbManager.removeMoney(targetUser.id, stolen);
                await dbManager.addMoney(author.id, stolen, { trackEarning: false });
                const currentSteals = Number((await rpgManager.getStats(author.id)).steals || 0);
                await rpgManager.updateProgress(author.id, { steals: currentSteals + 1 });

                embed
                    .setTitle('Steal Successful!')
                    .setDescription(
                        `${getRandom(StealSuccess)}\n\n` +
                        `You swiped **${stolen.toLocaleString()}${CURRENCY_EMOJI}** from ${targetUser}!`
                    )
                    .setColor('#16A34A');

            } else if (outcome === 'fail') {
                embed
                    .setTitle('Steal Failed')
                    .setDescription(
                        `${getRandom(StealFail)}\n\n` +
                        `You didn't get anything from ${targetUser} this time.`
                    );

            } else {
                // Busted — lose 10–20% of own wallet + 15 stamina
                const selfData = await dbManager.getUser(author.id);
                const pct = (Math.floor(Math.random() * 11) + 10) / 100; // 0.10 – 0.20
                const fine = Math.min(selfData.balance, Math.max(1, Math.floor(selfData.balance * pct)));

                if (fine > 0) await dbManager.removeMoney(author.id, fine);

                // Stamina penalty
                const stats = await rpgManager.getStats(author.id);
                const newStamina = Math.max(0, stats.stamina - 15);
                await rpgManager.updateStats(author.id, stats.health, newStamina);

                embed
                    .setTitle('Caught Red-Handed!')
                    .setDescription(
                        `${getRandom(StealBusted)}\n\n` +
                        `You were punished **${fine.toLocaleString()}** and lost **15 Stamina**.`
                    )
                    .setColor('#DC2626');
            }

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in steal command:', error);
            message.reply('An error occurred while executing the steal command.');
        }
    }
};

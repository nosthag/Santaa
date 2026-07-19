// Dont ask why fish.js here cuz im accidentally forgot and when move it into minigame it cause bug so imma leave it here for short time

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomFish, calculateExp } = require('./fishCore');
const rpgmanager = require('../../../database/rpgmanager');
const { checkCooldown, getCooldownDuration } = require('../../commands/Utils/Cooldown');
const { checkWantedRestrictions } = require('../../commands/Utils/WantedLevel');

const fishCounts = new Map(); // userId -> { count, cooldownUntil }

function getFishLimitState(userId) {
    const existing = fishCounts.get(userId);
    if (existing) {
        return existing;
    }

    const state = { count: 0, cooldownUntil: 0 };
    fishCounts.set(userId, state);
    return state;
}

function resetFishLimit(userId) {
    fishCounts.delete(userId);
}

function checkFishLimit(userId, { markCatch = false } = {}) {
    const state = getFishLimitState(userId);
    const now = Date.now();

    if (state.cooldownUntil && now < state.cooldownUntil) {
        const remainingSeconds = Math.ceil((state.cooldownUntil - now) / 1000);
        const minute = Math.floor(remainingSeconds / 60);
        const second = remainingSeconds % 60;
        const cooldownText = minute > 0 ? `${minute}m ${second}s` : `${second}s`;

        return {
            allowed: false,
            message: `🎣 You're exhausted! Please wait **${cooldownText}** before fishing again.`
        };
    }

    if (state.cooldownUntil && now >= state.cooldownUntil) {
        state.cooldownUntil = 0;
        state.count = 0;
        fishCounts.set(userId, state);
    }

    if (state.count >= 5) {
        const duration = getCooldownDuration('fish_exhaustion');
        if (typeof duration === 'number' && duration > 0) {
            state.cooldownUntil = now + duration;
            fishCounts.set(userId, state);
            checkCooldown(userId, 'fish_exhaustion');

            const remainingSeconds = Math.ceil(duration / 1000);
            const minute = Math.floor(remainingSeconds / 60);
            const second = remainingSeconds % 60;
            const cooldownText = minute > 0 ? `${minute}m ${second}s` : `${second}s`;

            return {
                allowed: false,
                message: `🎣 You've reached the fishing limit. Please wait **${cooldownText}** before fishing again.`
            };
        }
    }

    if (markCatch) {
        state.count += 1;
        fishCounts.set(userId, state);
    }

    return { allowed: true, message: null };
}

module.exports = {
    name: 'fish',
    description: 'Start fishing for rare fish!',
    category: 'mie',
    usage: 'Zfish',
    resetFishLimit,
    checkFishLimit,
    async execute(message, args) {
        const userId = message.author.id;

        const limitStatus = checkFishLimit(userId);
        if (!limitStatus.allowed) {
            return message.reply(limitStatus.message);
        }

        const wantedCheck = await checkWantedRestrictions(userId, this.name, message.client, message);
        if (!wantedCheck.allowed) {
            if (!wantedCheck.handled && wantedCheck.message) message.reply(wantedCheck.message);
            return;
        }

        let gameState = 'IDLE'; // IDLE, WAITING, BITING

        const embed = new EmbedBuilder()
            .setTitle('🎣 Fishing')
            .setDescription('Cast your line into the water to begin...')
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cast_line')
                .setLabel('Cast Line 🎣')
                .setStyle(ButtonStyle.Primary)
        );

        const mainMsg = await message.reply({ embeds: [embed], components: [row] });

        const collector = mainMsg.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 120000
        });

        collector.on('collect', async i => {
            if (i.customId === 'cast_line' && gameState === 'IDLE') {
                const limitStatus = checkFishLimit(userId);
                if (!limitStatus.allowed) {
                    await i.update({
                        content: limitStatus.message,
                        embeds: [],
                        components: []
                    });
                    collector.stop();
                    return;
                }

                gameState = 'WAITING';

                await i.update({
                    content: null,
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎣 Fishing')
                            .setDescription('Waiting for a bite... 🌊\n*Be ready to reel it in!*')
                            .setColor('Blue')
                    ],
                    components: []
                });

                const waitTime = Math.floor(Math.random() * 5000) + 3000;

                setTimeout(async () => {
                    if (gameState !== 'WAITING') return;

                    gameState = 'BITING';
                    const reelRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('reel_in')
                            .setLabel('REEL IT IN! 🎣')
                            .setStyle(ButtonStyle.Danger)
                    );

                    try {
                        await mainMsg.edit({
                            content: '🚨 **BITE!**',
                            components: [reelRow]
                        });
                    } catch (e) {
                        console.error('Error updating bite message:', e);
                    }

                    // Failure if not reeled in within 5 seconds
                    setTimeout(async () => {
                        if (gameState === 'BITING') {
                            gameState = 'IDLE';
                            await mainMsg.edit({
                                content: 'Too slow! The fish escaped... 🐟💨\n*(You took more than 5 seconds)*',
                                components: [
                                    new ActionRowBuilder().addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('cast_line')
                                            .setLabel('Try Again 🎣')
                                            .setStyle(ButtonStyle.Primary)
                                    )
                                ]
                            }).catch(() => { });
                        }
                    }, 5000);
                }, waitTime);
            }
            else if (i.customId === 'reel_in' && gameState === 'BITING') {
                gameState = 'IDLE';

                // Increment catch count
                checkFishLimit(userId, { markCatch: true });

                const fish = getRandomFish();
                if (!fish) {
                    await i.update({ content: 'The fish got away! 💨', components: [] });
                    return;
                }

                // Add fish to inventory
                await rpgmanager.addItem(userId, fish.id, fish.name);

                const expGain = calculateExp(fish);
                const stats = await rpgmanager.getStats(userId);
                let newExp = stats.exp + expGain;
                let newLevel = stats.level;
                const expNeeded = stats.level * 100;
                if (newExp >= expNeeded) {
                    newExp -= expNeeded;
                    newLevel++;
                }
                await rpgmanager.updateProgress(userId, { exp: newExp, level: newLevel });

                const fishEmbed = new EmbedBuilder()
                    .setTitle('🎣 Success!')
                    .setDescription(`You reeled in a **${fish.name}**!\n\n**Rarity:** ${fish.rarity}\n**Value:** 💰${fish.sell}\n**EXP Gained:** ✨${expGain}`)
                    .setColor('Gold')

                await i.update({
                    content: 'Nice catch!',
                    embeds: [fishEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('cast_line')
                                .setLabel('Fish Again 🎣')
                                .setStyle(ButtonStyle.Primary)
                        )
                    ]
                });
            } else {
                await i.deferUpdate();
            }
        });
    }
};

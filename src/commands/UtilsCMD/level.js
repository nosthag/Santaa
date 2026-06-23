const { EmbedBuilder } = require('discord.js');
const { getTotalStats } = require('../Utils/StatsCalculator');

module.exports = {
  name: 'level',
  description: 'Check your or another user\'s level and EXP (Zlevel [@user]).',
  category: 'utl',
  async execute(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const stats = await getTotalStats(targetUser.id);

    const levelEmbed = new EmbedBuilder()
      .setTitle('📊 User Level Stats')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(`**User:** ${targetUser}\n\n` +
        `**Level:** ${stats.level}\n` +
        `**EXP:** ${stats.exp} / ${stats.level * 100}\n` +
        `**Attack:** ${stats.totalAttack}\n` +
        `**Defense:** ${stats.totalDefense}`)
      .setColor('#00ffcc')
      .setTimestamp();

    return message.reply({ embeds: [levelEmbed] });
  },
};

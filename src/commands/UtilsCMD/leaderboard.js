const { AttachmentBuilder } = require('discord.js');
const dbmanager = require('../../../database/dbmanager');
const rpgmanager = require('../../../database/rpgmanager');
const { LeaderboardConfig } = require('../Utils/misc');
const { getMenuRow, getPaginationRow } = require('../Utils/NavigateManager');
const { generateLeaderboardImage } = require('../Utils/imageGenerator');

const categories = [
  { key: 'money', label: 'Total Money', description: 'Balance + bank + inventory value' },
  { key: 'level', label: 'Highest Level', description: 'Player level' },
  { key: 'wins', label: 'Battle Wins', description: 'PVP wins' },
  { key: 'steals', label: 'Steals', description: 'Successful steals' }
];

async function resolveUsername(message, userId) {
  try {
    if (message?.guild) {
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (member?.displayName) return member.displayName;
    }
    const user = await message.client.users.fetch(userId).catch(() => null);
    if (user?.username) return user.username;
  } catch (_) {}
  return `User ${userId}`;
}

async function getRows(message, categoryKey) {
  let raw = [];
  if (categoryKey === 'money') {
    raw = await dbmanager.getMoneyLeaderboard(10);
  } else if (categoryKey === 'level') {
    raw = await rpgmanager.getLevelLeaderboard(10);
  } else if (categoryKey === 'wins') {
    raw = await rpgmanager.getWinsLeaderboard(10);
  } else if (categoryKey === 'steals') {
    raw = await rpgmanager.getStealsLeaderboard(10);
  }

  return Promise.all(raw.map(async (entry, i) => {
    const userId = entry.user_id || entry.winner_id || 'unknown';
    const value = entry.totalAssets ?? entry.level ?? entry.wins ?? entry.steals ?? 0;
    const name = await resolveUsername(message, userId);
    return { rank: i + 1, name, value };
  }));
}

function buildMenuRow(currentKey) {
  const options = categories.map((cat) => ({
    label: cat.label,
    value: cat.key,
    description: cat.description,
    default: cat.key === currentKey,
  }));
  return getMenuRow('leaderboard_category', options);
}

function buildPaginationRow(currentPage, totalPages) {
  return getPaginationRow(currentPage, totalPages);
}

module.exports = {
  name: 'leaderboard',
  description: 'Show a leaderboard for money, level, wins, and steals.',
  category: 'utl',
    usage: 'Zleaderboard',
  async execute(message, args = []) {
    const requestedCategory = (args[0] || LeaderboardConfig.DefaultCategory || 'money').toLowerCase();
    const initialCategory = categories.find((item) => item.key === requestedCategory) ? requestedCategory : 'money';

    let currentCategory = initialCategory;
    let currentPage = 0;
    const pageSize = LeaderboardConfig.PageSize || 5;

    const buildImageAttachment = async () => {
      const selected = categories.find((item) => item.key === currentCategory) || categories[0];
      const allRows = await getRows(message, currentCategory);
      const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
      const start = currentPage * pageSize;
      const pageRows = allRows.slice(start, start + pageSize);

      const imageBuffer = await generateLeaderboardImage(
        `${selected.label} Leaderboard`,
        pageRows,
        currentPage,
        totalPages
      );
      return {
        attachment: new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' }),
        totalPages,
      };
    };

    try {
      const { attachment, totalPages } = await buildImageAttachment();

      const response = await message.channel.send({
        files: [attachment],
        components: [buildMenuRow(currentCategory), buildPaginationRow(currentPage, totalPages)],
      });

      const collector = response.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: 'Not your leaderboard menu!', ephemeral: true });
        }

        if (interaction.isStringSelectMenu()) {
          currentCategory = interaction.values[0];
          currentPage = 0;
        } else if (interaction.isButton()) {
          const allRows = await getRows(message, currentCategory);
          const totalPagesNow = Math.max(1, Math.ceil(allRows.length / pageSize));
          switch (interaction.customId) {
            case 'first': currentPage = 0; break;
            case 'prev': currentPage = Math.max(0, currentPage - 1); break;
            case 'next': currentPage = Math.min(totalPagesNow - 1, currentPage + 1); break;
            case 'last': currentPage = totalPagesNow - 1; break;
          }
        }

        const { attachment: newAttachment, totalPages: newTotal } = await buildImageAttachment();
        const menuRow = buildMenuRow(currentCategory);
        const paginationRow = buildPaginationRow(currentPage, newTotal);

        await interaction.update({
          files: [newAttachment],
          attachments: [],
          components: [menuRow, paginationRow],
        });
      });

      collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error('Error building leaderboard:', error);
      await message.reply('An error occurred while building the leaderboard.');
    }
  }
};
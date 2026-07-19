const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType
} = require('discord.js');

module.exports = {
  name: 'guess',
  description: 'Become a nerd lord and guess the memes',
  category: 'mie',
  usage: 'Zguess',

  async execute(message) {
    try {
      const question = await this.getRandomMeme();
      if (!question) {
        return message.reply('Could not connect to the meme database. Please try again later');
      }

      // Generate initial hint
      const hint = this.generateHint(question.answer);

      const embed = new EmbedBuilder()
        .setTitle('Guess the Meme')
        .setDescription(`**Hint:** \`${hint}\``)
        .setImage(question.image)
        .setFooter({ text: 'Click the button below to submit your answer' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`guessmeme_btn_${message.author.id}`)
          .setLabel('Submit Answer')
          .setStyle(ButtonStyle.Primary)
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });

      // Button collector
      const buttonCollector = sent.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 90000,
        max: 1
      });

      buttonCollector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: 'Bruh this not for you ge tout',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('guessmeme_modal')
          .setTitle('Submit Your Meme Answer');

        const answerInput = new TextInputBuilder()
          .setCustomId('meme_answer_input')
          .setLabel("What is the name of this meme?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('idk the name of this meme, no hint lol');

        modal.addComponents(new ActionRowBuilder().addComponents(answerInput));

        await interaction.showModal(modal);

        const modalSubmit = await interaction.awaitModalSubmit({
          time: 60000
        }).catch(() => null);

        if (!modalSubmit) return;

        const userAnswer = modalSubmit.fields.getTextInputValue('meme_answer_input').trim();
        const isCorrect = this.checkAnswer(question.answer, userAnswer);

        // Disable button
        row.components[0].setDisabled(true);
        await sent.edit({ components: [row] }).catch(() => { });

        const resultEmbed = new EmbedBuilder()
          .setTitle(isCorrect ? 'Correct!' : 'Wrong!')
          .setDescription(isCorrect
            ? `Well done! The answer was: **${question.answer}**`
            : `Better luck next time! The correct answer was: **${question.answer}**`
          )
          .setColor(isCorrect ? '#16A34A' : '#DC2626')
          .setImage(question.image); // Show image again for reference

        await modalSubmit.reply({ embeds: [resultEmbed] });
      });

      buttonCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          row.components[0].setDisabled(true);
          await sent.edit({
            content: 'Time\'s up!',
            components: [row]
          }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Error in guessmeme game:', error);
      message.reply('An error occurred while running the game. Please try again!');
    }
  },

  generateHint(memeName) {
    if (!memeName) return "No hint available.";

    const words = memeName.split(/\s+/).filter(Boolean);

    const processedWords = words.map(word => {
      if (word.length <= 2) return word; // Keep short words visible

      const firstChar = word.charAt(0);
      const lastChar = word.length > 3 ? word.charAt(word.length - 1) : '';
      const hidden = "_".repeat(word.length - (lastChar ? 2 : 1));

      return firstChar + hidden + lastChar;
    });

    const maskText = processedWords.join(' ');
    return `${maskText} (${words.length} words, ${memeName.length} characters)`;
  },

  checkAnswer(correctAnswer, userAnswer) {
    if (!correctAnswer || !userAnswer) return false;

    const normalize = (str) => str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();

    const target = normalize(correctAnswer);
    const input = normalize(userAnswer);

    // Exact match
    if (target === input) return true;

    const targetWords = target.split(' ').filter(Boolean);
    const inputWords = input.split(' ').filter(Boolean);

    if (targetWords.length === 0 || inputWords.length === 0) return false;

    const matchingWords = targetWords.filter(word =>
      inputWords.some(inputWord =>
        inputWord.includes(word) || word.includes(inputWord)
      )
    );

    const matchRatio = matchingWords.length / targetWords.length;
    return matchRatio >= 0.7 || matchingWords.length >= Math.max(2, Math.floor(targetWords.length * 0.6));
  },

  async getRandomMeme() {
    try {
      const response = await fetch('https://api.imgflip.com/get_memes');
      const data = await response.json();

      if (!data.success || !data.data?.memes?.length) return null;

      const memes = data.data.memes;
      // Filter out very low quality or textless memes if desired
      const filtered = memes.filter(m => m.box_count <= 4); // Prefer classic memes

      const randomMeme = filtered.length
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : memes[Math.floor(Math.random() * memes.length)];

      return {
        id: randomMeme.id,
        answer: randomMeme.name,
        image: randomMeme.url
      };
    } catch (e) {
      console.error('Failed to fetch meme:', e);
      return null;
    }
  }
};
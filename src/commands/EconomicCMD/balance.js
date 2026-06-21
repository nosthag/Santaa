const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle} = require('discord.js');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

module.exports = {
    name: 'balance',
    description: 'Manage your currently balance and bank account',
    category: 'eco',
    async execute(message) {
        const name = message.member?.displayName || message.author.username;
        // connecting to database
        const db = await sqlite.open({
            filename: './database/balance.db',
            driver: sqlite3.Database
        });

        // get user data
        let userData = await db.get('SELECT * FROM balances WHERE user_id = ?', message.author.id);

        // if user data doesn't exist, create it with default balance of 0
        if (!userData) {
            await db.run('INSERT OR IGNORE INTO balances (user_id, balance, bank) VALUES (?, ?, ?)', [message.author.id, 0, 0]);
            userData = { user_id: message.author.id, balance: 0, bank: 0 }; // set balance and bank to 0 if user data is created
        }

        // create embed message
        const balanceEmbed = data => {
            const netWorth = data.balance + data.bank; // Calculate net worth
            return new EmbedBuilder()
                .setTitle(`${name}'s Balance`)
                .addFields(
                    { name: '🪙', value: `$${data.balance.toLocaleString()}`, inline: false },
                    { name: '🏦', value: `$${data.bank.toLocaleString()}`, inline: false },
                    { name: '💰', value: `$${netWorth.toLocaleString()}`, inline: false }
                )
        };

        // Withdraw and deposit buttons
        const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dep_modal').setLabel('Deposit').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('with_modal').setLabel('Withdraw').setStyle(ButtonStyle.Secondary)
        );

        const response = await message.channel.send({ embeds: [balanceEmbed(userData)], components: [row] });

        const collector = response.createMessageComponentCollector({filter: i => i.user.id === message.author.id, componentType: ComponentType.Button });

        collector.on('collect', async (i) => {
            // Modal interaction check
            const IsDep = i.customId === 'dep_modal';
            const modal = new ModalBuilder()
                .setCustomId(IsDep ? 'dep_modal' : 'with_modal')
                .setTitle(IsDep ? 'Deposit Amount' : 'Withdraw Amount')
            
            // Modal Input
            const amount = new TextInputBuilder()
                .setCustomId('amount_input')
                .setLabel('Amount (All or number):')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(amount));

            // Show modal
            await i.showModal(modal);
            const submit = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);

            if (submit) {
                let input = submit.fields.getTextInputValue('amount_input').toLowerCase();
                let curData = await db.get('SELECT * FROM balances WHERE user_id = ?', message.author.id);
                let amount = 0;

                if (input === 'all') {
                    amount = IsDep ? curData.balance : curData.bank; // Set amount to balance for deposit and bank for withdraw
                } else {
                    amount = parseInt(input.replace(/k/g, '000')); // Convert 'k' to '000' for easier parsing
                }

                if (isNaN(amount) || amount <= 0) {
                    return submit.reply({ content: 'Please enter a valid amount.', ephemeral: true });
                }

                if (IsDep) {
                    if (amount > curData.balance) return submit.reply({ content: 'You do not have enough balance to deposit that amount.', ephemeral: true });
                    await db.run('UPDATE balances SET balance = balance - ?, bank = bank + ? WHERE user_id = ?', [amount, amount, message.author.id]);
                } else {
                    if (amount > curData.bank) return submit.reply({ content: 'You do not have enough money in the bank.', ephemeral: true });
                    await db.run('UPDATE balances SET bank = bank - ?, balance = balance + ? WHERE user_id = ?', [amount, amount, message.author.id]);
                }

                const newData = await db.get('SELECT * FROM balances WHERE user_id = ?', message.author.id); // Get updated data after transaction
                await submit.update({ embeds: [balanceEmbed(newData)] });
            }
        });

        collector.on('end', async () => {
            row.components.forEach(btn => btn.setDisabled(true));
            response.edit({ components: [row] }).catch(() => {});
        });
    }
}
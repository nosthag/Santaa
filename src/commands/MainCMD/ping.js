// Zping

module.exports = {
    name: 'ping',
    description: 'Test the bot\'s latency.',
    category: 'gnr',
    execute(message, args) {
        message.reply(`Pong the delay is ${Date.now() - message.createdTimestamp}ms.`);
    },
};
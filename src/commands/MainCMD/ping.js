module.exports = {
    name: 'ping',
    description: 'Test the bot\'s latency',
    category: 'gnr',
    usage: 'Zping',
    async execute(message, args) {
        const sentMessage = await message.reply('ping...');
        const wsPing = message.client.ws.ping; 
        const roundTrip = sentMessage.createdTimestamp - message.createdTimestamp;

        await sentMessage.edit(`**Pong!** Currently WebSocket latency is \`${wsPing}ms\` and Actual Response Time (Round-trip) is \`${roundTrip}ms\``);
    },
};
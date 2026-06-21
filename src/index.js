// RUNNING BOT: npm run start (for regular use) or npm run dev (with nodemon for auto-restart on changes)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {Client, IntentsBitField, Collection} = require('discord.js');
const dbmanager = require('../database/dbmanager'); // Import the database manager module

// some flag u shouldnt care fr
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Command management
const pfx = process.env.PFX;
client.commands = new Collection();

// Function to recursively get all .js files in the commands directory and its subdirectories
function getFilesRecursive(dir) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            // If it's a directory, continue scanning into it
            results = results.concat(getFilesRecursive(filePath));
        } else if (file.endsWith('.js')) {
            // If it's a .js file, add it to the list
            results.push(filePath);
        }
    });
    return results;
}

const cmdPath = path.join(__dirname, 'commands'); // Path to the commands directory

if (fs.existsSync(cmdPath)) {
    const cmdFiles = getFilesRecursive(cmdPath); // Get all command files recursively @

    // console.log(`--- Loading commands from ${cmdPath} ---`);

    for (const filePath of cmdFiles) {
        // Delete cache to allow hot-reloading of commands without restarting the bot
        delete require.cache[require.resolve(filePath)];
        
        const cmd = require(filePath);
        
        if ('name' in cmd && 'description' in cmd) {
            client.commands.set(cmd.name, cmd);
            // Log the loaded command (debug) @
            // console.log(`Loaded: ${cmd.name} (${path.relative(cmdPath, filePath)})`);
        } else {
            // console.warn(`Skipped: ${filePath} (Missing name or description)`); // debug @
        }
    }
    // Log total commands loaded (debug) @
    // console.log(`Total commands loaded: ${client.commands.size}`);

} else { // Handle the case where the commands directory does not exist
    console.error("Error: Commands directory not found!");
}

// Listen for messages
client.on('messageCreate', (message) => {
    if (!message.content.startsWith(pfx) || message.author.bot) return; // check if the message starts with the prefix and is not from a bot

    // Command handling
    const args = message.content.slice(pfx.length).trim().split(/ +/); // Remove prefix and split the message into arguments
    const commandName = args.shift().toLowerCase();

    // cmd alias
    const command = client.commands.get(commandName);

    // Check commands are able to run or not
    if (!command) return;
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!'); // Error handling
    }
});

// Client running
client.on('clientReady', () => {
    // console.log(`Logged in as ${client.user.tag}!`); // literally debug too @
});

// Connecting database
async function connectData() {
    try {
        await dbmanager.init();
        client.db = dbmanager; // Attach the database manager to the client for easy access in commands
        
        const rpgmanager = require('../database/rpgmanager');
        await rpgmanager.init();
        client.rpg = rpgmanager;
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }

    // Login bot
    client.login(process.env.DISCORD_BOT_API_KEY).then(() => {
        // console.log('Bot token valid'); // @
    }).catch((error) => { // Handle login errors
        console.error('Error logging in:', error); // Optionally, you can exit the process if login fails
    });
}

connectData(); // Start the bot by connecting to the database first
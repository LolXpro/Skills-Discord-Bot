import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client, Collection, GatewayIntentBits } from 'discord.js'
import  dotenv from 'dotenv'
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log('Ready!');
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join('file://', commandsPath, file);
    const command = await import(filePath);
    client.commands.set(command.default.data.name, command)
}

client.on('interactionCreate', async interaction =>{
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.default.execute(interaction);
    }catch (err) {
        console.log(err);
        await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
    }

})

client.login(process.env.DISCORD_TOKEN)
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`${client.user.tag} 봇이 온라인입니다!`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return; // 봇이 쓴 채팅은 무시

    if (message.content === '!인사') {
        message.reply(`반가워요, ${message.author.username}님! 👋`);
    }
});
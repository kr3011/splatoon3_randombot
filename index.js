const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http'); // 가짜 웹서버용 라이브러리

// 1. 렌더가 봇을 강제 종료하지 못하도록 가짜 웹서버를 켭니다.
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(process.env.PORT || 3000); // 렌더가 부여하는 포트를 자동으로 엽니다.

// 2. 디스코드 봇 설정
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
    if (message.author.bot) return;

    if (message.content === '!인사') {
        message.reply(`반가워요, ${message.author.username}님! 👋`);
    }
});

// Render의 Environment 탭에 등록한 DISCORD_TOKEN을 읽어옵니다.
client.login(process.env.DISCORD_TOKEN);

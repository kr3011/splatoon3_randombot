// index.js
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 렌더 웹서버 유지용 포트 개방
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(process.env.PORT || 3000);

// 봇 객체 생성 및 인텐트 설정
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // 서버 접속 권한
        GatewayIntentBits.GuildMessages,    // 서버 메시지 수신 권한
        GatewayIntentBits.MessageContent,   // 메시지 내용 읽기 권한 
    ]
});

// 명령어들을 담아둘 바구니(Collection) 생성
client.commands = new Collection();

// commands 폴더 안의 모든 .js 파일을 읽어옵니다.
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // 바구니에 명령어 이름과 기능을 매핑하여 저장
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
    }
}

client.once('ready', () => {
    console.log(`${client.user.tag} 봇이 메시지 기능과 함께 온라인입니다!`);
});

// 채팅 메시지가 올라왔을 때 감지하는 이벤트
client.on('messageCreate', (message) => {
    // 봇이 쓴 글이거나 접두사(/)로 시작하지 않으면 무시
    if (message.author.bot || !message.content.startsWith('!')) return;

    // !명령어 에서 명령어 이름만 쏙 빼내기 (예: /핑 -> 핑)
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // 바구니에 일치하는 명령어가 없다면 무시
    if (!client.commands.has(commandName)) return;

    try {
        // 일치하는 파일(예: ping.js)의 execute 함수를 실행합니다.
        client.commands.get(commandName).execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('명령어를 실행하는 도중 오류가 발생했습니다.');
    }
});

client.login(process.env.DISCORD_TOKEN);

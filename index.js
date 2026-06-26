const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Render 유지용 가짜 웹서버 
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(process.env.PORT || 3000);

// 슬래시 커맨드는 굳이 메시지 내용(MessageContent) 권한이 없어도 작동합니다.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsData = []; // 디스코드에 등록할 명령어 데이터 배열

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON()); // JSON 형태로 변환하여 저장
    }
}

// 봇이 로그인 성공(Ready)했을 때 실행되는 이벤트
client.once('ready', async () => {
    console.log(`${client.user.tag} 봇이 준비되었습니다.`);

    // 봇이 켜질 때 내 모든 서버에 슬래시 커맨드를 자동으로 등록(배포)합니다.
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('슬래시 커맨드 등록을 시작합니다...');

        // 내 봇이 들어가 있는 모든 서버에 글로벌 명령어로 등록
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );

        console.log('슬래시 커맨드가 성공적으로 등록되었습니다!');
    } catch (error) {
        console.error('커맨드 등록 중 오류 발생:', error);
    }
});

// 사용자가 슬래시 커맨드를 입력했을 때 수신하는 이벤트
client.on('interactionCreate', async interaction => {
    // 슬래시 커맨드가 아니면 무시
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
        } else {
            await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

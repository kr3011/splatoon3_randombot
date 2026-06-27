const { Client, GatewayIntentBits, Collection } = require('discord.js');
const deployCommands = require('./deploy-commands.js'); 
const http = require('http');
const fs = require('fs');
const path = require('path');

// Render 유지용 가짜 웹서버 
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(process.env.PORT || 3000);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// 💡 index.js에서는 등록 처리를 안 하므로 데이터 배열(commandsData)이나 
// 글로벌/길드 분리 로직이 필요 없습니다. 순수하게 실행 매핑만 진행합니다.
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// 💡 갱신된 깔끔한 Ready 이벤트
client.once('ready', async () => {
    console.log(` ${client.user.tag} 봇이 성공적으로 준비되었습니다!`);
    // 💡 여기서 명령어 등록 함수를 실행합니다.
    console.log('🤖 슬래시 명령어 자동 업데이트를 시작합니다...');
    await deployCommands(); 
});

// 사용자가 슬래시 커맨드를 입력했을 때 수신하는 이벤트
client.on('interactionCreate', async interaction => {
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

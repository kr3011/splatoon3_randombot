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

// 💡 v15 기준 clientReady 이벤트 내부를 이렇게 수정합니다.
client.once('clientReady', (readyClient) => {
    // 🟢 readyClient를 사용하면 'client is not defined' 에러를 완벽하게 방어할 수 있습니다.
    console.log(`✅ [성공] ${readyClient.user.tag} 봇이 온라인 상태로 진입했습니다!`);
    console.log('🤖 슬래시 명령어 백그라운드 자동 업데이트를 시작합니다...');
    
    // 💡 이미 안전하게 로그인 완료된 봇의 ID(readyClient.user.id)를 넘겨줍니다.
    deployCommands(readyClient.user.id)
        .then(() => console.log('🎉 명령어 분리 배포가 백그라운드에서 완료되었습니다.'))
        .catch(err => console.error('❌ 백그라운드 명령어 배포 실패:', err));
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

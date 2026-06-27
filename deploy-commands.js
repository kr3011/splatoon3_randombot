const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const globalCommands = [];
const guildCommands = [];

// 명령어 폴더 경로 설정 (본인의 폴더 구조에 맞게 수정하세요)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    // 💡 isGlobal 값에 따라 등록할 바구니를 분류합니다.
    if (command.isGlobal) {
      globalCommands.push(command.data.toJSON());
    } else {
      guildCommands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const CLIENT_ID = process.env.CLIENT_ID;
    const TEST_GUILD_ID = '여기에_내_비밀_테스트_서버_ID_입력';

    // 1. 글로벌 명령어 등록
    console.log('🌐 일반 명령어를 글로벌로 배포합니다...');
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: globalCommands }
    );

    // 2. 테스트 서버 명령어 등록
    console.log('🔒 개발자 명령어를 테스트 서버에 배포합니다...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
      { body: guildCommands }
    );

    console.log('🎉 모든 슬래시 명령어 분리 배포 완료!');
  } catch (error) {
    console.error(error);
  }
})();

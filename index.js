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
client.once('clientReady', async () => {
    console.log(` ${client.user.tag} 봇이 성공적으로 준비되었습니다!`);
    // 💡 여기서 명령어 등록 함수를 실행합니다.
    console.log('🤖 슬래시 명령어 자동 업데이트를 시작합니다...');
    await deployCommands(client.user.id); 
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

client.on('interactionCreate', async interaction => {
    
    // 💡 [핵심 수신 지점] 유저가 드롭다운 메뉴를 마우스로 조작했을 때 작동하는 리스너
    if (interaction.isStringSelectMenu()) {
        const { customId, values, guildId } = interaction;

        // 우리가 만든 config 관련 메뉴판 신호인지 체크 (config_short_shooters 등)
                // index.js 내부 StringSelectMenu 감지 이벤트 안쪽
        if (customId.startsWith('config_')) {
            await interaction.deferUpdate(); 

            try {
                const { GuildSetting, Weapon } = require('./models');
                
                // 1. 이 서버의 기존 설정 로드 (없으면 신규 생성)
                let setting = await GuildSetting.findOne({ guildId });
                if (!setting) {
                    setting = new GuildSetting({ guildId, bannedWeapons: [] });
                }

                // 2. [체크 해제 감지의 핵심] 현재 조작 중인 드롭다운 메뉴의 '전체 무기 목록'을 먼저 확보합니다.
                let currentMenuCategoryWeapons = [];
                const allWeapons = await Weapon.find({});

                // 보내주신 영문 카테고리/사거리 기준과 100% 일치시킵니다.
                if (customId === 'config_short_shooters') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'shooter' && w.matching_range <= 15);
                } else if (customId === 'config_long_shooters') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'shooter' && w.matching_range > 15);
                } else if (customId === 'config_rollers_brushes') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'roller' || w.category === 'brush');
                } else if (customId === 'config_brellas_wipers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'brella' || w.category === 'splatana');
                }

                // 현재 메뉴판에 노출되어 있는 모든 무기의 ID 리스트
                const currentMenuWeaponIds = currentMenuCategoryWeapons.map(w => w._id.toString());

                // 3. 기존에 DB에 저장되어 있던 이 서버의 전체 밴 무기 ID 리스트
                let existingBannedIds = setting.bannedWeapons.map(id => id.toString());

                // 4. 🔥 [오류 해결의 열쇠] 기존 밴 목록에서 '현재 조작 중인 카테고리의 무기들'만 싹 뺍니다. (초기화 도화지 작업)
                // 이 과정을 거쳐야 유저가 체크를 풀었을 때 기존 밴 목록에서 깔끔하게 지워집니다!
                existingBannedIds = existingBannedIds.filter(id => !currentMenuWeaponIds.includes(id));

                // 5. 유저가 방금 드롭다운에서 최종적으로 '체크를 유지한' 진짜 밴 ID 리스트(values)만 깨끗하게 누적합니다.
                // ('none' 옵션 필터링 곁들임)
                values.forEach(id => {
                    if (id !== 'none' && !existingBannedIds.includes(id)) {
                        existingBannedIds.push(id);
                    }
                });

                // 6. 완벽하게 차집합/합집합 연산이 끝난 최종 밴 목록을 몽고DB에 실시간 저장(덮어쓰기)합니다.
                setting.bannedWeapons = existingBannedIds;
                await setting.save();
                
                console.log(`[🚫 밴 설정 갱신완료] 서버 ID: ${guildId} | 현재 총 밴 무기 수: ${setting.bannedWeapons.length}개`);
                
            } catch (error) {
                console.error('❌ 설정 저장 실시간 반영 실패:', error);
            }
        }
        return; // 컴포넌트 처리가 끝났으므로 일반 슬래시 명령어 핸들러로 넘어가지 않고 여기서 완전 종료
    }

    // 💡 아래는 기존에 사용하시던 일반 슬래시 커맨드 전용 처리단입니다 (코드는 기존과 100% 동일)
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    // ... 이하 명령어 execute 및 sync 분기 등 기존 코드 그대로 유지 ...
});


const MONGO_URI = process.env.MONGO_URI;
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 [성공] 클라우드 MongoDB 데이터베이스와 완벽하게 연결되었습니다!'))
    .catch(err => console.error('❌ [치명적 오류] 데이터베이스 주소가 틀렸거나 차단되었습니다:', err));

client.login(process.env.DISCORD_TOKEN);

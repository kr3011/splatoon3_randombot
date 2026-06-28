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

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// 💡 [교정 1] 이벤트 이름을 디스코드 표준 규격인 'ready'로 수정합니다.
client.once('ready', async () => {
    client.emojiMap = new Map();

    console.log(`📡 ${client.user.tag} 봇이 성공적으로 준비되었습니다!`);
    console.log('🤖 슬래시 명령어 자동 업데이트를 시작합니다...');
    try {
        await deployCommands(client.user.id); 
    } catch (e) {
        console.error('명령어 배포 실패:', e);
    }

    try {
        // 봇 자체(애플리케이션)에 등록된 이모지 목록을 서버 ID 없이 통째로 가져옴
        const appEmojis = await client.application.emojis.fetch();
        
        appEmojis.forEach(emoji => {
        // 맵에 '무기이름': '<:무기이름:이모지ID>' 형태로 저장
        client.emojiMap.set(emoji.name, emoji.toString());
        });
        
        console.log(`✅ 애플리케이션 이모지 ${client.emojiMap.size}개 로드 완료!`);
    } catch (error) {
        console.error("이모지 로드 실패:", error);
    }
});

// 중앙 통합형 interactionCreate 리스너
client.on('interactionCreate', async interaction => {
    
    // 💡 [교정 2] 가로막는 상단 return 없이, 드롭다운 신호를 최우선 독립 리스너로 낚아챕니다.
    if (interaction.isStringSelectMenu()) {
        const { customId, values, guildId } = interaction;

        if (customId.startsWith('config_')) {
            // 상호작용 실패 프리징 방지를 위해 즉시 디코 본사에 수신 신호를 전송합니다.
            await interaction.deferUpdate().catch(() => {}); 

            try {
                const { GuildSetting, Weapon } = require('./models');
                
                let setting = await GuildSetting.findOne({ guildId });
                if (!setting) {
                    setting = new GuildSetting({ guildId, bannedWeapons: [] });
                }

                let currentMenuCategoryWeapons = [];
                const allWeapons = await Weapon.find({});

                // 💡 [교정 3] customId 이름표에 'config_' 접두사가 붙어 들어오므로 완벽히 매핑 구출합니다!
                if (customId === 'config_short_shooters') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => (w.category === 'shooter' || w.category === 'reelgun') && w.matching_range <= 15);
                } else if (customId === 'config_long_shooters') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => (w.category === 'shooter' || w.category === 'reelgun') && w.matching_range > 15);
                } else if (customId === 'config_rollers_brushes') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'roller' || w.category === 'brush');
                } else if (customId === 'config_chargers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'charger');
                } else if (customId === 'config_blasters') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'blaster');
                } else if (customId === 'config_brellas_wipers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'brella' || w.category === 'wiper');
                } else if (customId === 'config_sloshers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'slosher');
                } else if (customId === 'config_spinners') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'spinner'); // DB 저장 카테고리명 대조 확인
                } else if (customId === 'config_maneuvers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'maneuver'); // DB 저장 카테고리명 대조 확인
                } else if (customId === 'config_stringers') {
                    currentMenuCategoryWeapons = allWeapons.filter(w => w.category === 'stringer');
                }

                // 만약 철자 문제로 무기를 하나도 못 찾았다면 연산을 스킵해 기존 데이터를 보호합니다.
                if (currentMenuCategoryWeapons.length === 0) {
                    console.warn(`⚠️ [매핑 불일치 경고] customId인 [${customId}] 그룹의 무기를 DB에서 찾지 못했습니다.`);
                    return;
                }

                const currentCategoryKeys = currentMenuCategoryWeapons.map(w => w.key);
                // 현재 조작 중인 카테고리 영역만 도화지 청소 (차집합)
                let existingBannedKeys = (setting.bannedWeapons || []).filter(key => !currentCategoryKeys.includes(key));

                // 유저가 새롭게 체크를 유지한 ID들만 추가
                values.forEach(key => {
                    if (key !== 'none' && !existingBannedKeys.includes(key)) {
                        existingBannedKeys.push(key);
                    }
                });

                setting.bannedWeapons = existingBannedKeys;
                await setting.save();
                
                console.log(`[🚫 밴 설정 갱신완료] 서버 ID: ${guildId} | 현재 총 밴 무기 수: ${setting.bannedWeapons.length}개`);
                
            } catch (error) {
                console.error('❌ 설정 저장 실시간 반영 실패:', error);
            }
        }
        return; 
    }

    // 드롭다운 검사 통과 후 슬래시 커맨드가 들어왔을 때 하단 라인 분기 가동
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

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 [성공] 클라우드 MongoDB 데이터베이스와 완벽하게 연결되었습니다!'))
    .catch(err => console.error('❌ [치명적 오류] 데이터베이스 주소가 틀렸거나 차단되었습니다:', err));

client.login(process.env.DISCORD_TOKEN);

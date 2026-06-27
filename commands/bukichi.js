const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDoubleMatchWeapons } = require('../services/match.js');

module.exports = {
    isGlobal: true,

    // 디스코드 메뉴창에 등록될 명령어 정보
    data: new SlashCommandBuilder()
        .setName('bukichi') // 채팅창에 /핑 으로 표시됨 (대문자 불가, 영어/한글 가능)
        .setDescription('봇이 응답 메시지를 보냅니다.'),
    
    // 사용자가 명령어를 실행했을 때 실행될 기능
    async execute(interaction) {
        await interaction.deferReply();

        try {
        // 💡 서비스에서 4*2 형태의 2차원 배열을 받아옵니다.
        // teams[0] 은 알파팀(4개), teams[1] 은 브라보팀(4개)이 됩니다.
        const teams = await getDoubleMatchWeapons(interaction.guildId);
        
        const alphaTeam = teams[0];
        const bravoTeam = teams[1];

        // 만약 데이터베이스가 비어있어 4개를 못 채웠다면 예외 처리
        if (alphaTeam.length < 4 || bravoTeam.length < 4) {
            return await interaction.editReply('❌ 무기 데이터가 부족합니다. 개발자 전용 `/fetch` 명령어를 실행해 주세요.');
        }

        // 팀별 텍스트 가공 처리 함수 (동일)
        const formatTeamText = (weapons, teamName) => {
            return weapons.map((w, index) => {
                const nameJa = w.mainWeaponInfo?.name_ja;
                const nameKr = w.mainWeaponInfo?.name_kr;
                if (!nameJa || !nameKr) throw new Error('CONFIG_EMPTY_OR_INVALID_WEAPON');

                return `**${teamName} ${index + 1}**\n┗ 🔫${nameJa}(${nameKr})\n`;
            }).join('\n');
        };

        // 디스코드 임베드 디자인 및 메시지 전송
        const matchEmbed = new EmbedBuilder()
            .setColor('#10FF00')
            .setTitle(' Squid & Octo 4:4 Random Match ')
            .setDescription('4개씩 2번 독립적으로 추출된 팀별 무기 목록입니다.')
            .addFields(
                { name: '💛', value: formatTeamText(alphaTeam, "Alpha"), inline: true },
                { name: '💜', value: formatTeamText(bravoTeam, "Bravo"), inline: true }
            )
            .setFooter({ text: `요청자: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [matchEmbed] });

        } catch (error) {
            console.error('매칭 생성 실패:', error);
            await interaction.editReply('❌ 무기를 추첨하는 도중 데이터베이스 에러가 발생했습니다.');
        }
    },
};

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    isGlobal: true,
    
    // 디스코드 메뉴창에 등록될 명령어 정보
    data: new SlashCommandBuilder()
        .setName('bukichi') // 채팅창에 /핑 으로 표시됨 (대문자 불가, 영어/한글 가능)
        .setDescription('봇이 응답 메시지를 보냅니다.'),
    
    // 사용자가 명령어를 실행했을 때 실행될 기능
    async execute(interaction) {
        // 슬래시 커맨드는 message 대신 interaction을 사용해 답변합니다.
        await interaction.reply('🏓 퐁! 정상 작동 중입니다.');
    },
};

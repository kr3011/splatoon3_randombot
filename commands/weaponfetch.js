const { SlashCommandBuilder } = require('discord.js');
const { syncSplatoonWeapons } = require('../services/loadweapon.js'); // 서비스 파일 로드

module.exports = {
  isGlobal: false, 
  
  data: new SlashCommandBuilder()
    .setName('fetch')
    .setDescription('스플래툰 3 최신 무기 데이터를 데이터베이스에 동기화합니다.'),

  async execute(interaction) {
    // 1차 보안: 렌더 환경변수에 등록한 개발자 고유 ID와 비교 (필요 시 주석 해제)
    // if (interaction.user.id !== process.env.DEVELOPER_ID) {
    //   return interaction.reply({ content: '🔒 이 명령어는 봇 개발자만 사용할 수 있습니다.', ephemeral: true });
    // }

    // 유저에게 '생각 중...' 상태를 보여줍니다. (API 수집 시간이 몇 초 걸리므로 필수)
    await interaction.deferReply({ ephemeral: true });

    try {
      // 💡 분리해 둔 무기 동기화 서비스 호출
      const totalCount = await syncSplatoonWeapons();

      // 성공 시 결과 전송
      await interaction.editReply({
        content: `✅ 동기화 완료! 총 **${totalCount}개**의 스플래툰 3 무기 데이터가 MongoDB에 업데이트되었습니다.`
      });

    } catch (error) {
      console.error('데이터 동기화 실패:', error);
      
      // 에러 발생 시 안내
      await interaction.editReply({
        content: '❌ 데이터 동기화 중 오류가 발생했습니다. 개발자 콘솔 로그를 확인하세요.'
      });
    }
  },
};

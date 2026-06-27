const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GuildSetting } = require('../models');
const { generateConfigMenuRows } = require('../services/configdropdown'); // 💡 1단계 분리형 서비스 임포트

module.exports = {
  isGlobal: true,
  
  // 💡 명령어 빌더 부분에 'menu'와 'status' 인수를 가볍게 이식합니다.
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('이 서버의 랜덤 매칭 무기 풀 설정을 관리합니다.')
    .addSubcommand(subcommand =>
      subcommand.setName('menu').setDescription('카테고리별 무기 밴(BAN) 설정 메뉴판을 불러옵니다.')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('status').setDescription('현재 이 서버에서 밴(제외)된 모든 무기 목록을 확인합니다.')
    ),

  async execute(interaction) {
    // 유저가 어떤 인수를 선택해서 쳤는지 감지 (menu 혹은 status)
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      // =================================================================
      // 📝 시나리오 A: 유저가 [/config status] 를 입력했을 때 (밴 명단 출력)
      // =================================================================
      if (subcommand === 'status') {
        // 모든 멤버들이 같이 보고 소통해야 하므로 ephemeral을 걸지 않고 전체 공유 답변을 띄웁니다.
        await interaction.deferReply();

        // 이 서버의 밴 설정을 가져오면서 외래키인 Weapon 방과 그 안의 이름 방(mainWeapon)까지 일제히 결합
        const setting = await GuildSetting.findOne({ guildId }).populate({
          path: 'bannedWeapons',
          populate: { path: 'mainWeapon' }
        });

        if (!setting || !setting.bannedWeapons || setting.bannedWeapons.length === 0) {
          return await interaction.editReply('🕊️ **현재 이 서버에서 밴(제외)된 무기가 하나도 없습니다!**\n모든 173개 무기가 매칭 추첨 풀에 포함되어 있습니다.');
        }

        // 보내주신 변수 스타일 방식 그대로 밴 리스트 텍스트 조립
        const banListText = setting.bannedWeapons.map((w, index) => {
          const nameJa = w.mainWeapon?.name_ja || w.name_ja || w.key;
          const nameKr = w.mainWeapon?.name_kr || w.name_kr ? `(${w.mainWeapon?.name_kr || w.name_kr})` : '';
          return `${index + 1}. 🚫 **${nameJa}** ${nameKr} [${w.category || '기타'}]`;
        }).join('\n');

        // 빨간색 밴 현황 전용 명찰 임베드 작성
        const statusEmbed = new EmbedBuilder()
          .setColor('#FF003C')
          .setTitle('🚫 현재 서버 무기 밴(BAN) 현황 목록')
          .setDescription(`이 서버에서 아래의 **총 ${setting.bannedWeapons.length}개** 무기들은 \`/match\` 추첨 풀에서 원천 배제됩니다.`)
          .addFields({ name: '⛔ 제외된 무기 명단', value: banListText })
          .setTimestamp();

        return await interaction.editReply({ embeds: [statusEmbed] });
      }

      // =================================================================
      // ⚙️ 시나리오 B: 유저가 원래대로 [/config] 를 입력했을 때 (체크박스 폼)
      // =================================================================
      if (!subcommand) {
        await interaction.deferReply({ ephemeral: true });

        // 💡 분리해둔 1단계 서비스를 실행해 깨끗하게 연산된 드롭다운 ActionRow 객체들을 배달 받습니다!
        const configRows = await generateConfigMenuRows(guildId);

        await interaction.editReply({
          content: '⚙️ **서버 랜덤 매칭 무기 밴(BAN) 설정**\n우리 서버 매칭에서 **포함시키고 싶지 않은(금지할) 무기들**을 체크박스처럼 선택해 주세요!\n(선택된 무기들은 매칭 추첨에서 원천 배제됩니다.)',
          components: configRows
        });
      }

    } catch (error) {
      console.error('❌ config 가동 중 치명적 에러 감지:', error);

      // 서비스단에서 터트린 유령/공석 카테고리 예외처리 수신
      if (error.message === 'DATABASE_EMPTY_WEAPONS') {
        return await interaction.editReply('❌ MongoDB에 무기 데이터가 없습니다. 개발자 전용 `/sync` 명령어를 먼저 실행해 주세요.');
      }
      if (error.message.startsWith('EMPTY_CATEGORY_')) {
        const failedPart = error.message.replace('EMPTY_CATEGORY_', '');
        return await interaction.editReply(`❌ **설정창 호출 실패**: 현재 데이터베이스 내에 **[${failedPart}]** 그룹에 속하는 무기가 단 하나도 발견되지 않아 폼 빌드가 중단되었습니다. 개발자 전용 \`/sync\` 명령어를 실행해 데이터를 먼저 완전 복구해 주세요!`);
      }

      await interaction.editReply('❌ 무기 설정 메뉴판을 가공하는 도중 내부 시스템 에러가 발생했습니다.');
    }
  },
};

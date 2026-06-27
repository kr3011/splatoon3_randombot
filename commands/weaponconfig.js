const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Weapon, GuildSetting } = require('../models');

module.exports = {
  isGlobal: true,
  
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('이 서버의 랜덤 매칭 무기 풀을 사거리 및 묶음별로 설정합니다.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;

    try {
      // 1. MongoDB에서 무기 데이터 가져오기 (이름 테이블 결합)
      const allWeapons = await Weapon.find({}).populate('mainWeapon');
      
      if (!allWeapons || allWeapons.length === 0) {
        return await interaction.editReply('❌ MongoDB에 무기 데이터가 없습니다. 개발자 전용 `/sync` 명령어를 먼저 실행해 주세요.');
      }

      // 2. 이 서버의 기존 설정 체크용 캐시 확보
      const setting = await GuildSetting.findOne({ guildId });
      const allowedIds = setting ? setting.allowedWeapons.map(id => id.toString()) : [];

      // 3. 질문자님의 황금 규칙에 맞춰 카테고리/사거리 정밀 필터링
      const shortShooters = allWeapons.filter(w => w.category === '슈터' && w.matching_range <= 15);
      const longShooters = allWeapons.filter(w => w.category === '슈터' && w.matching_range > 15);
      const rollersAndBrushes = allWeapons.filter(w => w.category === '롤러' || w.category === '붓');
      const brellasAndWipers = allWeapons.filter(w => w.category === '브렐라' || w.category === '와이퍼'); // 💡 API 카테고리명(한국어) 기준 매핑

      // 4. 공용 옵션 주입기 함수 (반복 작업 최소화 및 문자열 세척)
      const addCleanOptions = (menu, weaponArray) => {
        weaponArray.forEach(w => {
          if (w && w._id && w.mainWeapon?.name_kr) {
            menu.addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel(`${String(w.mainWeapon.name_kr).trim()} | ${String(w.mainWeapon.name_ja || '').trim()}`)
                .setValue(w._id.toString())
                .setDefault(allowedIds.includes(w._id.toString()))
            );
          }
        });
        if (menu.options.length === 0) {
          menu.addOptions(new StringSelectMenuOptionBuilder().setLabel('가용 무기 없음').setValue('none'));
        }
        menu.setMaxValues(Math.min(menu.options.length, 25));
      };

      // 🎰 Row 1: 단거리 슈터 메뉴판 (22개)
      const menu1 = new StringSelectMenuBuilder().setCustomId('config_short_shooters').setPlaceholder('🔫 단거리 슈터 종류 선택 (사거리 15 이하)').setMinValues(0);
      addCleanOptions(menu1, shortShooters);

      // 🎰 Row 2: 장거리 슈터 메뉴판 (17개)
      const menu2 = new StringSelectMenuBuilder().setCustomId('config_long_shooters').setPlaceholder('🚀 장거리 슈터 종류 선택 (사거리 15 초과)').setMinValues(0);
      addCleanOptions(menu2, longShooters);

      // 🎰 Row 3: 롤러 & 붓 통합 메뉴판
      const menu3 = new StringSelectMenuBuilder().setCustomId('config_rollers_brushes').setPlaceholder('🧹 롤러 및 붓 종류 선택 (통합 묶음)').setMinValues(0);
      addCleanOptions(menu3, rollersAndBrushes);

      // 🎰 Row 4: 브렐라 & 와이퍼 통합 메뉴판
      const menu4 = new StringSelectMenuBuilder().setCustomId('config_brellas_wipers').setPlaceholder('🛡️ 브렐라 및 와이퍼 종류 선택 (통합 묶음)').setMinValues(0);
      addCleanOptions(menu4, brellasAndWipers);

      // 디스코드 규칙에 따라 개별 로우 조립 (최대 5개 제한 준수)
      const row1 = new ActionRowBuilder().addComponents(menu1);
      const row2 = new ActionRowBuilder().addComponents(menu2);
      const row3 = new ActionRowBuilder().addComponents(menu3);
      const row4 = new ActionRowBuilder().addComponents(menu4);

      // 5. 최종 메시지 전송
      await interaction.editReply({
        content: '⚙️ **서버 랜덤 매칭 무기 풀 세부 설정**\n원하는 메뉴를 열어 우리 서버 매칭에 사용할 무기들을 체크박스처럼 골라주세요!\n(선택을 변경하면 서버 환경설정에 즉시 자동 저장됩니다.)',
        components: [row1, row2, row3, row4]
      });

    } catch (error) {
      console.error('❌ config 실행 오류:', error);
      await interaction.editReply('❌ 무기 설정 메뉴판을 가공하는 도중 내부 시스템 에러가 발생했습니다.');
    }
  },
};

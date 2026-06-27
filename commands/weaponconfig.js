const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Weapon, GuildSetting } = require('../models');

module.exports = {
  isGlobal: true,
  
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('이 서버의 랜덤 매칭 무기 풀을 사거리 및 묶음별로 설정합니다.'),

  async execute(interaction) {
    // 설정창은 명령어를 친 당사자 눈에만 보이도록 조용히(ephemeral) 처리
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;

    try {
      // 1. MongoDB에서 무기 데이터 가져오기 (이름 테이블 결합 필수)
      const allWeapons = await Weapon.find({}).populate('mainWeapon');
      
      if (!allWeapons || allWeapons.length === 0) {
        return await interaction.editReply('❌ MongoDB에 무기 데이터가 없습니다. 개발자 전용 `/sync` 명령어를 먼저 실행해 주세요.');
      }

      // 2. 이 서버의 기존 설정 체크용 캐시 확보
      const setting = await GuildSetting.findOne({ guildId });
      const allowedIds = setting ? setting.allowedWeapons.map(id => id.toString()) : [];

      // 3. 인게임 데이터 규격에 대응하도록 안전하게 카테고리/사거리 분리 공정
      const shortShooters = allWeapons.filter(w => w.category === 'shooter' && w.matching_range <= 15);
      const longShooters = allWeapons.filter(w => w.category === 'shooter' && w.matching_range > 15);
      const rollersAndBrushes = allWeapons.filter(w => w.category === 'roller' || w.category === 'brush');
      const brellasAndWipers = allWeapons.filter(w => w.category === 'brella' || w.category === 'splatana');

      // 4. [핵심] 드롭다운 옵션 자동 주입 및 빈 값 즉시 에러 차단기 함수
      const addCleanOptions = (menu, weaponArray, categoryLabel) => {
        // ❌ [방어벽 1] 필터링된 배열 자체가 통째로 텅 비어있다면 즉시 폭발
        if (!weaponArray || weaponArray.length === 0) {
            throw new Error(`EMPTY_CATEGORY_${categoryLabel}`);
        }

        weaponArray.forEach(w => {
          // mainWeapon 결합 상태에 맞춰 유연하게 텍스트 구출
          const labelText = w.mainWeapon?.name_ja || w.name_ja || w.key;
          const labelKr = w.mainWeapon?.name_kr || w.name_kr || '';

          // 필수 식별 글자가 아예 유령 데이터라면 옵션 추가 스킵
          if (!labelText) return;

          menu.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(`${String(labelText).trim()} ${labelKr ? `| ${String(labelKr).trim()}` : ''}`)
              .setValue(w._id.toString())
              .setDefault(allowedIds.includes(w._id.toString()))
          );
        });

        // ❌ [방어벽 2] 필터 검사는 통과했으나 이름 누락 등으로 최종 옵션이 0개가 되었을 때도 폭발
        if (menu.options.length === 0) {
            throw new Error(`EMPTY_CATEGORY_${categoryLabel}`);
        }

        // 디스코드 한도인 최대 25개 제한 안전 매핑 적용
        menu.setMaxValues(Math.min(menu.options.length, 25));
      };

      // 🎰 Row 1: 단거리 슈터 메뉴판 (사거리 15 이하)
      const menu1 = new StringSelectMenuBuilder().setCustomId('config_short_shooters').setPlaceholder('🚀 단거리 슈터 종류 선택 (사거리 15 이하)').setMinValues(0);
      addCleanOptions(menu1, shortShooters, 'SHORT_SHOOTER');

      // 🎰 Row 2: 장거리 슈터 메뉴판 (사거리 15 초과)
      const menu2 = new StringSelectMenuBuilder().setCustomId('config_long_shooters').setPlaceholder('🚀 장거리 슈터 종류 선택 (사거리 15 초과)').setMinValues(0);
      addCleanOptions(menu2, longShooters, 'LONG_SHOOTER');

      // 🎰 Row 3: 롤러 & 붓 통합 메뉴판
      const menu3 = new StringSelectMenuBuilder().setCustomId('config_rollers_brushes').setPlaceholder('🧹 롤러 및 붓 종류 선택 (통합 묶음)').setMinValues(0);
      addCleanOptions(menu3, rollersAndBrushes, 'ROLLER_BRUSH');

      // 🎰 Row 4: 브렐라 & 와이퍼 통합 메뉴판
      const menu4 = new StringSelectMenuBuilder().setCustomId('config_brellas_wipers').setPlaceholder('🛡️ 브렐라 및 와이퍼 종류 선택 (통합 묶음)').setMinValues(0);
      addCleanOptions(menu4, brellasAndWipers, 'BRELLA_WIPER');

      // 개별 로우 팩 조립 (최대 5개 제한 준수)
      const row1 = new ActionRowBuilder().addComponents(menu1);
      const row2 = new ActionRowBuilder().addComponents(menu2);
      const row3 = new ActionRowBuilder().addComponents(menu3);
      const row4 = new ActionRowBuilder().addComponents(menu4);

      // 5. 모든 검증을 무사히 마쳤을 때만 화면에 최종 전송 실행
      await interaction.editReply({
        content: '⚙️ **서버 랜덤 매칭 무기 풀 세부 설정**\n원하는 메뉴를 열어 우리 서버 매칭에 사용할 무기들을 체크박스처럼 골라주세요!\n(선택을 변경하면 서버 환경설정에 즉시 자동 저장됩니다.)',
        components: [row1, row2, row3, row4]
      });

    } catch (error) {
      console.error('❌ config 가동 중 치명적 에러 감지:', error);

      // 💡 위에서 던진 빈 카테고리 예외(throw) 수신 및 분기 처리
      if (error.message.startsWith('EMPTY_CATEGORY_')) {
        const failedPart = error.message.replace('EMPTY_CATEGORY_', '');
        
        return await interaction.editReply(`❌ **설정창 호출 실패**: 현재 데이터베이스 내에 **[${failedPart}]** 그룹에 속하는 무기가 단 하나도 발견되지 않아 폼 빌드가 중단되었습니다. 개발자 전용 \`/fetch\` 명령어를 실행해 데이터를 먼저 완전 복구해 주세요!`);
      }

      // 그 외 기타 시스템(DB 연동 등) 예외 처리
      await interaction.editReply('❌ 무기 설정 메뉴판을 가공하는 도중 내부 시스템 에러가 발생했습니다.');
    }
  },
};

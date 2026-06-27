const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Weapon, GuildSetting } = require('../models');

/**
 * 보내주신 카테고리/사거리 밴 규칙을 바탕으로 드롭다운 메뉴판 4세트를 완벽하게 조립합니다.
 * @param {string} guildId - 디스코드 서버 고유 ID
 * @returns {Promise<Array<ActionRowBuilder>>} ActionRow 배열
 */
async function generateConfigMenuRows(guildId) {
  // 1. MongoDB에서 무기 데이터 가져오기 (이름 테이블 결합 필수)
  const allWeapons = await Weapon.find({}).populate('mainWeapon');
  
  if (!allWeapons || allWeapons.length === 0) {
    throw new Error('DATABASE_EMPTY_WEAPONS');
  }

  // 2. 이 서버의 기존 설정 체크용 캐시 확보
  const setting = await GuildSetting.findOne({ guildId });
  const bannedIds = setting ? setting.bannedWeapons.map(id => id.toString()) : [];

  // 3. 보내주신 인게임 영문 데이터 규격에 맞춘 분리 공정
  const shortShooters = allWeapons.filter(w => w.category === 'shooter' && w.matching_range <= 15);
  const longShooters = allWeapons.filter(w => w.category === 'shooter' && w.matching_range > 15);
  const rollersAndBrushes = allWeapons.filter(w => w.category === 'roller' || w.category === 'brush');
  const brellasAndWipers = allWeapons.filter(w => w.category === 'brella' || w.category === 'splatana');

  // 4. 드롭다운 옵션 자동 주입 및 빈 값 즉시 에러 차단기 내부 함수
  const addCleanOptions = (menu, weaponArray, categoryLabel) => {
    // ❌ [방어벽 1] 필터링된 배열 자체가 통째로 텅 비어있다면 즉시 폭발
    if (!weaponArray || weaponArray.length === 0) {
        throw new Error(`EMPTY_CATEGORY_${categoryLabel}`);
    }

    weaponArray.forEach(w => {
      // 보내주신 유연한 다국어 텍스트 구출 방식 적용
      const labelText = w.mainWeapon?.name_ja || w.name_ja || w.key;
      const labelKr = w.mainWeapon?.name_kr || w.name_kr || '';

      if (!labelText) return;

      menu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${String(labelText).trim()} ${labelKr ? `| ${String(labelKr).trim()}` : ''}`)
          .setValue(w._id.toString())
          .setDefault(bannedIds.includes(w._id.toString())) // 💡 밴 목록에 있으면 자동으로 파란 체크 유지
      );
    });

    // ❌ [방어벽 2] 필터 검사는 통과했으나 이름 누락 등으로 최종 옵션이 0개가 되었을 때도 폭발
    if (menu.options.length === 0) {
        throw new Error(`EMPTY_CATEGORY_${categoryLabel}`);
    }

    // 디스코드 한도인 최대 25개 제한 안전 매핑 적용
    menu.setMaxValues(Math.min(menu.options.length, 25));
  };

  // 🎰 Row 1: 단거리 슈터 메뉴판
  const menu1 = new StringSelectMenuBuilder().setCustomId('config_short_shooters').setPlaceholder('🚫 랜덤 매칭에서 제외할 단거리 슈터 체크 (사거리 15 이하)').setMinValues(0);
  addCleanOptions(menu1, shortShooters, 'SHORT_SHOOTER');

  // 🎰 Row 2: 장거리 슈터 메뉴판
  const menu2 = new StringSelectMenuBuilder().setCustomId('config_long_shooters').setPlaceholder('🚫 랜덤 매칭에서 제외할 장거리 슈터 체크 (사거리 15 초과)').setMinValues(0);
  addCleanOptions(menu2, longShooters, 'LONG_SHOOTER');

  // 🎰 Row 3: 롤러 & 붓 통합 메뉴판
  const menu3 = new StringSelectMenuBuilder().setCustomId('config_rollers_brushes').setPlaceholder('🚫 랜덤 매칭에서 제외할 롤러 및 붓 체크').setMinValues(0);
  addCleanOptions(menu3, rollersAndBrushes, 'ROLLER_BRUSH');

  // 🎰 Row 4: 브렐라 & 와이퍼 통합 메뉴판
  const menu4 = new StringSelectMenuBuilder().setCustomId('config_brellas_wipers').setPlaceholder('🚫 랜덤 매칭에서 제외할 브렐라 및 와이퍼 체크').setMinValues(0);
  addCleanOptions(menu4, brellasAndWipers, 'BRELLA_WIPER');

  // 개별 로우 팩 조립 후 최종 반환
  return [
    new ActionRowBuilder().addComponents(menu1),
    new ActionRowBuilder().addComponents(menu2),
    new ActionRowBuilder().addComponents(menu3),
    new ActionRowBuilder().addComponents(menu4)
  ];
}

module.exports = { generateConfigMenuRows };

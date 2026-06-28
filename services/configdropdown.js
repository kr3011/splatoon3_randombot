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
    const shortShooters = allWeapons.filter(w => (w.category === 'shooter' || w.category === 'reelgun') && w.matching_range <= 15);
    const longShooters = allWeapons.filter(w => (w.category === 'shooter' || w.category === 'reelgun') && w.matching_range > 15);
    const rollersAndBrushes = allWeapons.filter(w => w.category === 'roller' || w.category === 'brush');
    const chargers = allWeapons.filter(w => w.category === 'charger');
    const blasters = allWeapons.filter(w => w.category === 'blaster');

    const brellasAndWipers = allWeapons.filter(w => w.category === 'brella' || w.category === 'wiper');
    const sloshers = allWeapons.filter(w => w.category === 'slosher');
    const spinners = allWeapons.filter(w => w.category === 'spinner');
    const maneuvers = allWeapons.filter(w => w.category === 'maneuver');
    const stringers = allWeapons.filter(w => w.category === 'stringer');

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
                .setValue(w.key)
                .setDefault(bannedIds.includes(w.key)) // 💡 밴 목록에 있으면 자동으로 파란 체크 유지
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
    const menu1 = new StringSelectMenuBuilder().setCustomId('config_short_shooters').setPlaceholder('🚫 シューター(短射程)').setMinValues(0);
    addCleanOptions(menu1, shortShooters, 'SHORT_SHOOTER');

    // 🎰 Row 2: 장거리 슈터 메뉴판
    const menu2 = new StringSelectMenuBuilder().setCustomId('config_long_shooters').setPlaceholder('🚫 シューター(長射程)').setMinValues(0);
    addCleanOptions(menu2, longShooters, 'LONG_SHOOTER');

    // 🎰 Row 3: 롤러 & 붓 통합 메뉴판
    const menu3 = new StringSelectMenuBuilder().setCustomId('config_rollers_brushes').setPlaceholder('🚫 ローラー/筆').setMinValues(0);
    addCleanOptions(menu3, rollersAndBrushes, 'ROLLER_BRUSH');

    // 🎰 Row 4: 차저 메뉴판
    const menu4 = new StringSelectMenuBuilder().setCustomId('config_chargers').setPlaceholder('🚫 チャージャー').setMinValues(0);
    addCleanOptions(menu4, chargers, 'CHARGER');

    // 🎰 Row 5: 블래스터 통합 메뉴판
    const menu5 = new StringSelectMenuBuilder().setCustomId('config_blasters').setPlaceholder('🚫 ブラスター').setMinValues(0);
    addCleanOptions(menu5, blasters, 'BLASTER');

    
    // 🎰 Row 6: 브렐라 & 와이퍼 통합 메뉴판
    const menu6 = new StringSelectMenuBuilder().setCustomId('config_brellas_wipers').setPlaceholder('🚫 シェルター/ワイパー').setMinValues(0);
    addCleanOptions(menu6, brellasAndWipers, 'BRELLA_WIPER');

    // 🎰 Row 7:  통합 메뉴판
    const menu7 = new StringSelectMenuBuilder().setCustomId('config_sloshers').setPlaceholder('🚫 スロッシャー').setMinValues(0);
    addCleanOptions(menu7, sloshers, 'SLOSHER');

    // 🎰 Row 8: 브렐라 & 와이퍼 통합 메뉴판
    const menu8 = new StringSelectMenuBuilder().setCustomId('config_spinners').setPlaceholder('🚫 スピナー').setMinValues(0);
    addCleanOptions(menu8, spinners, 'SPINNER');

    // 🎰 Row 9: 브렐라 & 와이퍼 통합 메뉴판
    const menu9 = new StringSelectMenuBuilder().setCustomId('config_maneuvers').setPlaceholder('🚫 マニューバー').setMinValues(0);
    addCleanOptions(menu9, maneuvers, 'MANEUVER');

    // 🎰 Row 10: 브렐라 & 와이퍼 통합 메뉴판
    const menu10 = new StringSelectMenuBuilder().setCustomId('config_stringers').setPlaceholder('🚫 ストリンガー').setMinValues(0);
    addCleanOptions(menu10, stringers, 'STRINGER');

    // 개별 로우 팩 조립 후 최종 반환
    return {
        firstRows: [
            new ActionRowBuilder().addComponents(menu1),
            new ActionRowBuilder().addComponents(menu2),
            new ActionRowBuilder().addComponents(menu3),
            new ActionRowBuilder().addComponents(menu4),
            new ActionRowBuilder().addComponents(menu5),
        ],
        secondRows: [
            new ActionRowBuilder().addComponents(menu6),
            new ActionRowBuilder().addComponents(menu7),
            new ActionRowBuilder().addComponents(menu8),
            new ActionRowBuilder().addComponents(menu9),
            new ActionRowBuilder().addComponents(menu10),
        ],
    };
}

module.exports = { generateConfigMenuRows };

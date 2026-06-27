const { Weapon, GuildSetting } = require('../models');

/**
 * MongoDB에서 4개의 무작위 무기를 서브/스페셜 정보와 함께 추출하는 공정 (내부 전용)
 */
async function fetchRandomWeapons(guildId) {
  // 1. 이 서버의 밴(제외) 무기 풀 설정을 체크합니다.
  const setting = await GuildSetting.findOne({ guildId });

  let matchStage = {};

  // 💡 [핵심 교정] 직관적으로 바뀐 'bannedWeapons' 배열에 금지 무기가 들어있다면,
  // 그 ID들을 매칭 추첨에서 원천 배제($nin)하라는 명령 필터를 장착합니다!
  if (setting && setting.bannedWeapons && setting.bannedWeapons.length > 0) {
    matchStage = { _id: { $nin: setting.bannedWeapons } }; 
  }

  // 2. 필터링된 안전 무기 풀 안에서 4개 추출 공정 가동
  return await Weapon.aggregate([
    { $match: matchStage },   // 🚫 밴 당한 무기들을 걸러내는 1번 레일 공정
    { $sample: { size: 4 } }, // 💡 8개 대신 4개만 추출
        {
      $lookup: {
        from: 'mainweapons',
        localField: 'mainWeapon',
        foreignField: '_id',
        as: 'mainWeaponInfo'
      }
    },
    {
      $lookup: {
        from: 'subweapons',
        localField: 'subWeapon',
        foreignField: '_id',
        as: 'subWeaponInfo'
      }
    },
    {
      $lookup: {
        from: 'specialweapons',
        localField: 'specialWeapon',
        foreignField: '_id',
        as: 'specialWeaponInfo'
      }
    },
    { $unwind: { path: '$mainWeaponInfo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$subWeaponInfo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$specialWeaponInfo', preserveNullAndEmptyArrays: true } }
  ]);
}

/**
 * 4개짜리 독립된 팀 배열을 2번 뽑아 [ [4개], [4개] ] 형태로 반환합니다.
 * @returns {Promise<Array<Array>>} 2차원 배열 형태의 팀 데이터
 */
async function getDoubleMatchWeapons(guildId) {
  // 💡 각각 독립된 랜덤 뽑기를 실행하여 완벽히 격리된 팀 생성
  const alphaTeam = await fetchRandomWeapons(guildId);
  const bravoTeam = await fetchRandomWeapons(guildId);

  // 💡 4*2 형태(2차원 배열)로 묶어서 반환합니다.
  return [alphaTeam, bravoTeam];
}

module.exports = { getDoubleMatchWeapons };

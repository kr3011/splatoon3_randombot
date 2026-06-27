const { Weapon } = require('../models');

/**
 * MongoDB에서 4개의 무작위 무기를 서브/스페셜 정보와 함께 추출하는 공정 (내부 전용)
 */
async function fetchRandomWeapons() {
  return await Weapon.aggregate([
    { $sample: { size: 4 } }, // 💡 8개 대신 4개만 추출
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
    { $unwind: { path: '$subWeaponInfo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$specialWeaponInfo', preserveNullAndEmptyArrays: true } }
  ]);
}

/**
 * 4개짜리 독립된 팀 배열을 2번 뽑아 [ [4개], [4개] ] 형태로 반환합니다.
 * @returns {Promise<Array<Array>>} 2차원 배열 형태의 팀 데이터
 */
async function getDoubleMatchWeapons() {
  // 💡 각각 독립된 랜덤 뽑기를 실행하여 완벽히 격리된 팀 생성
  const alphaTeam = await fetchRandomWeapons();
  const bravoTeam = await fetchRandomWeapons();

  // 💡 4*2 형태(2차원 배열)로 묶어서 반환합니다.
  return [alphaTeam, bravoTeam];
}

module.exports = { getDoubleMatchWeapons };

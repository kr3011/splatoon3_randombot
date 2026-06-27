const axios = require('axios');
const Weapon = require('../models/Weapon'); // 본인의 무기 스키마 경로 확인

/**
 * stat.ink API에서 스플래툰 3 최신 무기 데이터를 긁어와 MongoDB를 갱신합니다.
 * @returns {Promise<number>} 저장된 총 무기 개수
 */
async function syncSplatoonWeapons() {
  // 1. 외부 오픈 API 데이터 호출
  const response = await axios.get('https://stat.ink'); 
  const externalWeapons = response.data;

  if (!Array.isArray(externalWeapons)) {
    throw new Error('올바르지 않은 데이터 형식입니다.');
  }

  // 2. 내 MongoDB 스키마 형식에 맞게 데이터 가공 (한국어 우선 적용)
  const weaponListToSave = externalWeapons.map(w => ({
    name: w.name?.ko_KR || w.name?.en_US || '이름 없음', 
    category: w.type?.name?.ko_KR || w.type?.name?.en_US || '분류 없음',
    subWeapon: w.sub?.name?.ko_KR || '없음',
    specialWeapon: w.special?.name?.ko_KR || '없음',
    levelRequired: w.res_level || 1
  }));

  // 3. 기존 데이터베이스 데이터 싹 비우기 (중복 방지 원자적 처리 가능)
  await Weapon.deleteMany({});

  // 4. 새로운 최신 데이터 통째로 밀어 넣기
  await Weapon.insertMany(weaponListToSave);

  return weaponListToSave.length;
}

module.exports = { syncSplatoonWeapons };

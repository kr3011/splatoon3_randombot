const axios = require('axios');
const Weapon = require('../models/Weapon'); // 본인의 무기 스키마 경로 확인
const MainWeapon = require('../models/MainWeapon');
const SubWeapon = require('../models/SubWeapon');
const SpecialWeapon = require('../models/SpecialWeapon');

/**
 * stat.ink API에서 스플래툰 3 최신 무기 데이터를 긁어와 MongoDB를 갱신합니다.
 * @returns {Promise<number>} 저장된 총 무기 개수
 */
async function syncSplatoonWeapons() {
  // 1. 외부 오픈 API 데이터 호출
  const response = await axios.get('https://stat.ink/api/v3/weapon?full=1', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // 브라우저인 척 위장
      }
  });
  const externalWeapons = response.data;
  console.log(response.data[0]);

  if (!Array.isArray(externalWeapons)) {
    throw new Error('올바르지 않은 데이터 형식입니다.', typeof externalWeapons);
  }

    // 💡 [핵심 가공 로직] 중복 저장을 막기 위한 임시 맵(Map) 선언
  const mainMap = new Map();
  const subMap = new Map();
  const specialMap = new Map();

  // 2. 먼저 원본 데이터를 돌면서 '서브웨폰'과 '스페셜웨폰'만 고유하게 추출하여 저장합니다.
  for (const w of externalWeapons) {
    if (w.key) {
      if (!mainMap.has(w.key)) {
        // DB에 먼저 임시 생성하여 고유 ID(_id)를 발급받습니다.
        const newMain = new MainWeapon({
          name_ja: w.name?.ja_JP || 'none',
          name_kr: w.name?.ko_KR || '이름 없음',
        });
        await newMain.save();
        mainMap.set(w.key, newMain._id); // 외래키로 쓸 ID 보관 [1]
      }
    }

    // 서브웨폰 원본 데이터(w.sub) 가공 및 맵에 등록
    if (w.sub && w.sub.key) {
      if (!subMap.has(w.sub.key)) {
        // DB에 먼저 임시 생성하여 고유 ID(_id)를 발급받습니다.
        const newSub = new SubWeapon({
          name_ja: w.sub.name?.ja_JP || 'none',
          name_kr: w.sub.name?.ko_KR || '이름 없음',
        });
        await newSub.save();
        subMap.set(w.sub.key, newSub._id); // 외래키로 쓸 ID 보관 [1]
      }
    }

    // 스페셜웨폰 원본 데이터(w.special) 가공 및 맵에 등록
    if (w.special && w.special.key) {
      if (!specialMap.has(w.special.key)) {
        // DB에 먼저 임시 생성하여 고유 ID(_id)를 발급받습니다.
        const newSpecial = new SpecialWeapon({ 
          name_ja: w.special.name?.ja_JP || 'none',
          name_kr: w.special.name?.ko_KR || '이름 없음',
        });
        await newSpecial.save();
        specialMap.set(w.special.key, newSpecial._id); // 외래키로 쓸 ID 보관 [1]
      }
    }
  }

  // 2. 내 MongoDB 스키마 형식에 맞게 데이터 가공
  const weaponListToSave = externalWeapons.map(w => {
    const key = w.key || 'none';
    const category = w.type?.key || 'none';
    const matching_range = Number(w.matching_range) || null;

    // 💡 원본 문자열 대신, 위에서 저장했던 서브/스페셜의 ObjectId(외래키)를 주입합니다! [1]
    const mainWeaponId = w.key ? mainMap.get(w.key) : null;
    const subWeaponId = w.sub ? subMap.get(w.sub.key) : null;
    const specialWeaponId = w.special ? specialMap.get(w.special.key) : null;

    return {
      key,
      category,
      matching_range,
      mainWeapon: mainWeaponId,
      subWeapon: subWeaponId,     // 외래키 연결 [1]
      specialWeapon: specialWeaponId // 외래키 연결 [1]
    };
  });

  // 3. 기존 데이터베이스 데이터 싹 비우기 (중복 방지 원자적 처리 가능)
  await Weapon.deleteMany({});

  // 4. 새로운 최신 데이터 통째로 밀어 넣기
  await Weapon.insertMany(weaponListToSave);

  return weaponListToSave.length;
}

module.exports = { syncSplatoonWeapons };
